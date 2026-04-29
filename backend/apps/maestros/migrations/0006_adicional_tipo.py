from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('maestros', '0005_proveedor_carpeta_drive_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='adicional',
            name='tipo',
            field=models.CharField(
                choices=[('por_tarifa', 'Por tarifa'), ('al_momento', 'Al momento')],
                default='por_tarifa',
                max_length=12,
            ),
        ),
    ]
