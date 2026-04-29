import os, sys, django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.operaciones.models import Viaje
from django.db.models import Count

dups = (Viaje.objects
    .exclude(remito__isnull=True).exclude(remito='')
    .values('remito', 'fecha', 'proveedor__nombre')
    .annotate(n=Count('id'))
    .filter(n__gt=1))

for d in dups:
    viajes = Viaje.objects.filter(
        remito=d['remito'], fecha=d['fecha'],
        proveedor__nombre=d['proveedor__nombre']
    ).values('id', 'estado', 'preliquidacion_id', 'liquidacion_id')
    print(f"remito={d['remito']}  fecha={d['fecha']}  proveedor={d['proveedor__nombre']}")
    for v in viajes:
        print(f"  id={v['id']}  estado={v['estado']}  preliq={v['preliquidacion_id']}  liq={v['liquidacion_id']}")
