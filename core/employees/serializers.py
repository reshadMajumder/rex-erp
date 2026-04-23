from rest_framework import serializers
from django.contrib.auth.models import User
from accounts.models import UserRole
from .models import Employee


class EmployeeSerializer(serializers.ModelSerializer):
    has_login = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            'id', 'name', 'email', 'phone', 'role',
            'has_login', 'user_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'has_login', 'user_id', 'created_at', 'updated_at']

    def get_has_login(self, obj):
        return obj.user_id is not None

    def get_user_id(self, obj):
        return obj.user_id


class EmployeeMinSerializer(serializers.ModelSerializer):
    """Lightweight for dropdowns."""
    class Meta:
        model = Employee
        fields = ['id', 'name']


class CreateEmployeeSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    phone = serializers.CharField(max_length=50, required=False, allow_blank=True)
    role = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with that email already exists.')
        return value.lower()


class ResetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(min_length=6, write_only=True)
