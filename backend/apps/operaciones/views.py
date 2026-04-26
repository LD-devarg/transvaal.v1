from decimal import Decimal
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import (
    Viaje, Preliquidacion, PreliquidacionDetalle,
    Liquidacion, LiquidacionDetalle,
)
from .serializers import (
    ViajeSerializer, ViajeWriteSerializer,
    PreliquidacionSerializer, LiquidacionSerializer,
)

IVA = Decimal('1.21')


# ── Viajes ─────────────────────────────────────────────────────────────────────

class ViajeListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        return ViajeWriteSerializer if self.request.method == 'POST' else ViajeSerializer

    def get_queryset(self):
        qs = Viaje.objects.select_related(
            'salida', 'cliente', 'proveedor', 'tarifa'
        ).prefetch_related('adicionales__adicional')

        params = self.request.query_params
        if params.get('proveedor'):
            qs = qs.filter(proveedor_id=params['proveedor'])
        if params.get('cliente'):
            qs = qs.filter(cliente_id=params['cliente'])
        if params.get('desde'):
            qs = qs.filter(fecha__gte=params['desde'])
        if params.get('hasta'):
            qs = qs.filter(fecha__lte=params['hasta'])
        if params.get('sin_preliquidar') == 'true':
            qs = qs.filter(preliquidacion__isnull=True)
        return qs


class ViajeDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Viaje.objects.select_related(
        'salida', 'cliente', 'proveedor', 'tarifa'
    ).prefetch_related('adicionales__adicional')

    def get_serializer_class(self):
        return ViajeWriteSerializer if self.request.method in ('PUT', 'PATCH') else ViajeSerializer


# ── Preliquidaciones ───────────────────────────────────────────────────────────

def _build_snapshot_adicionales(viaje):
    return [
        {'nombre': a.nombre_snapshot, 'precio': str(a.precio_snapshot)}
        for a in viaje.adicionales.all()
    ]


def _calcular_totales_preliq(viajes, gastos_periodo):
    total_sin_iva = Decimal('0')
    for v in viajes:
        precio = v.precio_tarifa()
        adicionales = sum(a.precio_snapshot for a in v.adicionales.all())
        total_sin_iva += precio + adicionales
    total_con_iva  = (total_sin_iva * IVA).quantize(Decimal('0.01'))
    adeudado_final = (total_con_iva - gastos_periodo).quantize(Decimal('0.01'))
    return total_sin_iva, total_con_iva, adeudado_final


class PreliquidacionListCreateView(generics.ListCreateAPIView):
    serializer_class   = PreliquidacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Preliquidacion.objects.select_related('proveedor').prefetch_related('detalles')
        if self.request.query_params.get('proveedor'):
            qs = qs.filter(proveedor_id=self.request.query_params['proveedor'])
        if self.request.query_params.get('estado'):
            qs = qs.filter(estado=self.request.query_params['estado'])
        return qs


class PreliquidacionDetailView(generics.RetrieveUpdateAPIView):
    serializer_class   = PreliquidacionSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset           = Preliquidacion.objects.prefetch_related('detalles')


