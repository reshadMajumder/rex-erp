from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, UserRole


class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = ['id', 'role', 'created_at']


class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    roles = UserRoleSerializer(source='user.roles', many=True, read_only=True)

    class Meta:
        model = Profile
        fields = ['id', 'username', 'email', 'display_name', 'roles', 'created_at', 'updated_at']
        read_only_fields = ['id', 'username', 'email', 'roles', 'created_at', 'updated_at']


class UserManagementSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(source='profile.display_name', required=False)
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'display_name', 'is_superuser', 'is_active', 'roles', 'date_joined']
        read_only_fields = ['id', 'username', 'email', 'roles', 'date_joined']

    def get_roles(self, obj):
        return list(obj.roles.values_list('role', flat=True))

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        display_name = profile_data.get('display_name')

        if display_name is not None:
            profile = instance.profile
            profile.display_name = display_name
            profile.save()

        # Handle is_superuser
        if 'is_superuser' in validated_data:
            instance.is_superuser = validated_data['is_superuser']
            # If making superuser, also ensure they have 'admin' role in UserRole model
            if instance.is_superuser:
                UserRole.objects.get_or_create(user=instance, role='admin')

        return super().update(instance, validated_data)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    display_name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with that email already exists.')
        return value.lower()

    def create(self, validated_data):
        email = validated_data['email']
        password = validated_data['password']
        display_name = validated_data.get('display_name', '').strip() or email.split('@')[0]

        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=display_name,
        )
        # Profile & role are created by the post_save signal
        user.profile.display_name = display_name
        user.profile.save(update_fields=['display_name'])
        return user
