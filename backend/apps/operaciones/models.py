from django.db import models
from django.db.models import Q
from apps.maestros.models import Cliente, Proveedor, Salida, Tarifa, Adicional


ESTADO_CHOICES = (
    ('pendiente', 'Pendiente'),
    ('habilitado', 'Habilitado'),
    ('preliquidado','Preliquidado'),
    ('liquidado', 'Liquidado'),
)   

class Viaje(models.Model):
    fecha     = models.DateField()
    salida    = models.ForeignKey(Salida,   on_delete=models.PROTECT, related_name='viajes')
    cliente   = models.ForeignKey(Cliente,  on_delete=models.PROTECT, related_name='viajes')
    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name='viajes')
    tarifa    = models.ForeignKey(Tarifa,   on_delete=models.PROTECT, related_name='viajes')
    remito    = models.CharField(null=True, blank=True, max_length=20)
    estado    = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')

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
        constraints = [
            models.UniqueConstraint(
                fields=['remito', 'fecha', 'proveedor'],
                condition=Q(remito__isnull=False) & ~Q(remito=''),
                name='unique_remito_fecha_proveedor',
            )
        ]

    def __str__(self):
        return f"{self.fecha} | {self.salida} | {self.proveedor}"

    def precio_tarifa(self):
        return self.tarifa.precio_para_proveedor(self.proveedor)

    def save(self, *args, **kwargs):
        # Auto-habilitar: si se carga remito y el viaje está pendiente, pasa a habilitado.
        if self.remito and self.estado == 'pendiente':
            self.estado = 'habilitado'
        super().save(*args, **kwargs)


class ViajeAdicional(models.Model):
    """M2M entre Viaje y Adicional con snapshot de precio al momento."""
    viaje    = models.ForeignKey(Viaje,    on_delete=models.CASCADE,  related_name='adicionales')
    adicional = models.ForeignKey(Adicional, on_delete=models.PROTECT, related_name='viajes')

    # Snapshot al momento de asignar el adicional al viaje
    nombre_snapshot      = models.CharField(max_length=150)
    descripcion_snapshot = models.CharField(max_length=200, blank=True)
    precio_snapshot      = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = [('viaje', 'adicional')]

    def __str__(self):
        return f"{self.viaje} — {self.nombre_snapshot}"

    def save(self, *args, **kwargs):
        if not self.pk:
            self.nombre_snapshot = self.adicional.nombre
            # Para 'por_tarifa': tomar precio de la tabla según categoría del proveedor.
            # Para 'al_momento': precio_snapshot y descripcion_snapshot deben setearse antes de llamar save().
            if self.adicional.tipo == 'por_tarifa':
                self.precio_snapshot = self.adicional.precio_para_proveedor(self.viaje.proveedor)
        super().save(*args, **kwargs)


# ── Preliquidaciones ───────────────────────────────────────────────────────────

class Preliquidacion(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE    = 'pendiente',    'Pendiente'
        ENVIADA      = 'enviada',      'Enviada'
        PARA_REVISAR = 'para_revisar', 'Para revisar'
        CONFIRMADA   = 'confirmada',   'Confirmada'
        LIQUIDADA    = 'liquidada',    'Liquidada'

    fecha          = models.DateField()
    proveedor      = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name='preliquidaciones')
    periodo_desde  = models.DateField()
    periodo_hasta  = models.DateField()
    gastos_periodo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_sin_iva  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_con_iva  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    adeudado_final = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estado         = models.CharField(max_length=15, choices=Estado.choices, default=Estado.PENDIENTE)
    enviado_a_drive = models.BooleanField(default=False)
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
    remito_snapshot  = models.CharField(max_length=20, null=True, blank=True)
    adicionales_snapshot = models.JSONField(default=list, blank=True, null=True)

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
    remito_snapshot  = models.CharField(max_length=20, null=True, blank=True)
    adicionales_snapshot = models.JSONField(default=list, blank=True, null=True)

    tarifa_sin_iva   = models.DecimalField(max_digits=12, decimal_places=2)
    tarifa_con_iva   = models.DecimalField(max_digits=12, decimal_places=2)
    adeudado_parcial = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = [('liquidacion', 'viaje')]

    def __str__(self):
        return f"{self.liquidacion} — viaje {self.viaje_id}"


# ── Gastos ────────────────────────────────────────────────────────────────────

class Gasto(models.Model):
    """
    Gastos en los que incurre el proveedor durante el período.
    Se descuentan del total a pagar en la Liquidacion.

    combustible (JSONField): {
        'lts_comb':          float,
        'precio_lts_comb':   float,
        'precio_total_comb': float   # lts * precio_lts (sin descuento)
    }
    Al liquidar se aplica un 20% de descuento sobre precio_total_comb.

    varios (JSONField): [
        {'descripcion': str, 'monto': float},
        ...
    ]
    """

    fecha_gasto        = models.DateField()
    proveedor          = models.ForeignKey(
        Proveedor, on_delete=models.PROTECT, related_name='gastos'
    )
    varios             = models.JSONField(
        default=list, blank=True, null=True,
        help_text='Lista de {descripcion, monto}'
    )
    adelanto_otros     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    combustible        = models.JSONField(
        default=dict, blank=True, null=True,
        help_text='{lts_comb, precio_lts_comb, precio_total_comb}'
    )
    remito_combustible = models.CharField(max_length=100, blank=True, null=True)
    preliquidacion     = models.ForeignKey(
        'Preliquidacion', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='gastos'
    )
    liquidacion        = models.ForeignKey(
        'Liquidacion', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='gastos'
    )

    class Meta:
        ordering = ['-fecha_gasto']

    def __str__(self):
        return f"Gasto {self.proveedor} | {self.fecha_gasto}"

    def _precio_combustible_bruto(self):
        combustible = self.combustible or {}
        lts = combustible.get('lts_comb')
        precio_lts = combustible.get('precio_lts_comb')
        if lts not in (None, '') and precio_lts not in (None, ''):
            return round(float(lts) * float(precio_lts), 2)
        return round(float(combustible.get('precio_total_comb') or 0), 2)

    def save(self, *args, **kwargs):
        if self.combustible:
            self.combustible['precio_total_comb'] = self._precio_combustible_bruto()
        super().save(*args, **kwargs)

    @property
    def total_combustible(self):
        """Aplica 20% de descuento sobre el bruto de litros * precio por litro."""
        precio_bruto = self._precio_combustible_bruto()
        return round(float(precio_bruto) * 0.8, 2)

    @property
    def total_varios(self):
        """Suma de todos los montos en varios."""
        return round(sum(float(v.get('monto', 0)) for v in (self.varios or [])), 2)

    @property
    def total_gasto(self):
        """Total descontable: combustible (con descuento) + varios + adelanto_otros."""
        return round(
            self.total_combustible + self.total_varios + float(self.adelanto_otros),
            2
        )
