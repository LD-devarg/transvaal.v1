import os, sys, django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.operaciones.models import Viaje, PreliquidacionDetalle

for vid in [63, 66]:
    v = Viaje.objects.get(pk=vid)
    print(f"\nViaje {vid}: remito={v.remito} fecha={v.fecha} proveedor={v.proveedor} estado={v.estado}")
    detalles = PreliquidacionDetalle.objects.filter(viaje=v).select_related('preliquidacion')
    for d in detalles:
        p = d.preliquidacion
        print(f"  -> PreliqDetalle id={d.id}  preliq_id={p.id} estado={p.estado} proveedor={p.proveedor} periodo={p.periodo_desde}~{p.periodo_hasta}")
