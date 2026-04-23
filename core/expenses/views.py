from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdmin
from accounts.models import UserRole
from .models import Expense
from .serializers import ExpenseSerializer


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD for expenses.
    GET /api/expenses/ — list all expenses ordered by date desc.
    """
    serializer_class = ExpenseSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return Expense.objects.select_related('project').all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
