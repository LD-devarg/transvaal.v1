from django.contrib import admin
from .models import (
    Viaje, ViajeAdicional,
    Preliquidacion, PreliquidacionDetalle,
    Liquidacion, LiquidacionDetalle,
)


class ViajeAdicionalInline(admin.TabularInline):
    model  = ViajeAdicional
    extra  = 0
    fields = ('adicional', 'nombre_snapshot', 'precio_snapshot')
    readonly_fields = ('nombre_snapshot', 'precio_snapshot')


@admin.register(Viaje)
class ViajeAdmin(admin.ModelAdmin):
    list_display  = ('fecha', 'salida', 'cliente', 'proveedor', 'remito', 'preliquidacion', 'liquidacion')
    list_filter   = ('fecha', 'cliente', 'proveedor')
    search_fields = ('remito', 'proveedor__nombre', 'cliente__nombre')
    raw_id_fields = ('tarifa',)
    inlines       = [ViajeAdicionalInline]


class PreliquidacionDetalleInline(admin.TabularInline):
    model  = PreliquidacionDetalle
    extra  = 0
    fields = ('viaje', 'fecha_viaje', 'salida_snapshot', 'cliente_snapshot',
              'tarifa_sin_iva', 'tarifa_con_iva', 'adeudado_parcial')
    readonly_fields = fields


@admin.register(Preliquidacion)
class PreliquidacionAdmin(admin.ModelAdmin):
    list_display  = ('proveedor', 'fecha', 'periodo_desde', 'periodo_hasta', 'estado', 'adeudado_final')
    list_filter   = ('estado', 'proveedor')
    search_fields = ('proveedor__nombre',)
    inlines       = [PreliquidacionDetalleInline]


class LiquidacionDetalleInline(admin.TabularInline):
    model  = LiquidacionDetalle
    extra  = 0
    fields = ('viaje', 'fecha_viaje', 'salida_snapshot', 'cliente_snapshot',
              'tarifa_sin_iva', 'tarifa_con_iva', 'adeudado_parcial')
    readonly_fields = fields


@admin.register(Liquidacion)
class LiquidacionAdmin(admin.ModelAdmin):
    list_display  = ('proveedor', 'fecha', 'periodo_desde', 'periodo_hasta', 'estado_pago', 'adeudado_final', 'factura')
    list_filter   = ('estado_pago', 'proveedor')
    search_fields = ('proveedor__nombre', 'factura')
    inlines       = [LiquidacionDetalleInline]

