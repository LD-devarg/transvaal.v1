from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Rol(models.TextChoices):
        ADMIN        = 'admin',        'Administrador'
        OPERACIONES  = 'operaciones',  'Operaciones'
        CONTABILIDAD = 'contabilidad', 'Contabilidad'
        READONLY     = 'readonly',     'Solo lectura'

    email     = models.EmailField(unique=True)
    rol       = models.CharField(max_length=20, choices=Rol.choices, default=Rol.READONLY)
    proveedor = models.ForeignKey(
        'maestros.Proveedor',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='usuarios',
    )

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.get_full_name() or self.email} ({self.get_rol_display()})"
