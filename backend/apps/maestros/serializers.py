from rest_framework import serializers
from .models import Cliente, Proveedor, Salida, Tarifa, Adicional


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Cliente
        fields = ('id', 'nombre', 'cuit', 'email')


class ProveedorSerializer(serializers.ModelSerializer):
    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)

    class Meta:
        model  = Proveedor
        fields = ('id', 'nombre', 'chofer', 'email', 'categoria', 'categoria_display', 'datos_transporte')


class SalidaSerializer(serializers.ModelSerializer):
    descripcion = serializers.CharField(read_only=True)

    class Meta:
        model  = Salida
        fields = ('id', 'ida', 'vuelta', 'descripcion')


class TarifaSerializer(serializers.ModelSerializer):
    salida_descripcion  = serializers.CharField(source='salida.descripcion', read_only=True)
    cliente_nombre      = serializers.CharField(source='cliente.nombre', read_only=True)

    class Meta:
        model  = Tarifa
        fields = (
            'id', 'salida', 'salida_descripcion', 'cliente', 'cliente_nombre',
            'precio_cat_3ero_sin_semi', 'precio_cat_1', 'precio_cat_2', 'precio_cat_3',
            'vigente_desde', 'vigente_hasta', 'activo', 'version',
        )
        read_only_fields = ('version', 'activo', 'vigente_hasta')


class TarifaActualizarSerializer(serializers.Serializer):
    """Usado para crear una nueva versión de tarifa cerrando la anterior."""
    precio_cat_3ero_sin_semi = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    precio_cat_1             = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    precio_cat_2             = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    precio_cat_3             = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    vigente_desde            = serializers.DateField()
    salida                   = serializers.PrimaryKeyRelatedField(queryset=Salida.objects.all())
    cliente                  = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())

    def create(self, validated_data):
        salida        = validated_data.pop('salida')
        cliente       = validated_data.pop('cliente')
        fecha_desde   = validated_data.pop('vigente_desde')
        nuevos_precios = validated_data
        return Tarifa.actualizar(salida, cliente, nuevos_precios, fecha_desde)


class AdicionalSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)

    class Meta:
        model  = Adicional
        fields = (
            'id', 'nombre', 'cliente', 'cliente_nombre',
            'precio_cat_3ero_sin_semi', 'precio_cat_1', 'precio_cat_2', 'precio_cat_3',
            'vigente_desde', 'vigente_hasta', 'activo', 'version',
        )
        read_only_fields = ('version', 'activo', 'vigente_hasta')
