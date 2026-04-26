from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    rol_display = serializers.CharField(source='get_rol_display', read_only=True)

    class Meta:
        model  = User
        fields = ('id', 'email', 'first_name', 'last_name', 'rol', 'rol_display', 'is_active')
        read_only_fields = ('id', 'email', 'is_active')


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model  = User
        fields = ('email', 'first_name', 'last_name', 'rol', 'password')

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.username = validated_data['email']
        user.set_password(password)
        user.save()
        return user
