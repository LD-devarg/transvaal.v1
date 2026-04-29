from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('maestros', '0008_unique_remito_fecha_proveedor'),
    ]

    operations = [
        migrations.AddField(
            model_name='proveedor',
            name='telefono',
            field=models.CharField(blank=True, max_length=30, null=True),
        ),
        migrations.AddField(
            model_name='proveedor',
            name='telegram_chat_id',
            field=models.CharField(blank=True, max_length=80, null=True),
        ),
        migrations.AddField(
            model_name='proveedor',
            name='telegram_activo',
            field=models.BooleanField(default=False),
        ),
    ]
