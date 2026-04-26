from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Cliente, Proveedor, Salida, Tarifa, Adicional
from .serializers import (
    ClienteSerializer, ProveedorSerializer, SalidaSerializer,
    TarifaSerializer, TarifaActualizarSerializer, AdicionalSerializer,
)


class ClienteListCreateView(generics.ListCreateAPIView):
    queryset           = Cliente.objects.all()
    serializer_class   = ClienteSerializer
    permission_classes = [permissions.IsAuthenticated]


class ClienteDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Cliente.objects.all()
    serializer_class   = ClienteSerializer
    permission_classes = [permissions.IsAuthenticated]


class ProveedorListCreateView(generics.ListCreateAPIView):
    queryset           = Proveedor.objects.all()
    serializer_class   = ProveedorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        categoria = self.request.query_params.get('categoria')
        if categoria:
            qs = qs.filter(categoria=categoria)
        return qs


class ProveedorDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Proveedor.objects.all()
    serializer_class   = ProveedorSerializer
    permission_classes = [permissions.IsAuthenticated]


class SalidaListCreateView(generics.ListCreateAPIView):
    queryset           = Salida.objects.all()
    serializer_class   = SalidaSerializer
    permission_classes = [permissions.IsAuthenticated]


class SalidaDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Salida.objects.all()
    serializer_class   = SalidaSerializer
    permission_classes = [permissions.IsAuthenticated]


class TarifaListView(generics.ListAPIView):
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
            return Response(TarifaSerializer(tarifa).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TarifaHistorialView(generics.ListAPIView):
    """Historial de versiones de una tarifa por salida + cliente."""
    serializer_class   = TarifaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Tarifa.objects.filter(
            salida_id=self.kwargs['salida_id'],
            cliente_id=self.kwargs['cliente_id'],
        ).order_by('-version')


class AdicionalListCreateView(generics.ListCreateAPIView):
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


class AdicionalDetailView(generics.RetrieveUpdateAPIView):
    queryset           = Adicional.objects.all()
    serializer_class   = AdicionalSerializer
    permission_classes = [permissions.IsAuthenticated]

