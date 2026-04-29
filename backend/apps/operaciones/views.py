from decimal import Decimal
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import (
    Viaje, ViajeAdicional, Gasto,
    Preliquidacion, PreliquidacionDetalle,
    Liquidacion, LiquidacionDetalle,
)
from .serializers import (
    ViajeSerializer, ViajeWriteSerializer,
    GastoSerializer,
    PreliquidacionSerializer, LiquidacionSerializer,
)

IVA = Decimal('1.21')


# ── Paginación ─────────────────────────────────────────────────────────────────

class ViajePagination(PageNumberPagination):
    page_size            = 20
    page_size_query_param = 'page_size'
    max_page_size        = 100


# ── Gastos ─────────────────────────────────────────────────────────────────────

class GastoListCreateView(generics.ListCreateAPIView):
    serializer_class   = GastoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Gasto.objects.select_related('proveedor')
        proveedor = self.request.query_params.get('proveedor')
        if proveedor:
            qs = qs.filter(proveedor_id=proveedor)
        if self.request.query_params.get('sin_preliquidar') == 'true':
            qs = qs.filter(preliquidacion__isnull=True)
        return qs


class GastoDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = GastoSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset           = Gasto.objects.select_related('proveedor')


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
        if params.get('estado'):
            qs = qs.filter(estado=params['estado'])
        if params.get('chofer'):
            qs = qs.filter(proveedor__chofer__icontains=params['chofer'])
        if params.get('sin_preliquidar') == 'true':
            qs = qs.filter(preliquidacion__isnull=True)
        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        # Paginación solo cuando no se usan filtros de selección masiva
        if request.query_params.get('sin_preliquidar') == 'true':
            serializer = self.get_serializer(qs, many=True)
            return Response(serializer.data)
        paginator = ViajePagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = self.get_serializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


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


def _calcular_totales_preliq(viajes, gastos_qs):
    """Recalcula totales de una preliquidación a partir de querysets."""
    total_sin_iva = Decimal('0')
    for v in viajes:
        precio = v.precio_tarifa()
        adicionales = sum(a.precio_snapshot for a in v.adicionales.all())
        total_sin_iva += precio + adicionales
    total_con_iva  = (total_sin_iva * IVA).quantize(Decimal('0.01'))
    gastos_periodo = Decimal(str(sum(g.total_gasto for g in gastos_qs))).quantize(Decimal('0.01'))
    adeudado_final = (total_con_iva - gastos_periodo).quantize(Decimal('0.01'))
    return total_sin_iva, total_con_iva, gastos_periodo, adeudado_final


