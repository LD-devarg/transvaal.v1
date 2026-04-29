from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('operaciones', '0008_gasto_preliquidacion_alter_preliquidacion_estado'),
    ]

    operations = [
        migrations.AddField(
            model_name='viajeadicional',
            name='descripcion_snapshot',
            field=models.CharField(blank=True, max_length=200, default=''),
            preserve_default=False,
        ),
    ]
