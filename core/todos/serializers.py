from rest_framework import serializers
from .models import Todo


class TodoSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True, default=None)
    assignee_name = serializers.CharField(source='assignee.name', read_only=True, default=None)

    class Meta:
        model = Todo
        fields = [
            'id', 'project_id', 'project_name', 'assignee_id', 'assignee_name',
            'title', 'details', 'status', 'priority',
            'due_date', 'completed_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'project_name', 'assignee_name', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['projects'] = {'name': instance.project.name} if instance.project else None
        data['employees'] = {'name': instance.assignee.name} if instance.assignee else None
        return data
