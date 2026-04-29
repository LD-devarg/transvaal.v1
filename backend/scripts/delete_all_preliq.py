import os, sys, django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.operaciones.models import Preliquidacion, Viaje

# 1. Borrar todas las preliquidaciones (cascade -> PreliquidacionDetalle)
count, _ = Preliquidacion.objects.all().delete()
print(f"Preliquidaciones eliminadas: {count}")

# 2. Resetear viajes con estado 'preliquidado' (ya sin preliquidacion FK) a 'habilitado'
updated = Viaje.objects.filter(estado='preliquidado').update(estado='habilitado')
print(f"Viajes reseteados a 'habilitado': {updated}")
