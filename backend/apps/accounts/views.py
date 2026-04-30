from rest_framework import generics, permissions
from .models import User
from .serializers import UserSerializer, UserCreateSerializer


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and (
                request.user.rol == 'admin'
                or request.user.is_staff
                or request.user.is_superuser
            )
        )


class MeView(generics.RetrieveUpdateAPIView):
    """GET /api/auth/me/  — perfil del usuario autenticado"""
    serializer_class   = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/auth/users/  — solo admins"""
    queryset           = User.objects.all().order_by('email')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        if not (user.rol == 'admin' or user.is_staff or user.is_superuser):
            return User.objects.filter(id=self.request.user.id)
        return super().get_queryset()


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/auth/users/<id>/  — solo admins"""
    queryset           = User.objects.all()
    serializer_class   = UserSerializer
    permission_classes = [IsAdmin]
