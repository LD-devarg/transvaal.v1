import json
from urllib import parse, request as urlrequest

from django.conf import settings
from django.db import transaction
from decimal import Decimal
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Cliente, Proveedor, Salida, Tarifa, Adicional
from .serializers import (
    ClienteSerializer, ProveedorSerializer, SalidaSerializer,
    TarifaSerializer, TarifaActualizarSerializer, AdicionalSerializer,
)
from .cache_utils import CachedListMixin, delete_cache_pattern


class ClienteListCreateView(CachedListMixin, generics.ListCreateAPIView):
    cache_prefix = 'maestros:clientes'
    queryset           = Cliente.objects.all()
    serializer_class   = ClienteSerializer
    permission_classes = [permissions.IsAuthenticated]


class ClienteDetailView(CachedListMixin, generics.RetrieveUpdateDestroyAPIView):
    cache_prefix = 'maestros:clientes'
    queryset           = Cliente.objects.all()
    serializer_class   = ClienteSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProveedorListCreateView(CachedListMixin, generics.ListCreateAPIView):
    cache_prefix = 'maestros:proveedores'
    queryset           = Proveedor.objects.all()
    serializer_class   = ProveedorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        categoria = self.request.query_params.get('categoria')
        if categoria:
            qs = qs.filter(categoria=categoria)
        return qs


class ProveedorDetailView(CachedListMixin, generics.RetrieveUpdateDestroyAPIView):
    cache_prefix = 'maestros:proveedores'
    queryset           = Proveedor.objects.all()
    serializer_class   = ProveedorSerializer
    permission_classes = [permissions.IsAuthenticated]


class TelegramStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = {
            'configured': bool(settings.TELEGRAM_BOT_TOKEN),
            'bot_username': settings.TELEGRAM_BOT_USERNAME,
            'api_ok': False,
            'api_username': '',
            'webhook_url': '',
            'pending_update_count': 0,
        }

        if settings.TELEGRAM_BOT_TOKEN:
            try:
                me_url = f'https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getMe'
                with urlrequest.urlopen(me_url, timeout=8) as res:
                    me = json.loads(res.read().decode('utf-8'))
                if me.get('ok'):
                    result = me.get('result', {})
                    data['api_ok'] = True
                    data['api_username'] = result.get('username', '')

                webhook_url = f'https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getWebhookInfo'
                with urlrequest.urlopen(webhook_url, timeout=8) as res:
                    webhook = json.loads(res.read().decode('utf-8'))
                if webhook.get('ok'):
                    result = webhook.get('result', {})
                    data['webhook_url'] = result.get('url', '')
                    data['pending_update_count'] = result.get('pending_update_count', 0)
            except Exception:
                pass

        return Response(data)


