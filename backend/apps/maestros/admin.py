from django.contrib import admin
from .models import Cliente, Proveedor, Salida, Tarifa, Adicional


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display  = ('nombre', 'cuit', 'email')
    search_fields = ('nombre', 'cuit')


@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display  = ('nombre', 'chofer', 'categoria', 'email', 'telefono', 'telegram_activo')
    list_filter   = ('categoria',)
    search_fields = ('nombre', 'chofer', 'telefono', 'telegram_chat_id')


@admin.register(Salida)
class SalidaAdmin(admin.ModelAdmin):
    list_display  = ('descripcion', 'ida', 'vuelta')
    search_fields = ('ida', 'vuelta')


class TarifaInline(admin.TabularInline):
    model  = Tarifa
    extra  = 0
    fields = ('cliente', 'precio_cat_3ero_sin_semi', 'precio_cat_1', 'precio_cat_2',
              'precio_cat_3', 'vigente_desde', 'vigente_hasta', 'activo', 'version')
    readonly_fields = ('version',)


@admin.register(Tarifa)
class TarifaAdmin(admin.ModelAdmin):
    list_display  = ('salida', 'cliente', 'version', 'vigente_desde', 'vigente_hasta', 'activo')
    list_filter   = ('activo', 'cliente')
    search_fields = ('salida__ida', 'salida__vuelta', 'cliente__nombre')
    readonly_fields = ('version',)


@admin.register(Adicional)
class AdicionalAdmin(admin.ModelAdmin):
    list_display  = ('nombre', 'cliente', 'version', 'vigente_desde', 'vigente_hasta', 'activo')
    list_filter   = ('activo', 'cliente')
    search_fields = ('nombre', 'cliente__nombre')
    readonly_fields = ('version',)

