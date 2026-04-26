from django.urls import path
from .views import (
    ClienteListCreateView, ClienteDetailView,
    ProveedorListCreateView, ProveedorDetailView,
    SalidaListCreateView, SalidaDetailView,
    TarifaListView, TarifaActualizarView, TarifaHistorialView,
    AdicionalListCreateView, AdicionalDetailView,
)

urlpatterns = [
    # Clientes
    path('clientes/',         ClienteListCreateView.as_view(), name='cliente_list'),
    path('clientes/<int:pk>/', ClienteDetailView.as_view(),    name='cliente_detail'),

    # Proveedores
    path('proveedores/',          ProveedorListCreateView.as_view(), name='proveedor_list'),
    path('proveedores/<int:pk>/', ProveedorDetailView.as_view(),     name='proveedor_detail'),

    # Salidas
    path('salidas/',          SalidaListCreateView.as_view(), name='salida_list'),
    path('salidas/<int:pk>/', SalidaDetailView.as_view(),     name='salida_detail'),

    # Tarifas
    path('tarifas/',                                          TarifaListView.as_view(),      name='tarifa_list'),
    path('tarifas/actualizar/',                               TarifaActualizarView.as_view(), name='tarifa_actualizar'),
    path('tarifas/historial/<int:salida_id>/<int:cliente_id>/', TarifaHistorialView.as_view(), name='tarifa_historial'),

    # Adicionales
    path('adicionales/',          AdicionalListCreateView.as_view(), name='adicional_list'),
    path('adicionales/<int:pk>/', AdicionalDetailView.as_view(),     name='adicional_detail'),
]

