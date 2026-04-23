import uuid
from django.db import models
from django.contrib.auth.models import User
from projects.models import Project


class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('general', 'General'),
        ('materials', 'Materials'),
        ('travel', 'Travel'),
        ('software', 'Software'),
        ('equipment', 'Equipment'),
        ('office', 'Office'),
        ('marketing', 'Marketing'),
        ('utilities', 'Utilities'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, null=True, blank=True, related_name='expenses'
    )
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='general')
    description = models.TextField()
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    vendor = models.CharField(max_length=200, blank=True, null=True)
    expense_date = models.DateField()
    method = models.CharField(max_length=100, blank=True, null=True)
    reference = models.CharField(max_length=300, blank=True, null=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-expense_date']

    def __str__(self):
        return self.description
