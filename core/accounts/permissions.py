from rest_framework.permissions import BasePermission
from accounts.models import UserRole


class IsAdmin(BasePermission):
    """Only users with role=admin may proceed."""
    message = 'Admin access required.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return UserRole.objects.filter(user=request.user, role='admin').exists()


class IsAdminOrReadOwn(BasePermission):
    """Admins have full access; authenticated users may read their own data."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
