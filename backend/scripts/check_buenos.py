import os, sys, django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.operaciones.models import Viaje, PreliquidacionDetalle

# Ver si los viajes "buenos" 43 y 45 ya estan en preliq 6
for vid in [43, 45]:
    en_preliq = PreliquidacionDetalle.objects.filter(viaje_id=vid, preliquidacion_id=6).exists()
    v = Viaje.objects.get(pk=vid)
    print(f"Viaje {vid}: remito={v.remito} fecha={v.fecha} estado={v.estado} ya_en_preliq6={en_preliq}")