def _recalcular_preliq(preliq):
    """Recalcula y guarda los totales de una preliquidación desde sus detalles y gastos."""
    viajes  = [d.viaje for d in preliq.detalles.select_related('viaje__tarifa', 'viaje__proveedor').prefetch_related('viaje__adicionales').all()]
    gastos  = preliq.gastos.all()
    total_sin_iva, total_con_iva, gastos_periodo, adeudado_final = _calcular_totales_preliq(viajes, gastos)
    preliq.total_sin_iva  = total_sin_iva
    preliq.total_con_iva  = total_con_iva
    preliq.gastos_periodo = gastos_periodo
    preliq.adeudado_final = adeudado_final
    preliq.save(update_fields=['total_sin_iva', 'total_con_iva', 'gastos_periodo', 'adeudado_final'])


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
    POST — crea una preliquidación con los viajes y gastos seleccionados.

    Body: {
        proveedor:      int,
        periodo_desde:  'YYYY-MM-DD',
        periodo_hasta:  'YYYY-MM-DD',
        viaje_ids:      [int, ...],   # IDs de viajes habilitados a incluir
        gasto_ids:      [int, ...]    # IDs de gastos a incluir (opcional)
    }

    Solo acepta viajes con estado='habilitado' y sin preliquidación asignada.
    Solo acepta gastos sin preliquidación asignada.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        proveedor_id  = request.data.get('proveedor')
        periodo_desde = request.data.get('periodo_desde')
        periodo_hasta = request.data.get('periodo_hasta')
        viaje_ids     = request.data.get('viaje_ids', [])
        gasto_ids     = request.data.get('gasto_ids', [])

        if not proveedor_id or not periodo_desde or not periodo_hasta:
            return Response({'detail': 'Requeridos: proveedor, periodo_desde, periodo_hasta.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not viaje_ids:
            return Response({'detail': 'Debés seleccionar al menos un viaje.'},
                            status=status.HTTP_400_BAD_REQUEST)

        viajes = list(
            Viaje.objects.filter(
                pk__in=viaje_ids,
                proveedor_id=proveedor_id,
                estado='habilitado',
                preliquidacion__isnull=True,
            ).select_related('tarifa', 'proveedor', 'salida', 'cliente')
            .prefetch_related('adicionales')
        )

        if len(viajes) != len(viaje_ids):
            return Response(
                {'detail': 'Algunos viajes no son válidos (no habilitados, ya preliquidados o de otro proveedor).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        gastos = list(
            Gasto.objects.filter(
                pk__in=gasto_ids,
                proveedor_id=proveedor_id,
                preliquidacion__isnull=True,
            )
        ) if gasto_ids else []

        total_sin_iva, total_con_iva, gastos_periodo, adeudado_final = _calcular_totales_preliq(viajes, gastos)

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
            estado=Preliquidacion.Estado.PENDIENTE,
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
            viaje.estado = 'preliquidado'
            viaje.save(update_fields=['preliquidacion', 'estado'])

        for gasto in gastos:
            gasto.preliquidacion = preliq
            gasto.save(update_fields=['preliquidacion'])

        return Response(PreliquidacionSerializer(preliq).data, status=status.HTTP_201_CREATED)


class PreliquidacionAgregarViajeView(APIView):
    """
    POST /preliquidaciones/<pk>/viajes/
    Body: { viaje_id: int }
    Solo si preliquidación está en estado 'pendiente'.
    Si el viaje ya tenía un detalle previo (snapshots incorrectos) se elimina y regenera.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        preliq = self._get_preliq_pendiente(pk)
        if isinstance(preliq, Response):
            return preliq

        viaje_id = request.data.get('viaje_id')
        try:
            viaje = Viaje.objects.select_related(
                'tarifa', 'proveedor', 'salida', 'cliente'
            ).prefetch_related('adicionales').get(
                pk=viaje_id,
                proveedor=preliq.proveedor,
                estado__in=['habilitado', 'preliquidado'],
            )
        except Viaje.DoesNotExist:
            return Response({'detail': 'Viaje no válido para este proveedor.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Si ya existe detalle para ese viaje → eliminarlo y regenerar (corrección de snapshot)
        PreliquidacionDetalle.objects.filter(preliquidacion=preliq, viaje=viaje).delete()

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
        viaje.estado = 'preliquidado'
        viaje.save(update_fields=['preliquidacion', 'estado'])

        _recalcular_preliq(preliq)
        return Response(PreliquidacionSerializer(preliq).data)

    def _get_preliq_pendiente(self, pk):
        try:
            preliq = Preliquidacion.objects.prefetch_related(
                'detalles__viaje__tarifa', 'detalles__viaje__proveedor',
                'detalles__viaje__adicionales', 'gastos',
            ).get(pk=pk)
        except Preliquidacion.DoesNotExist:
            return Response({'detail': 'Preliquidación no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if preliq.estado != Preliquidacion.Estado.PENDIENTE:
            return Response({'detail': 'Solo se puede modificar una preliquidación en estado pendiente.'},
                            status=status.HTTP_400_BAD_REQUEST)
        return preliq


class PreliquidacionQuitarViajeView(APIView):
    """
    DELETE /preliquidaciones/<pk>/viajes/<viaje_pk>/
    Solo si preliquidación está en estado 'pendiente'.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def delete(self, request, pk, viaje_pk):
        try:
            preliq = Preliquidacion.objects.prefetch_related(
                'detalles__viaje__tarifa', 'detalles__viaje__proveedor',
                'detalles__viaje__adicionales', 'gastos',
            ).get(pk=pk)
        except Preliquidacion.DoesNotExist:
            return Response({'detail': 'Preliquidación no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if preliq.estado != Preliquidacion.Estado.PENDIENTE:
            return Response({'detail': 'Solo se puede modificar una preliquidación en estado pendiente.'},
                            status=status.HTTP_400_BAD_REQUEST)

        detalle = PreliquidacionDetalle.objects.filter(preliquidacion=preliq, viaje_id=viaje_pk).first()
        if not detalle:
            return Response({'detail': 'El viaje no está en esta preliquidación.'}, status=status.HTTP_404_NOT_FOUND)

        viaje = detalle.viaje
        detalle.delete()
        viaje.preliquidacion = None
        viaje.estado = 'habilitado'
        viaje.save(update_fields=['preliquidacion', 'estado'])

        _recalcular_preliq(preliq)
        return Response(PreliquidacionSerializer(preliq).data)


class PreliquidacionAgregarGastoView(APIView):
    """
    POST /preliquidaciones/<pk>/gastos/
    Body: { gasto_id: int }
    Solo si preliquidación está en estado 'pendiente'.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        try:
            preliq = Preliquidacion.objects.prefetch_related(
                'detalles__viaje__tarifa', 'detalles__viaje__proveedor',
                'detalles__viaje__adicionales', 'gastos',
            ).get(pk=pk)
        except Preliquidacion.DoesNotExist:
            return Response({'detail': 'Preliquidación no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if preliq.estado != Preliquidacion.Estado.PENDIENTE:
            return Response({'detail': 'Solo se puede modificar una preliquidación en estado pendiente.'},
                            status=status.HTTP_400_BAD_REQUEST)

        gasto_id = request.data.get('gasto_id')
        try:
            gasto = Gasto.objects.get(pk=gasto_id, proveedor=preliq.proveedor, preliquidacion__isnull=True)
        except Gasto.DoesNotExist:
            return Response({'detail': 'Gasto no válido (ya asignado a otra preliquidación o de otro proveedor).'},
                            status=status.HTTP_400_BAD_REQUEST)

        gasto.preliquidacion = preliq
        gasto.save(update_fields=['preliquidacion'])

        _recalcular_preliq(preliq)
        return Response(PreliquidacionSerializer(preliq).data)


class PreliquidacionQuitarGastoView(APIView):
    """
    DELETE /preliquidaciones/<pk>/gastos/<gasto_pk>/
    Solo si preliquidación está en estado 'pendiente'.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def delete(self, request, pk, gasto_pk):
        try:
            preliq = Preliquidacion.objects.prefetch_related(
                'detalles__viaje__tarifa', 'detalles__viaje__proveedor',
                'detalles__viaje__adicionales', 'gastos',
            ).get(pk=pk)
        except Preliquidacion.DoesNotExist:
            return Response({'detail': 'Preliquidación no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if preliq.estado != Preliquidacion.Estado.PENDIENTE:
            return Response({'detail': 'Solo se puede modificar una preliquidación en estado pendiente.'},
                            status=status.HTTP_400_BAD_REQUEST)

        gasto = Gasto.objects.filter(pk=gasto_pk, preliquidacion=preliq).first()
        if not gasto:
            return Response({'detail': 'El gasto no está en esta preliquidación.'}, status=status.HTTP_404_NOT_FOUND)

        gasto.preliquidacion = None
        gasto.save(update_fields=['preliquidacion'])

        _recalcular_preliq(preliq)
        return Response(PreliquidacionSerializer(preliq).data)


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

