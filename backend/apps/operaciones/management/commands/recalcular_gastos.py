from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.operaciones.models import Gasto, Liquidacion, Preliquidacion


def money(value):
    return Decimal(str(value or 0)).quantize(Decimal('0.01'))


class Command(BaseCommand):
    help = 'Normaliza combustible y recalcula gastos en preliquidaciones/liquidaciones.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Muestra cambios sin guardar.')

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options['dry_run']

        gastos_normalizados = 0
        for gasto in Gasto.objects.exclude(combustible__isnull=True).exclude(combustible={}):
            combustible = gasto.combustible or {}
            previo = combustible.get('precio_total_comb')
            nuevo = gasto._precio_combustible_bruto()
            if money(previo) != money(nuevo):
                combustible['precio_total_comb'] = nuevo
                gasto.combustible = combustible
                gastos_normalizados += 1
                if not dry_run:
                    gasto.save(update_fields=['combustible'])

        preliqs_recalculadas = 0
        for preliq in Preliquidacion.objects.prefetch_related('detalles', 'gastos'):
            total_sin_iva = sum((d.tarifa_sin_iva for d in preliq.detalles.all()), Decimal('0'))
            total_con_iva = sum((d.tarifa_con_iva for d in preliq.detalles.all()), Decimal('0'))
            gastos_periodo = sum((money(g.total_gasto) for g in preliq.gastos.all()), Decimal('0'))
            adeudado_final = money(total_con_iva) - money(gastos_periodo)

            changed = (
                money(preliq.total_sin_iva) != money(total_sin_iva)
                or money(preliq.total_con_iva) != money(total_con_iva)
                or money(preliq.gastos_periodo) != money(gastos_periodo)
                or money(preliq.adeudado_final) != money(adeudado_final)
            )
            if changed:
                preliqs_recalculadas += 1
                if not dry_run:
                    preliq.total_sin_iva = money(total_sin_iva)
                    preliq.total_con_iva = money(total_con_iva)
                    preliq.gastos_periodo = money(gastos_periodo)
                    preliq.adeudado_final = money(adeudado_final)
                    preliq.save(update_fields=['total_sin_iva', 'total_con_iva', 'gastos_periodo', 'adeudado_final'])

        liqs_recalculadas = 0
        for liq in Liquidacion.objects.prefetch_related('detalles', 'preliquidaciones'):
            total_sin_iva = sum((d.tarifa_sin_iva for d in liq.detalles.all()), Decimal('0'))
            total_con_iva = sum((d.tarifa_con_iva for d in liq.detalles.all()), Decimal('0'))
            gastos_periodo = sum((money(p.gastos_periodo) for p in liq.preliquidaciones.all()), Decimal('0'))
            adeudado_final = money(total_con_iva) - money(gastos_periodo)

            changed = (
                money(liq.total_sin_iva) != money(total_sin_iva)
                or money(liq.total_con_iva) != money(total_con_iva)
                or money(liq.gastos_periodo) != money(gastos_periodo)
                or money(liq.adeudado_final) != money(adeudado_final)
            )
            if changed:
                liqs_recalculadas += 1
                if not dry_run:
                    liq.total_sin_iva = money(total_sin_iva)
                    liq.total_con_iva = money(total_con_iva)
                    liq.gastos_periodo = money(gastos_periodo)
                    liq.adeudado_final = money(adeudado_final)
                    liq.save(update_fields=['total_sin_iva', 'total_con_iva', 'gastos_periodo', 'adeudado_final'])

        if dry_run:
            transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS(
            f'Gastos normalizados: {gastos_normalizados}. '
            f'Preliquidaciones recalculadas: {preliqs_recalculadas}. '
            f'Liquidaciones recalculadas: {liqs_recalculadas}.'
        ))
