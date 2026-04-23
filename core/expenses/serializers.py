from rest_framework import serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True, default=None)

    class Meta:
        model = Expense
        fields = [
            'id', 'project_id', 'project_name', 'category', 'description',
            'amount', 'vendor', 'expense_date', 'method', 'reference',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'project_name', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.project:
            data['projects'] = {'name': instance.project.name}
        else:
            data['projects'] = None
        return data
