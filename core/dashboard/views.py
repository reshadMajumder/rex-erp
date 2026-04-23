from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsAdmin
from accounts.models import UserRole
from clients.models import Client
from employees.models import Employee
from projects.models import Project, ClientPayment, EmployeePayment, ProjectAssignment
from expenses.models import Expense
from todos.models import Todo


def is_admin(user):
    return UserRole.objects.filter(user=user, role='admin').exists()


class DashboardStatsView(APIView):
    """GET /api/dashboard/stats/ — KPI cards for the admin dashboard."""
    permission_classes = [IsAdmin]

    def get(self, request):
        projects = Project.objects.all()
        project_count = projects.count()
        active_count = projects.filter(status='active').count()
        employee_count = Employee.objects.count()

        total_budget = projects.aggregate(s=Sum('budget'))['s'] or 0

        received = ClientPayment.objects.aggregate(s=Sum('amount'))['s'] or 0
        paid_out = EmployeePayment.objects.aggregate(s=Sum('amount'))['s'] or 0
        total_expenses = Expense.objects.aggregate(s=Sum('amount'))['s'] or 0

        open_todos = Todo.objects.filter(status__in=['open', 'in_progress']).count()

        return Response({
            'projectCount': project_count,
            'activeCount': active_count,
            'employeeCount': employee_count,
            'totalBudget': float(total_budget),
            'received': float(received),
            'paid': float(paid_out),
            'totalExpenses': float(total_expenses),
            'openTodos': open_todos,
        })


class DashboardActivityView(APIView):
    """GET /api/dashboard/activity/ — recent 12 events for the activity feed."""
    permission_classes = [IsAdmin]

    def get(self, request):
        items = []

        # Client payments
        for r in ClientPayment.objects.select_related('project').order_by('-created_at')[:8]:
            items.append({
                'id': f'cp-{r.id}',
                'kind': 'client_payment',
                'title': 'Client payment received',
                'subtitle': r.project.name if r.project else 'Unassigned project',
                'amount': float(r.amount),
                'at': r.created_at.isoformat(),
            })

        # Employee payments
        for r in EmployeePayment.objects.select_related(
            'assignment__employee', 'assignment__project'
        ).order_by('-created_at')[:8]:
            items.append({
                'id': f'ep-{r.id}',
                'kind': 'employee_payment',
                'title': f'Paid {r.assignment.employee.name}',
                'subtitle': r.assignment.project.name,
                'amount': float(r.amount),
                'at': r.created_at.isoformat(),
            })

        # Expenses
        for r in Expense.objects.select_related('project').order_by('-created_at')[:8]:
            items.append({
                'id': f'exp-{r.id}',
                'kind': 'expense',
                'title': r.description,
                'subtitle': r.project.name if r.project else 'Overhead',
                'amount': float(r.amount),
                'at': r.created_at.isoformat(),
            })

        # Todos
        for r in Todo.objects.select_related('project').order_by('-updated_at')[:8]:
            if r.status == 'done':
                title = f'Completed: {r.title}'
            elif r.status == 'in_progress':
                title = f'Started: {r.title}'
            else:
                title = f'Todo: {r.title}'
            items.append({
                'id': f'td-{r.id}',
                'kind': 'todo',
                'title': title,
                'subtitle': r.project.name if r.project else 'General',
                'at': (r.completed_at or r.updated_at).isoformat(),
            })

        # Projects (recent)
        for r in Project.objects.select_related('client').order_by('-created_at')[:5]:
            items.append({
                'id': f'pr-{r.id}',
                'kind': 'project',
                'title': f'New project: {r.name}',
                'subtitle': r.client.name if r.client else 'No client',
                'at': r.created_at.isoformat(),
                'href': {'to': '/app/projects/$projectId', 'params': {'projectId': str(r.id)}},
            })

        # Sort by 'at' descending and return top 12
        items.sort(key=lambda x: x['at'], reverse=True)
        return Response(items[:12])


class DashboardRecentProjectsView(APIView):
    """GET /api/dashboard/recent_projects/ — last 5 projects for sidebar."""
    permission_classes = [IsAdmin]

    def get(self, request):
        projects = Project.objects.select_related('client').order_by('-created_at')[:5]
        data = []
        for p in projects:
            data.append({
                'id': str(p.id),
                'name': p.name,
                'status': p.status,
                'budget': float(p.budget),
                'end_date': p.end_date.isoformat() if p.end_date else None,
                'clients': {'name': p.client.name} if p.client else None,
            })
        return Response(data)


# ─── Employee "Me" views ─────────────────────────────────────────────────────

class MyAssignmentsView(APIView):
    """GET /api/me/assignments/ — employee's own project assignments with payment summary."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            emp = request.user.employee_record
        except Employee.DoesNotExist:
            return Response([])

        assignments = ProjectAssignment.objects.filter(
            employee=emp
        ).select_related('project').order_by('-created_at')

        data = []
        for a in assignments:
            paid = EmployeePayment.objects.filter(assignment=a).aggregate(
                s=Sum('amount')
            )['s'] or 0
            data.append({
                'id': str(a.id),
                'project_id': str(a.project_id),
                'task_description': a.task_description,
                'task_amount': float(a.task_amount),
                'paid': float(paid),
                'remaining': float(a.task_amount) - float(paid),
                'projects': {
                    'id': str(a.project.id),
                    'name': a.project.name,
                    'status': a.project.status,
                    'end_date': a.project.end_date.isoformat() if a.project.end_date else None,
                },
                'created_at': a.created_at.isoformat(),
            })
        return Response(data)


class MyPaymentsView(APIView):
    """GET /api/me/payments/ — all payments received by the logged-in employee."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            emp = request.user.employee_record
        except Employee.DoesNotExist:
            return Response([])

        assignment_ids = ProjectAssignment.objects.filter(
            employee=emp
        ).values_list('id', flat=True)

        payments = EmployeePayment.objects.filter(
            assignment_id__in=assignment_ids
        ).select_related('assignment__project').order_by('-payment_date')

        data = []
        for p in payments:
            data.append({
                'id': str(p.id),
                'assignment_id': str(p.assignment_id),
                'amount': float(p.amount),
                'payment_date': p.payment_date.isoformat(),
                'method': p.method,
                'reference': p.reference,
                'project_name': p.assignment.project.name,
                'created_at': p.created_at.isoformat(),
            })
        return Response(data)
