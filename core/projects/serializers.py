from rest_framework import serializers
from clients.models import Client
from .models import Project, ProjectAssignment, ClientPayment, EmployeePayment, Note


class ProjectSerializer(serializers.ModelSerializer):
    client_id = serializers.PrimaryKeyRelatedField(
        source='client',
        queryset=Client.objects.all(),
        required=False,
        allow_null=True,
    )
    client_name = serializers.CharField(source='client.name', read_only=True, default=None)

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'client_id', 'client_name',
            'budget', 'start_date', 'end_date', 'status',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'client_name', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Expose nested client object matching the Supabase shape the frontend expects
        if instance.client:
            data['clients'] = {
                'id': str(instance.client.id),
                'name': instance.client.name,
                'email': instance.client.email,
                'phone': instance.client.phone,
            }
        else:
            data['clients'] = None
        return data


class ProjectMinSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name']


class ProjectAssignmentSerializer(serializers.ModelSerializer):
    employee_id = serializers.UUIDField(write_only=False)

    class Meta:
        model = ProjectAssignment
        fields = [
            'id', 'project_id', 'employee_id',
            'task_description', 'task_amount',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'project_id', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Nested employees object matching frontend query shape
        data['employees'] = {
            'id': str(instance.employee.id),
            'name': instance.employee.name,
            'email': instance.employee.email,
        }
        return data


class ClientPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientPayment
        fields = [
            'id', 'project_id', 'amount', 'payment_date',
            'method', 'reference', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'project_id', 'created_at', 'updated_at']


class EmployeePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeePayment
        fields = [
            'id', 'assignment_id', 'amount', 'payment_date',
            'method', 'reference', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'assignment_id', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Nested for frontend compatibility
        data['project_assignments'] = {
            'employee_id': str(instance.assignment.employee_id),
            'employees': {'name': instance.assignment.employee.name},
            'projects': {'name': instance.assignment.project.name},
        }
        return data


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = [
            'id', 'project_id', 'entity_type', 'entity_id',
            'content', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'project_id', 'created_at', 'updated_at']
