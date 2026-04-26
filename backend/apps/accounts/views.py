from rest_framework import generics, permissions
from .models import User
from .serializers import UserSerializer, UserCreateSerializer


class MeView(generics.RetrieveUpdateAPIView):
    """GET /api/auth/me/  — perfil del usuario autenticado"""
    serializer_class   = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/auth/users/  — solo admins"""
    queryset           = User.objects.all().order_by('email')
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        if self.request.user.rol != 'admin':
            return User.objects.filter(id=self.request.user.id)
        return super().get_queryset()


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/auth/users/<id>/  — solo admins"""
    queryset           = User.objects.all()
    serializer_class   = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
