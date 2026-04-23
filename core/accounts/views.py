from rest_framework import generics, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User

from .models import Profile, UserRole
from .serializers import ProfileSerializer, RegisterSerializer, UserManagementSerializer
from .permissions import IsAdmin


class UserViewSet(viewsets.ModelViewSet):
    """Admin-only management of all user accounts."""
    queryset = User.objects.select_related('profile').prefetch_related('roles').all()
    serializer_class = UserManagementSerializer
    permission_classes = [IsAdmin]


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/  — public endpoint to create a new user account."""
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Issue tokens immediately
        refresh = RefreshToken.for_user(user)
        roles = list(user.roles.values_list('role', flat=True))
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'email': user.email,
                'display_name': user.profile.display_name,
                'roles': roles,
            }
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/profile/ — current user's profile."""
    permission_classes = [IsAuthenticated]
    serializer_class = ProfileSerializer

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


class MeView(APIView):
    """GET /api/me/ — lightweight user info + roles (used by frontend auth context)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        roles = list(user.roles.values_list('role', flat=True))
        profile = getattr(user, 'profile', None)
        return Response({
            'id': user.id,
            'email': user.email,
            'display_name': profile.display_name if profile else user.username,
            'roles': roles,
        })