class GenerarPreliquidacionView(APIView):
    """
    POST — genera una preliquidación automáticamente a partir de los viajes
    sin preliquidar de un proveedor en un período.
    Body: { proveedor, periodo_desde, periodo_hasta, gastos_periodo }
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        proveedor_id   = request.data.get('proveedor')
        periodo_desde  = request.data.get('periodo_desde')
        periodo_hasta  = request.data.get('periodo_hasta')
        gastos_periodo = Decimal(str(request.data.get('gastos_periodo', '0')))

        viajes = list(
            Viaje.objects.filter(
                proveedor_id=proveedor_id,
                fecha__gte=periodo_desde,
                fecha__lte=periodo_hasta,
                preliquidacion__isnull=True,
            ).select_related('tarifa', 'proveedor', 'salida', 'cliente')
            .prefetch_related('adicionales')
        )

        if not viajes:
            return Response({'detail': 'No hay viajes sin preliquidar en ese período.'},
                            status=status.HTTP_400_BAD_REQUEST)

        total_sin_iva, total_con_iva, adeudado_final = _calcular_totales_preliq(viajes, gastos_periodo)

        from django.utils import timezone
        preliq = Preliquidacion.objects.create(
            fecha=timezone.now().date(),
            proveedor_id=proveedor_id,
            periodo_desde=periodo_desde,
            periodo_hasta=periodo_hasta,
            gastos_periodo=gastos_periodo,
            total_sin_iva=total_sin_iva,
            total_con_iva=total_con_iva,
            adeudado_final=adeudado_final,
        )

        for viaje in viajes:
            precio_sin_iva = viaje.precio_tarifa()
            precio_con_iva = (precio_sin_iva * IVA).quantize(Decimal('0.01'))
            PreliquidacionDetalle.objects.create(
                preliquidacion=preliq,
                viaje=viaje,
                fecha_viaje=viaje.fecha,
                chofer_snapshot=viaje.proveedor.chofer,
                cliente_snapshot=viaje.cliente.nombre,
                salida_snapshot=viaje.salida.descripcion,
                remito_snapshot=viaje.remito,
                adicionales_snapshot=_build_snapshot_adicionales(viaje),
                tarifa_sin_iva=precio_sin_iva,
                tarifa_con_iva=precio_con_iva,
                adeudado_parcial=precio_con_iva,
            )
            viaje.preliquidacion = preliq
            viaje.save(update_fields=['preliquidacion'])

        return Response(PreliquidacionSerializer(preliq).data, status=status.HTTP_201_CREATED)


# ── Liquidaciones ──────────────────────────────────────────────────────────────

class LiquidacionListCreateView(generics.ListCreateAPIView):
    serializer_class   = LiquidacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Liquidacion.objects.select_related('proveedor').prefetch_related('detalles')
        if self.request.query_params.get('proveedor'):
            qs = qs.filter(proveedor_id=self.request.query_params['proveedor'])
        if self.request.query_params.get('estado_pago'):
            qs = qs.filter(estado_pago=self.request.query_params['estado_pago'])
        return qs


class LiquidacionDetailView(generics.RetrieveUpdateAPIView):
    serializer_class   = LiquidacionSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset           = Liquidacion.objects.prefetch_related('detalles')


class GenerarLiquidacionView(APIView):
    """
    POST — convierte preliquidaciones confirmadas en una liquidación.
    Body: { preliquidacion_ids: [1, 2, ...], gastos_periodo, factura }
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        preliq_ids     = request.data.get('preliquidacion_ids', [])
        gastos_periodo = Decimal(str(request.data.get('gastos_periodo', '0')))
        factura        = request.data.get('factura', '')

        preliquidaciones = Preliquidacion.objects.filter(
            pk__in=preliq_ids, estado=Preliquidacion.Estado.CONFIRMADA
        ).prefetch_related('detalles', 'detalles__viaje')

        if not preliquidaciones.exists():
            return Response({'detail': 'No hay preliquidaciones confirmadas con esos IDs.'},
                            status=status.HTTP_400_BAD_REQUEST)

        proveedor    = preliquidaciones.first().proveedor
        total_sin_iva = sum(p.total_sin_iva for p in preliquidaciones)
        total_con_iva = sum(p.total_con_iva for p in preliquidaciones)
        adeudado_final = (total_con_iva - gastos_periodo).quantize(Decimal('0.01'))

        from django.utils import timezone
        liq = Liquidacion.objects.create(
            fecha=timezone.now().date(),
            proveedor=proveedor,
            periodo_desde=preliquidaciones.order_by('periodo_desde').first().periodo_desde,
            periodo_hasta=preliquidaciones.order_by('-periodo_hasta').first().periodo_hasta,
            gastos_periodo=gastos_periodo,
            total_sin_iva=total_sin_iva,
            total_con_iva=total_con_iva,
            adeudado_final=adeudado_final,
            factura=factura,
        )

        for preliq in preliquidaciones:
            for detalle in preliq.detalles.all():
                LiquidacionDetalle.objects.create(
                    liquidacion=liq,
                    viaje=detalle.viaje,
                    fecha_viaje=detalle.fecha_viaje,
                    chofer_snapshot=detalle.chofer_snapshot,
                    cliente_snapshot=detalle.cliente_snapshot,
                    salida_snapshot=detalle.salida_snapshot,
                    remito_snapshot=detalle.remito_snapshot,
                    adicionales_snapshot=detalle.adicionales_snapshot,
                    tarifa_sin_iva=detalle.tarifa_sin_iva,
                    tarifa_con_iva=detalle.tarifa_con_iva,
                    adeudado_parcial=detalle.adeudado_parcial,
                )
                detalle.viaje.liquidacion = liq
                detalle.viaje.save(update_fields=['liquidacion'])

            preliq.estado      = Preliquidacion.Estado.LIQUIDADA
            preliq.liquidacion = liq
            preliq.save(update_fields=['estado', 'liquidacion'])

        return Response(LiquidacionSerializer(liq).data, status=status.HTTP_201_CREATED)

