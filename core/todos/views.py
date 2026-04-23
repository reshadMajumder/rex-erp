from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from accounts.models import UserRole
from accounts.permissions import IsAdmin
from employees.models import Employee
from .models import Todo
from .serializers import TodoSerializer


def is_admin(user):
    return UserRole.objects.filter(user=user, role='admin').exists()


class TodoViewSet(viewsets.ModelViewSet):
    """
    Admin: full CRUD on all todos.
    Employee: list/retrieve todos assigned to them or on assigned projects.
              update own todo status only.
    """
    serializer_class = TodoSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'partial_update', 'update']:
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        user = self.request.user
        if is_admin(user):
            return Todo.objects.select_related('project', 'assignee').all()
        # Employee: see todos assigned to them or on their projects
        try:
            emp = user.employee_record
        except Employee.DoesNotExist:
            return Todo.objects.none()
        return Todo.objects.filter(assignee=emp).select_related('project', 'assignee')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        todo = self.get_object()
        user = request.user

        # Employees can only toggle their own todos' status
        if not is_admin(user):
            allowed_fields = {'status', 'completed_at'}
            if set(request.data.keys()) - allowed_fields:
                return Response(
                    {'detail': 'Employees may only update status.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            # Auto-set completed_at when marking done
            data = dict(request.data)
            if data.get('status') == 'done' and not todo.completed_at:
                data['completed_at'] = timezone.now().isoformat()
            elif data.get('status') != 'done':
                data['completed_at'] = None
            serializer = self.get_serializer(todo, data=data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        return super().partial_update(request, *args, **kwargs)
