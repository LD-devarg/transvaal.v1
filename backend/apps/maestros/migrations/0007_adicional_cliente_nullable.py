from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('maestros', '0006_adicional_tipo'),
    ]

    operations = [
        # 1. Hacer cliente nullable
        migrations.AlterField(
            model_name='adicional',
            name='cliente',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='adicionales',
                to='maestros.cliente',
            ),
        ),
        # 2. Reemplazar constraint para excluir nulos
        migrations.RemoveConstraint(
            model_name='adicional',
            name='unique_adicional_activo_por_nombre_cliente',
        ),
        migrations.AddConstraint(
            model_name='adicional',
            constraint=models.UniqueConstraint(
                fields=['nombre', 'cliente'],
                condition=models.Q(activo=True) & models.Q(cliente__isnull=False),
                name='unique_adicional_activo_por_nombre_cliente',
            ),
        ),
    ]
