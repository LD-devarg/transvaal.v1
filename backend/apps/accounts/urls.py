from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import MeView, UserListCreateView, UserDetailView

urlpatterns = [
    # Auth JWT
    path('token/',         TokenObtainPairView.as_view(),  name='token_obtain'),
    path('token/refresh/', TokenRefreshView.as_view(),     name='token_refresh'),
    # Perfil propio
    path('me/',            MeView.as_view(),                name='me'),
    # Gestión de usuarios (admin)
    path('users/',         UserListCreateView.as_view(),    name='user_list'),
    path('users/<int:pk>/', UserDetailView.as_view(),       name='user_detail'),
]
