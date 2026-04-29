import os, sys, django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.operaciones.models import Viaje

# IDs duplicados a eliminar (se conserva el de menor ID en cada grupo)
to_delete = [91, 92, 59, 62, 89, 63, 65, 84, 61, 66]

deleted, _ = Viaje.objects.filter(id__in=to_delete).delete()
print(f"Eliminados {deleted} viajes duplicados: {to_delete}")
