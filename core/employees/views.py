from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User
from accounts.models import UserRole
from accounts.permissions import IsAdmin
from .models import Employee
from .serializers import (
    EmployeeSerializer, EmployeeMinSerializer,
    CreateEmployeeSerializer, ResetPasswordSerializer
)


class EmployeeViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD for employees.
    POST   /api/employees/           — create with login account
    GET    /api/employees/min/       — dropdown list
    POST   /api/employees/{id}/reset_password/ — change password
    DELETE /api/employees/{id}/     — delete employee + user account
    """
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateEmployeeSerializer
        if self.action == 'reset_password':
            return ResetPasswordSerializer
        return EmployeeSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateEmployeeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # 1. Create Django User
        user = User.objects.create_user(
            username=data['email'],
            email=data['email'],
            password=data['password'],
            first_name=data['name'],
        )
        # Signal auto-creates profile + assigns role.
        # Force the role to 'employee' (signal may have set admin if this was first user).
        UserRole.objects.filter(user=user, role='admin').delete()
        UserRole.objects.get_or_create(user=user, role='employee')

        # 2. Create employee record linked to user
        employee = Employee.objects.create(
            user=user,
            name=data['name'],
            email=data['email'],
            phone=data.get('phone') or None,
            role=data.get('role') or None,
        )
        return Response(EmployeeSerializer(employee).data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        employee = self.get_object()
        if employee.user:
            # Deleting the User cascades to UserRole, Profile, and Employee (SET_NULL then delete)
            employee.user.delete()
        employee.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], url_path='min')
    def min_list(self, request):
        employees = Employee.objects.order_by('name')
        return Response(EmployeeMinSerializer(employees, many=True).data)

    @action(detail=True, methods=['post'], url_path='reset_password')
    def reset_password(self, request, pk=None):
        employee = self.get_object()
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not employee.user:
            return Response(
                {'detail': 'This employee has no login account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        employee.user.set_password(serializer.validated_data['password'])
        employee.user.save(update_fields=['password'])
        return Response({'detail': 'Password updated.'})
