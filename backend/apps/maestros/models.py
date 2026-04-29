from django.db import models
from django.utils import timezone


class Cliente(models.Model):
    nombre = models.CharField(max_length=150)
    cuit   = models.CharField(max_length=13, unique=True, blank=True, null=True)
    email  = models.EmailField(blank=True, null=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Proveedor(models.Model):
    class Categoria(models.TextChoices):
        TERCERO_SIN_SEMI = '3ero_sin_semi', '3ero SIN SEMI'
        CAT_1            = '1',             'Categoría 1'
        CAT_2            = '2',             'Categoría 2'
        CAT_3            = '3',             'Categoría 3'

    nombre             = models.CharField(max_length=150)
    chofer             = models.CharField(max_length=150, blank=True)
    email              = models.EmailField(blank=True, null=True)
    categoria          = models.CharField(max_length=20, choices=Categoria.choices)
    datos_transporte   = models.JSONField(default=dict, blank=True, null=True)  # patente, tipo vehículo, etc.
    carpeta_drive_id   = models.CharField(max_length=100, blank=True, null=True, help_text='ID de carpeta en Google Drive')
    telefono           = models.CharField(max_length=30, blank=True, null=True)
    telegram_chat_id   = models.CharField(max_length=80, blank=True, null=True)
    telegram_activo    = models.BooleanField(default=False)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.get_categoria_display()})"


class Salida(models.Model):
    ida    = models.CharField(max_length=100)
    vuelta = models.CharField(max_length=100)
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name='salidas')

    class Meta:
        ordering        = ['ida', 'vuelta']
        unique_together = [('ida', 'vuelta', 'cliente')]

    @property
    def descripcion(self):
        return f"{self.ida} - {self.vuelta}"

    def __str__(self):
        return self.descripcion


class Tarifa(models.Model):
    PRECIO_POR_CATEGORIA = {
        '3ero_sin_semi': 'precio_cat_3ero_sin_semi',
        '1':             'precio_cat_1',
        '2':             'precio_cat_2',
        '3':             'precio_cat_3',
    }

    salida   = models.ForeignKey(Salida,  on_delete=models.PROTECT, related_name='tarifas')
    cliente  = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name='tarifas')

    precio_cat_3ero_sin_semi = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    precio_cat_1             = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    precio_cat_2             = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    precio_cat_3             = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    vigente_desde = models.DateField()
    vigente_hasta = models.DateField(null=True, blank=True)
    activo        = models.BooleanField(default=True)
    version       = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['salida', 'cliente', '-version']
        constraints = [
            models.UniqueConstraint(
                fields=['salida', 'cliente'],
                condition=models.Q(activo=True),
                name='unique_tarifa_activa_por_salida_cliente'
            )
        ]

    def precio_para_proveedor(self, proveedor):
        campo = self.PRECIO_POR_CATEGORIA[proveedor.categoria]
        return getattr(self, campo)

    def __str__(self):
        return f"{self.salida} | {self.cliente} | v{self.version}"

    @classmethod
    def actualizar(cls, salida, cliente, nuevos_precios: dict, fecha_desde):
        """
        Cierra la tarifa activa y crea una nueva versión.
        nuevos_precios = {'precio_cat_1': 730000, ...}
        """
        ultima_version = 0
        activa = cls.objects.filter(salida=salida, cliente=cliente, activo=True).first()
        if activa:
            ultima_version = activa.version
            activa.activo        = False
            activa.vigente_hasta = fecha_desde - timezone.timedelta(days=1)
            activa.save(update_fields=['activo', 'vigente_hasta'])

        return cls.objects.create(
            salida=salida,
            cliente=cliente,
            version=ultima_version + 1,
            vigente_desde=fecha_desde,
            activo=True,
            **nuevos_precios,
        )


class Adicional(models.Model):
    class Tipo(models.TextChoices):
        POR_TARIFA = 'por_tarifa', 'Por tarifa'
        AL_MOMENTO = 'al_momento', 'Al momento'

    PRECIO_POR_CATEGORIA = {
        '3ero_sin_semi': 'precio_cat_3ero_sin_semi',
        '1':             'precio_cat_1',
        '2':             'precio_cat_2',
        '3':             'precio_cat_3',
    }

    nombre  = models.CharField(max_length=150)
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name='adicionales', null=True, blank=True)
    tipo    = models.CharField(max_length=12, choices=Tipo.choices, default=Tipo.POR_TARIFA)

    precio_cat_3ero_sin_semi = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    precio_cat_1             = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    precio_cat_2             = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    precio_cat_3             = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    vigente_desde = models.DateField()
    vigente_hasta = models.DateField(null=True, blank=True)
    activo        = models.BooleanField(default=True)
    version       = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['nombre', '-version']
        constraints = [
            models.UniqueConstraint(
                fields=['nombre', 'cliente'],
                condition=models.Q(activo=True) & models.Q(cliente__isnull=False),
                name='unique_adicional_activo_por_nombre_cliente'
            )
        ]

    def precio_para_proveedor(self, proveedor):
        if self.tipo == self.Tipo.AL_MOMENTO:
            return None
        campo = self.PRECIO_POR_CATEGORIA[proveedor.categoria]
        return getattr(self, campo)

    def __str__(self):
        cliente_str = self.cliente.nombre if self.cliente_id else 'Global'
        return f"{self.nombre} | {cliente_str} | v{self.version}"

