from django.urls import path
from .views import (
    ClienteListCreateView, ClienteDetailView,
    ProveedorListCreateView, ProveedorDetailView,
    TelegramStatusView, TelegramTestProveedorView, TelegramUpdatesView,
    SalidaListCreateView, SalidaDetailView,
    TarifaListView, TarifaActualizarView, TarifaHistorialView, TarifaDetailView,
    AdicionalListCreateView, AdicionalDetailView,
)

urlpatterns = [
    # Clientes
    path('clientes/',         ClienteListCreateView.as_view(), name='cliente_list'),
    path('clientes/<int:pk>/', ClienteDetailView.as_view(),    name='cliente_detail'),

    # Proveedores
    path('proveedores/',          ProveedorListCreateView.as_view(), name='proveedor_list'),
    path('proveedores/<int:pk>/', ProveedorDetailView.as_view(),     name='proveedor_detail'),
    path('telegram/status/',      TelegramStatusView.as_view(),      name='telegram_status'),
    path('telegram/updates/',     TelegramUpdatesView.as_view(),     name='telegram_updates'),
    path('proveedores/<int:pk>/telegram-test/', TelegramTestProveedorView.as_view(), name='proveedor_telegram_test'),

    # Salidas
    path('salidas/',          SalidaListCreateView.as_view(), name='salida_list'),
    path('salidas/<int:pk>/', SalidaDetailView.as_view(),     name='salida_detail'),

    # Tarifas
    path('tarifas/',                                          TarifaListView.as_view(),       name='tarifa_list'),
    path('tarifas/<int:pk>/',                                 TarifaDetailView.as_view(),     name='tarifa_detail'),
    path('tarifas/actualizar/',                               TarifaActualizarView.as_view(), name='tarifa_actualizar'),
    path('tarifas/historial/<int:salida_id>/<int:cliente_id>/', TarifaHistorialView.as_view(), name='tarifa_historial'),

    # Adicionales
    path('adicionales/',          AdicionalListCreateView.as_view(), name='adicional_list'),
    path('adicionales/<int:pk>/', AdicionalDetailView.as_view(),     name='adicional_detail'),
]

