from django.urls import path
from .views import (
    GastoListCreateView, GastoDetailView,
    ViajeListCreateView, ViajeDetailView,
    PreliquidacionListCreateView, PreliquidacionDetailView, GenerarPreliquidacionView,
    PreliquidacionAgregarViajeView, PreliquidacionQuitarViajeView,
    PreliquidacionAgregarGastoView, PreliquidacionQuitarGastoView,
    LiquidacionListCreateView, LiquidacionDetailView, GenerarLiquidacionView,
    MisViajesView, MisLiquidacionesView, MisPreliquidacionesView,
    ResponderPreliquidacionView,
)

urlpatterns = [
    # Gastos
    path('gastos/',          GastoListCreateView.as_view(), name='gasto_list'),
    path('gastos/<int:pk>/', GastoDetailView.as_view(),     name='gasto_detail'),

    # Viajes
    path('viajes/',          ViajeListCreateView.as_view(), name='viaje_list'),
    path('viajes/<int:pk>/', ViajeDetailView.as_view(),     name='viaje_detail'),

    # Preliquidaciones
    path('preliquidaciones/',                                    PreliquidacionListCreateView.as_view(),  name='preliquidacion_list'),
    path('preliquidaciones/generar/',                            GenerarPreliquidacionView.as_view(),     name='preliquidacion_generar'),
    path('preliquidaciones/<int:pk>/',                           PreliquidacionDetailView.as_view(),      name='preliquidacion_detail'),
    path('preliquidaciones/<int:pk>/viajes/',                    PreliquidacionAgregarViajeView.as_view(),name='preliquidacion_agregar_viaje'),
    path('preliquidaciones/<int:pk>/viajes/<int:viaje_pk>/',     PreliquidacionQuitarViajeView.as_view(), name='preliquidacion_quitar_viaje'),
    path('preliquidaciones/<int:pk>/gastos/',                    PreliquidacionAgregarGastoView.as_view(),name='preliquidacion_agregar_gasto'),
    path('preliquidaciones/<int:pk>/gastos/<int:gasto_pk>/',     PreliquidacionQuitarGastoView.as_view(), name='preliquidacion_quitar_gasto'),

    # Liquidaciones
    path('liquidaciones/',          LiquidacionListCreateView.as_view(), name='liquidacion_list'),
    path('liquidaciones/generar/',  GenerarLiquidacionView.as_view(),    name='liquidacion_generar'),
    path('liquidaciones/<int:pk>/', LiquidacionDetailView.as_view(),     name='liquidacion_detail'),

    # Empleado (readonly, filtrado por proveedor vinculado al usuario)
    path('mis-viajes/',            MisViajesView.as_view(),            name='mis_viajes'),
    path('mis-liquidaciones/',     MisLiquidacionesView.as_view(),     name='mis_liquidaciones'),
    path('mis-preliquidaciones/',          MisPreliquidacionesView.as_view(),       name='mis_preliquidaciones'),
    path('mis-preliquidaciones/<int:pk>/responder/', ResponderPreliquidacionView.as_view(), name='mis_preliquidaciones_responder'),
]