class TelegramTestProveedorView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        proveedor = generics.get_object_or_404(Proveedor, pk=pk)
        if not settings.TELEGRAM_BOT_TOKEN:
            return Response({'detail': 'TELEGRAM_BOT_TOKEN no esta configurado.'}, status=status.HTTP_400_BAD_REQUEST)
        if not proveedor.telegram_chat_id:
            return Response({'detail': 'El proveedor no tiene telegram_chat_id configurado.'}, status=status.HTTP_400_BAD_REQUEST)

        text = request.data.get('message') or 'Mensaje de prueba de Transvaal.'
        payload = parse.urlencode({
            'chat_id': proveedor.telegram_chat_id,
            'text': text,
        }).encode()
        url = f'https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage'

        try:
            req = urlrequest.Request(url, data=payload, method='POST')
            with urlrequest.urlopen(req, timeout=12) as res:
                data = json.loads(res.read().decode('utf-8'))
        except Exception as exc:
            return Response({'detail': f'No se pudo contactar Telegram: {exc}'}, status=status.HTTP_502_BAD_GATEWAY)

        if not data.get('ok'):
            return Response({'detail': data.get('description') or 'Telegram rechazo el mensaje.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'ok': True})


class TelegramUpdatesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not settings.TELEGRAM_BOT_TOKEN:
            return Response({'detail': 'TELEGRAM_BOT_TOKEN no esta configurado.'}, status=status.HTTP_400_BAD_REQUEST)

        url = f'https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getUpdates'
        try:
            with urlrequest.urlopen(url, timeout=12) as res:
                data = json.loads(res.read().decode('utf-8'))
        except Exception as exc:
            return Response({'detail': f'No se pudo contactar Telegram: {exc}'}, status=status.HTTP_502_BAD_GATEWAY)

        if not data.get('ok'):
            return Response({'detail': data.get('description') or 'Telegram rechazo la consulta.'}, status=status.HTTP_400_BAD_REQUEST)

        chats = []
        seen = set()
        for item in reversed(data.get('result', [])):
            message = item.get('message') or item.get('edited_message') or {}
            chat = message.get('chat') or {}
            chat_id = chat.get('id')
            if not chat_id or chat_id in seen:
                continue
            seen.add(chat_id)
            chats.append({
                'chat_id': str(chat_id),
                'first_name': chat.get('first_name', ''),
                'last_name': chat.get('last_name', ''),
                'username': chat.get('username', ''),
                'type': chat.get('type', ''),
                'last_text': message.get('text', ''),
            })

        return Response({'ok': True, 'chats': chats, 'raw_count': len(data.get('result', []))})


class SalidaListCreateView(CachedListMixin, generics.ListCreateAPIView):
    cache_prefix = 'maestros:salidas'
    serializer_class   = SalidaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Salida.objects.select_related('cliente').all()
        cliente = self.request.query_params.get('cliente')
        if cliente:
            qs = qs.filter(cliente_id=cliente)
        return qs


class SalidaDetailView(CachedListMixin, generics.RetrieveUpdateDestroyAPIView):
    cache_prefix = 'maestros:salidas'
    queryset           = Salida.objects.all()
    serializer_class   = SalidaSerializer
    permission_classes = [permissions.IsAuthenticated]


class TarifaListView(CachedListMixin, generics.ListAPIView):
    cache_prefix = 'maestros:tarifas'
    serializer_class   = TarifaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Tarifa.objects.select_related('salida', 'cliente').all()
        solo_activas = self.request.query_params.get('activo', 'true').lower()
        if solo_activas == 'true':
            qs = qs.filter(activo=True)
        cliente = self.request.query_params.get('cliente')
        salida  = self.request.query_params.get('salida')
        if cliente:
            qs = qs.filter(cliente_id=cliente)
        if salida:
            qs = qs.filter(salida_id=salida)
        return qs


class TarifaActualizarView(APIView):
    """POST → crea nueva versión cerrando la anterior."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TarifaActualizarSerializer(data=request.data)
        if serializer.is_valid():
            tarifa = serializer.save()
            delete_cache_pattern('maestros:*')
            return Response(TarifaSerializer(tarifa).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TarifaDetailView(generics.DestroyAPIView):
    """DELETE -> elimina una version y restaura la anterior si correspondia."""
    queryset           = Tarifa.objects.all()
    serializer_class   = TarifaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        with transaction.atomic():
            tarifa = self.get_object()
            if tarifa.viajes.exists():
                return Response(
                    {'detail': 'No se puede eliminar: hay viajes que usan esta version de tarifa.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            was_active = tarifa.activo
            previous = (
                Tarifa.objects
                .select_for_update()
                .filter(salida=tarifa.salida, cliente=tarifa.cliente)
                .exclude(pk=tarifa.pk)
                .order_by('-version')
                .first()
            )

            tarifa.delete()

            if was_active and previous:
                previous.activo = True
                previous.vigente_hasta = None
                previous.save(update_fields=['activo', 'vigente_hasta'])

        delete_cache_pattern('maestros:*')
        return Response(status=status.HTTP_204_NO_CONTENT)


class TarifaHistorialView(CachedListMixin, generics.ListAPIView):
    cache_prefix = 'maestros:tarifas'
    """Historial de versiones de una tarifa por salida + cliente."""
    serializer_class   = TarifaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Tarifa.objects.filter(
            salida_id=self.kwargs['salida_id'],
            cliente_id=self.kwargs['cliente_id'],
        ).order_by('-version')


class TarifaRecalcularView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        from apps.operaciones.models import Viaje, Preliquidacion, PreliquidacionDetalle

        tarifas_activas = {
            (t.salida_id, t.cliente_id): t
            for t in Tarifa.objects.select_for_update().filter(activo=True)
        }

        viajes_actualizados = 0
        viajes_sin_tarifa = 0
        viajes_bloqueados = 0
        preliq_ids = set()
        estados_editables = {Preliquidacion.Estado.PENDIENTE, Preliquidacion.Estado.PARA_REVISAR}

        viajes = (
            Viaje.objects
            .select_for_update(of=('self',))
            .select_related('salida', 'cliente', 'proveedor', 'tarifa', 'preliquidacion')
            .exclude(estado='liquidado')
        )

        for viaje in viajes:
            tarifa = tarifas_activas.get((viaje.salida_id, viaje.cliente_id))
            if not tarifa:
                viajes_sin_tarifa += 1
                continue
            if viaje.preliquidacion_id and viaje.preliquidacion.estado not in estados_editables:
                viajes_bloqueados += 1
                continue
            if viaje.tarifa_id != tarifa.id:
                viaje.tarifa = tarifa
                viaje.save(update_fields=['tarifa'])
                viajes_actualizados += 1
            if viaje.preliquidacion_id:
                preliq_ids.add(viaje.preliquidacion_id)

        detalles_actualizados = 0
        detalles = (
            PreliquidacionDetalle.objects
            .select_related('preliquidacion', 'viaje__salida', 'viaje__cliente', 'viaje__proveedor', 'viaje__tarifa')
            .prefetch_related('viaje__adicionales')
            .filter(preliquidacion_id__in=preliq_ids)
        )

        for detalle in detalles:
            viaje = detalle.viaje
            precio_sin_iva = viaje.precio_tarifa()
            precio_con_iva = (precio_sin_iva * Decimal('1.21')).quantize(Decimal('0.01'))
            detalle.fecha_viaje = viaje.fecha
            detalle.chofer_snapshot = viaje.proveedor.chofer
            detalle.cliente_snapshot = viaje.cliente.nombre
            detalle.salida_snapshot = viaje.salida.descripcion
            detalle.remito_snapshot = viaje.remito
            detalle.adicionales_snapshot = [
                {
                    'nombre': a.nombre_snapshot,
                    'descripcion': a.descripcion_snapshot,
                    'precio': str(a.precio_snapshot),
                }
                for a in viaje.adicionales.all()
            ]
            detalle.tarifa_sin_iva = precio_sin_iva
            detalle.tarifa_con_iva = precio_con_iva
            detalle.adeudado_parcial = precio_con_iva
            detalle.save()
            detalles_actualizados += 1

        preliqs_actualizadas = 0
        preliqs = (
            Preliquidacion.objects
            .select_for_update()
            .prefetch_related('detalles__viaje__tarifa', 'detalles__viaje__adicionales', 'gastos')
            .filter(id__in=preliq_ids)
        )
        for preliq in preliqs:
            total_sin_iva = Decimal('0')
            for detalle in preliq.detalles.all():
                viaje = detalle.viaje
                adicionales = sum((a.precio_snapshot for a in viaje.adicionales.all()), Decimal('0'))
                total_sin_iva += viaje.precio_tarifa() + adicionales
            total_con_iva = (total_sin_iva * Decimal('1.21')).quantize(Decimal('0.01'))
            gastos_periodo = Decimal(str(sum(g.total_gasto for g in preliq.gastos.all()))).quantize(Decimal('0.01'))
            preliq.total_sin_iva = total_sin_iva
            preliq.total_con_iva = total_con_iva
            preliq.gastos_periodo = gastos_periodo
            preliq.adeudado_final = (total_con_iva - gastos_periodo).quantize(Decimal('0.01'))
            preliq.save(update_fields=['total_sin_iva', 'total_con_iva', 'gastos_periodo', 'adeudado_final'])
            preliqs_actualizadas += 1

        return Response({
            'viajes_actualizados': viajes_actualizados,
            'viajes_sin_tarifa': viajes_sin_tarifa,
            'viajes_bloqueados': viajes_bloqueados,
            'detalles_actualizados': detalles_actualizados,
            'preliquidaciones_actualizadas': preliqs_actualizadas,
        })


class AdicionalListCreateView(CachedListMixin, generics.ListCreateAPIView):
    cache_prefix = 'maestros:adicionales'
    serializer_class   = AdicionalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Adicional.objects.select_related('cliente').all()
        solo_activos = self.request.query_params.get('activo', 'true').lower()
        if solo_activos == 'true':
            qs = qs.filter(activo=True)
        cliente = self.request.query_params.get('cliente')
        if cliente:
            qs = qs.filter(cliente_id=cliente)
        return qs


class AdicionalDetailView(CachedListMixin, generics.RetrieveUpdateAPIView):
    cache_prefix = 'maestros:adicionales'
    queryset           = Adicional.objects.all()
    serializer_class   = AdicionalSerializer
    permission_classes = [permissions.IsAuthenticated]

