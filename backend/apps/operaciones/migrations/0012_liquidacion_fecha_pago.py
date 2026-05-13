from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('operaciones', '0011_preliquidacion_enviado_a_drive'),
    ]

    operations = [
        migrations.AddField(
            model_name='liquidacion',
            name='fecha_pago',
            field=models.DateField(blank=True, null=True),
        ),
    ]
