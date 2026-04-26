from django.urls import path
from .views import (
    ViajeListCreateView, ViajeDetailView,
    PreliquidacionListCreateView, PreliquidacionDetailView, GenerarPreliquidacionView,
    LiquidacionListCreateView, LiquidacionDetailView, GenerarLiquidacionView,
)

urlpatterns = [
    # Viajes
    path('viajes/',          ViajeListCreateView.as_view(), name='viaje_list'),
    path('viajes/<int:pk>/', ViajeDetailView.as_view(),     name='viaje_detail'),

    # Preliquidaciones
    path('preliquidaciones/',          PreliquidacionListCreateView.as_view(), name='preliquidacion_list'),
    path('preliquidaciones/<int:pk>/', PreliquidacionDetailView.as_view(),     name='preliquidacion_detail'),
    path('preliquidaciones/generar/',  GenerarPreliquidacionView.as_view(),    name='preliquidacion_generar'),

    # Liquidaciones
    path('liquidaciones/',          LiquidacionListCreateView.as_view(), name='liquidacion_list'),
    path('liquidaciones/<int:pk>/', LiquidacionDetailView.as_view(),     name='liquidacion_detail'),
    path('liquidaciones/generar/',  GenerarLiquidacionView.as_view(),    name='liquidacion_generar'),
]

