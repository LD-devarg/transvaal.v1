from django.db import models
from apps.maestros.models import Cliente, Proveedor, Salida, Tarifa, Adicional


class Viaje(models.Model):
    fecha     = models.DateField()
    salida    = models.ForeignKey(Salida,   on_delete=models.PROTECT, related_name='viajes')
    cliente   = models.ForeignKey(Cliente,  on_delete=models.PROTECT, related_name='viajes')
    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name='viajes')
    tarifa    = models.ForeignKey(Tarifa,   on_delete=models.PROTECT, related_name='viajes')
    remito    = models.PositiveIntegerField(null=True, blank=True)

    # FK inversas — se asignan al preliquidar/liquidar
    preliquidacion = models.ForeignKey(
        'Preliquidacion', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='viajes'
    )
    liquidacion = models.ForeignKey(
        'Liquidacion', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='viajes'
    )

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.fecha} | {self.salida} | {self.proveedor}"

    def precio_tarifa(self):
        return self.tarifa.precio_para_proveedor(self.proveedor)


class ViajeAdicional(models.Model):
    """M2M entre Viaje y Adicional con snapshot de precio al momento."""
    viaje    = models.ForeignKey(Viaje,    on_delete=models.CASCADE,  related_name='adicionales')
    adicional = models.ForeignKey(Adicional, on_delete=models.PROTECT, related_name='viajes')

    # Snapshot al momento de asignar el adicional al viaje
    nombre_snapshot = models.CharField(max_length=150)
    precio_snapshot = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = [('viaje', 'adicional')]

    def __str__(self):
        return f"{self.viaje} — {self.nombre_snapshot}"

    def save(self, *args, **kwargs):
        if not self.pk:
            self.nombre_snapshot = self.adicional.nombre
            self.precio_snapshot = self.adicional.precio_para_proveedor(self.viaje.proveedor)
        super().save(*args, **kwargs)


# ── Preliquidaciones ───────────────────────────────────────────────────────────

class Preliquidacion(models.Model):
    class Estado(models.TextChoices):
        BORRADOR   = 'borrador',   'Borrador'
        CONFIRMADA = 'confirmada', 'Confirmada'
        LIQUIDADA  = 'liquidada',  'Liquidada'

    fecha          = models.DateField()
    proveedor      = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name='preliquidaciones')
    periodo_desde  = models.DateField()
    periodo_hasta  = models.DateField()
    gastos_periodo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_sin_iva  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_con_iva  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    adeudado_final = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estado         = models.CharField(max_length=15, choices=Estado.choices, default=Estado.BORRADOR)
    liquidacion    = models.ForeignKey(
        'Liquidacion', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='preliquidaciones'
    )

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f"Preliq. {self.proveedor} | {self.periodo_desde} → {self.periodo_hasta}"


class PreliquidacionDetalle(models.Model):
    preliquidacion   = models.ForeignKey(Preliquidacion, on_delete=models.CASCADE, related_name='detalles')
    viaje            = models.ForeignKey(Viaje, on_delete=models.PROTECT, related_name='preliquidacion_detalles')

    # Snapshots del viaje al momento de preliquidar
    fecha_viaje      = models.DateField()
    chofer_snapshot  = models.CharField(max_length=150, blank=True)
    cliente_snapshot = models.CharField(max_length=150)
    salida_snapshot  = models.CharField(max_length=200)
    remito_snapshot  = models.PositiveIntegerField(null=True, blank=True)
    adicionales_snapshot = models.JSONField(default=list, blank=True)

    tarifa_sin_iva   = models.DecimalField(max_digits=12, decimal_places=2)
    tarifa_con_iva   = models.DecimalField(max_digits=12, decimal_places=2)
    adeudado_parcial = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = [('preliquidacion', 'viaje')]

    def __str__(self):
        return f"{self.preliquidacion} — viaje {self.viaje_id}"


# ── Liquidaciones ──────────────────────────────────────────────────────────────

class Liquidacion(models.Model):
    class EstadoPago(models.TextChoices):
        PENDIENTE       = 'pendiente',       'Pendiente'
        PAGADA_PARCIAL  = 'pagada_parcial',  'Pagada parcialmente'
        PAGADA          = 'pagada',          'Pagada'

    fecha          = models.DateField()
    proveedor      = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name='liquidaciones')
    periodo_desde  = models.DateField()
    periodo_hasta  = models.DateField()
    gastos_periodo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_sin_iva  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_con_iva  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    adeudado_final = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estado_pago    = models.CharField(max_length=20, choices=EstadoPago.choices, default=EstadoPago.PENDIENTE)
    factura        = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f"Liq. {self.proveedor} | {self.periodo_desde} → {self.periodo_hasta}"


class LiquidacionDetalle(models.Model):
    liquidacion      = models.ForeignKey(Liquidacion, on_delete=models.CASCADE, related_name='detalles')
    viaje            = models.ForeignKey(Viaje, on_delete=models.PROTECT, related_name='liquidacion_detalles')

    # Snapshots del viaje al momento de liquidar
    fecha_viaje      = models.DateField()
    chofer_snapshot  = models.CharField(max_length=150, blank=True)
    cliente_snapshot = models.CharField(max_length=150)
    salida_snapshot  = models.CharField(max_length=200)
    remito_snapshot  = models.PositiveIntegerField(null=True, blank=True)
    adicionales_snapshot = models.JSONField(default=list, blank=True)

    tarifa_sin_iva   = models.DecimalField(max_digits=12, decimal_places=2)
    tarifa_con_iva   = models.DecimalField(max_digits=12, decimal_places=2)
    adeudado_parcial = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = [('liquidacion', 'viaje')]

    def __str__(self):
        return f"{self.liquidacion} — viaje {self.viaje_id}"

