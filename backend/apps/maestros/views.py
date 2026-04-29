import json
from urllib import parse, request as urlrequest

from django.conf import settings
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
    """DELETE → marca la tarifa como inactiva (soft delete)."""
    queryset           = Tarifa.objects.all()
    serializer_class   = TarifaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        tarifa = self.get_object()
        if tarifa.viajes.exists():
            return Response(
                {'detail': 'No se puede eliminar: hay viajes que usan esta tarifa.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        tarifa.activo = False
        tarifa.save(update_fields=['activo'])
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

