from rest_framework import serializers
from .models import (
    Viaje, ViajeAdicional,
    Gasto,
    Preliquidacion, PreliquidacionDetalle,
    Liquidacion, LiquidacionDetalle,
)


# ── Viaje ──────────────────────────────────────────────────────────────────────

class ViajeAdicionalSerializer(serializers.ModelSerializer):
    adicional_tipo = serializers.CharField(source='adicional.tipo', read_only=True)

    class Meta:
        model  = ViajeAdicional
        fields = ('id', 'adicional', 'adicional_tipo', 'nombre_snapshot', 'descripcion_snapshot', 'precio_snapshot')
        read_only_fields = ('adicional_tipo', 'nombre_snapshot', 'descripcion_snapshot', 'precio_snapshot')


class ViajeSerializer(serializers.ModelSerializer):
    adicionales         = ViajeAdicionalSerializer(many=True, read_only=True)
    salida_descripcion  = serializers.CharField(source='salida.descripcion', read_only=True)
    cliente_nombre      = serializers.CharField(source='cliente.nombre', read_only=True)
    proveedor_nombre    = serializers.CharField(source='proveedor.nombre', read_only=True)
    precio_tarifa       = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    preliquidacion_estado = serializers.CharField(source='preliquidacion.estado', read_only=True, default=None)

    class Meta:
        model  = Viaje
        fields = (
            'id', 'fecha', 'salida', 'salida_descripcion',
            'cliente', 'cliente_nombre',
            'proveedor', 'proveedor_nombre',
            'tarifa', 'precio_tarifa',
            'remito', 'estado', 'adicionales',
            'preliquidacion', 'preliquidacion_estado', 'liquidacion',
        )
        read_only_fields = ('estado', 'preliquidacion', 'preliquidacion_estado', 'liquidacion')


class ViajeAdicionalInputSerializer(serializers.Serializer):
    adicional_id  = serializers.IntegerField()
    precio_manual = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    descripcion   = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')


class ViajeWriteSerializer(serializers.ModelSerializer):
    adicionales = ViajeAdicionalInputSerializer(many=True, write_only=True, required=False)

    class Meta:
        model  = Viaje
        fields = ('id', 'fecha', 'salida', 'cliente', 'proveedor', 'tarifa', 'remito', 'adicionales')

    def validate(self, data):
        remito    = data.get('remito') or ''
        fecha     = data.get('fecha')
        proveedor = data.get('proveedor')
        if remito and fecha and proveedor:
            qs = Viaje.objects.filter(remito=remito, fecha=fecha, proveedor=proveedor)
            # En update excluimos el propio viaje
            instance = self.instance
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'remito': f'Ya existe un viaje con el remito "{remito}" para este proveedor en esa fecha.'}
                )
        return data

    def create(self, validated_data):
        adicionales = validated_data.pop('adicionales', [])
        viaje = Viaje.objects.create(**validated_data)
        self._asignar_adicionales(viaje, adicionales)
        return viaje

    def update(self, instance, validated_data):
        adicionales = validated_data.pop('adicionales', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if adicionales is not None:
            instance.adicionales.all().delete()
            self._asignar_adicionales(instance, adicionales)
        return instance

    def _asignar_adicionales(self, viaje, adicionales_data):
        from apps.maestros.models import Adicional
        from decimal import Decimal
        for item in adicionales_data:
            adicional = Adicional.objects.get(pk=item['adicional_id'])
            if adicional.tipo == 'al_momento':
                precio = item.get('precio_manual')
                if precio is None:
                    raise serializers.ValidationError(
                        {'adicionales': f'El adicional "{adicional.nombre}" requiere un precio manual.'}
                    )
                ViajeAdicional.objects.create(
                    viaje=viaje,
                    adicional=adicional,
                    nombre_snapshot=adicional.nombre,
                    descripcion_snapshot=item.get('descripcion', ''),
                    precio_snapshot=Decimal(str(precio)),
                )
            else:
                ViajeAdicional.objects.create(viaje=viaje, adicional=adicional)


# ── Gasto ──────────────────────────────────────────────────────────────────────

class GastoSerializer(serializers.ModelSerializer):
    proveedor_nombre     = serializers.CharField(source='proveedor.nombre', read_only=True)
    total_combustible    = serializers.FloatField(read_only=True)
    total_varios         = serializers.FloatField(read_only=True)
    total_gasto          = serializers.FloatField(read_only=True)
    preliquidacion_estado = serializers.CharField(source='preliquidacion.estado', read_only=True, default=None)

    class Meta:
        model  = Gasto
        fields = (
            'id', 'fecha_gasto', 'proveedor', 'proveedor_nombre',
            'varios', 'adelanto_otros',
            'combustible', 'remito_combustible',
            'preliquidacion', 'preliquidacion_estado', 'liquidacion',
            'total_combustible', 'total_varios', 'total_gasto',
        )
        read_only_fields = ('preliquidacion', 'preliquidacion_estado', 'liquidacion')


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
    detalles             = PreliquidacionDetalleSerializer(many=True, read_only=True)
    gastos               = GastoSerializer(many=True, read_only=True)
    proveedor_nombre     = serializers.CharField(source='proveedor.nombre', read_only=True)
    carpeta_drive_id     = serializers.CharField(source='proveedor.carpeta_drive_id', read_only=True)
    estado_display       = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model  = Preliquidacion
        fields = (
            'id', 'fecha', 'proveedor', 'proveedor_nombre', 'carpeta_drive_id',
            'periodo_desde', 'periodo_hasta',
            'gastos_periodo', 'total_sin_iva', 'total_con_iva', 'adeudado_final',
            'estado', 'estado_display', 'liquidacion', 'detalles', 'gastos',
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
    detalles             = LiquidacionDetalleSerializer(many=True, read_only=True)
    gastos               = GastoSerializer(many=True, read_only=True)
    proveedor_nombre     = serializers.CharField(source='proveedor.nombre', read_only=True)
    carpeta_drive_id     = serializers.CharField(source='proveedor.carpeta_drive_id', read_only=True)
    estado_display       = serializers.CharField(source='get_estado_pago_display', read_only=True)

    class Meta:
        model  = Liquidacion
        fields = (
            'id', 'fecha', 'proveedor', 'proveedor_nombre', 'carpeta_drive_id',
            'periodo_desde', 'periodo_hasta',
            'gastos_periodo', 'total_sin_iva', 'total_con_iva', 'adeudado_final',
            'estado_pago', 'estado_display', 'factura', 'detalles', 'gastos',
        )
        read_only_fields = ('total_sin_iva', 'total_con_iva', 'adeudado_final')
