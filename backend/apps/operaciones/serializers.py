from rest_framework import serializers
from .models import (
    Viaje, ViajeAdicional,
    Preliquidacion, PreliquidacionDetalle,
    Liquidacion, LiquidacionDetalle,
)


# ── Viaje ──────────────────────────────────────────────────────────────────────

class ViajeAdicionalSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ViajeAdicional
        fields = ('id', 'adicional', 'nombre_snapshot', 'precio_snapshot')
        read_only_fields = ('nombre_snapshot', 'precio_snapshot')


class ViajeSerializer(serializers.ModelSerializer):
    adicionales      = ViajeAdicionalSerializer(many=True, read_only=True)
    salida_descripcion  = serializers.CharField(source='salida.descripcion', read_only=True)
    cliente_nombre      = serializers.CharField(source='cliente.nombre', read_only=True)
    proveedor_nombre    = serializers.CharField(source='proveedor.nombre', read_only=True)
    precio_tarifa       = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model  = Viaje
        fields = (
            'id', 'fecha', 'salida', 'salida_descripcion',
            'cliente', 'cliente_nombre',
            'proveedor', 'proveedor_nombre',
            'tarifa', 'precio_tarifa',
            'remito', 'adicionales',
            'preliquidacion', 'liquidacion',
        )
        read_only_fields = ('preliquidacion', 'liquidacion')


class ViajeWriteSerializer(serializers.ModelSerializer):
    adicionales_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    class Meta:
        model  = Viaje
        fields = ('id', 'fecha', 'salida', 'cliente', 'proveedor', 'tarifa', 'remito', 'adicionales_ids')

    def create(self, validated_data):
        adicionales_ids = validated_data.pop('adicionales_ids', [])
        viaje = Viaje.objects.create(**validated_data)
        self._asignar_adicionales(viaje, adicionales_ids)
        return viaje

    def update(self, instance, validated_data):
        adicionales_ids = validated_data.pop('adicionales_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if adicionales_ids is not None:
            instance.adicionales.all().delete()
            self._asignar_adicionales(instance, adicionales_ids)
        return instance

    def _asignar_adicionales(self, viaje, ids):
        from apps.maestros.models import Adicional
        for adicional_id in ids:
            adicional = Adicional.objects.get(pk=adicional_id)
            ViajeAdicional.objects.create(viaje=viaje, adicional=adicional)


# ── Preliquidacion ─────────────────────────────────────────────────────────────

class PreliquidacionDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PreliquidacionDetalle
        fields = (
            'id', 'viaje', 'fecha_viaje', 'chofer_snapshot', 'cliente_snapshot',
            'salida_snapshot', 'remito_snapshot', 'adicionales_snapshot',
            'tarifa_sin_iva', 'tarifa_con_iva', 'adeudado_parcial',
        )
        read_only_fields = fields


class PreliquidacionSerializer(serializers.ModelSerializer):
    detalles          = PreliquidacionDetalleSerializer(many=True, read_only=True)
    proveedor_nombre  = serializers.CharField(source='proveedor.nombre', read_only=True)
    estado_display    = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model  = Preliquidacion
        fields = (
            'id', 'fecha', 'proveedor', 'proveedor_nombre',
            'periodo_desde', 'periodo_hasta',
            'gastos_periodo', 'total_sin_iva', 'total_con_iva', 'adeudado_final',
            'estado', 'estado_display', 'liquidacion', 'detalles',
        )
        read_only_fields = ('total_sin_iva', 'total_con_iva', 'adeudado_final', 'liquidacion')


# ── Liquidacion ────────────────────────────────────────────────────────────────

class LiquidacionDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = LiquidacionDetalle
        fields = (
            'id', 'viaje', 'fecha_viaje', 'chofer_snapshot', 'cliente_snapshot',
            'salida_snapshot', 'remito_snapshot', 'adicionales_snapshot',
            'tarifa_sin_iva', 'tarifa_con_iva', 'adeudado_parcial',
        )
        read_only_fields = fields


class LiquidacionSerializer(serializers.ModelSerializer):
    detalles         = LiquidacionDetalleSerializer(many=True, read_only=True)
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    estado_display   = serializers.CharField(source='get_estado_pago_display', read_only=True)

    class Meta:
        model  = Liquidacion
        fields = (
            'id', 'fecha', 'proveedor', 'proveedor_nombre',
            'periodo_desde', 'periodo_hasta',
            'gastos_periodo', 'total_sin_iva', 'total_con_iva', 'adeudado_final',
            'estado_pago', 'estado_display', 'factura', 'detalles',
        )
        read_only_fields = ('total_sin_iva', 'total_con_iva', 'adeudado_final')
