from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from accounts.models import UserRole
from accounts.permissions import IsAdmin
from employees.models import Employee
from .models import Project, ProjectAssignment, ClientPayment, EmployeePayment, Note
from .serializers import (
    ProjectSerializer, ProjectMinSerializer,
    ProjectAssignmentSerializer, ClientPaymentSerializer,
    EmployeePaymentSerializer, NoteSerializer,
)


def is_admin(user):
    return UserRole.objects.filter(user=user, role='admin').exists()


class ProjectViewSet(viewsets.ModelViewSet):
    """
    Admin: full CRUD on all projects.
    Employee: read-only list/detail of projects they are assigned to.
    GET /api/projects/min/  — dropdown list (admin)
    """
    serializer_class = ProjectSerializer

    def get_queryset(self):
        user = self.request.user
        if is_admin(user):
            return Project.objects.select_related('client').all()
        # Employees see only projects they are assigned to
        try:
            emp = user.employee_record
        except Employee.DoesNotExist:
            return Project.objects.none()
        return Project.objects.filter(
            assignments__employee=emp
        ).select_related('client').distinct()

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'min_list']:
            return [IsAuthenticated()]
        return [IsAdmin()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='min')
    def min_list(self, request):
        qs = self.get_queryset().order_by('name')
        return Response(ProjectMinSerializer(qs, many=True).data)

    # ── Nested: Assignments ──────────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='assignments')
    def assignments(self, request, pk=None):
        project = get_object_or_404(Project, pk=pk)
        if request.method == 'GET':
            qs = ProjectAssignment.objects.filter(project=project).select_related('employee')
            return Response(ProjectAssignmentSerializer(qs, many=True).data)

        if not is_admin(request.user):
            return Response({'detail': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)
        data = {**request.data, 'project_id': str(project.id)}
        serializer = ProjectAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(project=project)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path=r'assignments/(?P<aid>[^/.]+)')
    def delete_assignment(self, request, pk=None, aid=None):
        if not is_admin(request.user):
            return Response({'detail': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)
        assignment = get_object_or_404(ProjectAssignment, pk=aid, project_id=pk)
        assignment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Nested: Client Payments ──────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='client_payments')
    def client_payments(self, request, pk=None):
        project = get_object_or_404(Project, pk=pk)
        if request.method == 'GET':
            qs = ClientPayment.objects.filter(project=project)
            return Response(ClientPaymentSerializer(qs, many=True).data)

        if not is_admin(request.user):
            return Response({'detail': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ClientPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(project=project)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path=r'client_payments/(?P<pid>[^/.]+)')
    def delete_client_payment(self, request, pk=None, pid=None):
        if not is_admin(request.user):
            return Response({'detail': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)
        payment = get_object_or_404(ClientPayment, pk=pid, project_id=pk)
        payment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Nested: Employee Payments ────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='employee_payments')
    def employee_payments(self, request, pk=None):
        project = get_object_or_404(Project, pk=pk)
        assignment_ids = ProjectAssignment.objects.filter(project=project).values_list('id', flat=True)

        if request.method == 'GET':
            qs = EmployeePayment.objects.filter(
                assignment_id__in=assignment_ids
            ).select_related('assignment__employee', 'assignment__project')
            return Response(EmployeePaymentSerializer(qs, many=True).data)

        if not is_admin(request.user):
            return Response({'detail': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)
        # Expect assignment_id in request body
        assignment_id = request.data.get('assignment_id')
        assignment = get_object_or_404(ProjectAssignment, pk=assignment_id, project=project)
        serializer = EmployeePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(assignment=assignment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path=r'employee_payments/(?P<pid>[^/.]+)')
    def delete_employee_payment(self, request, pk=None, pid=None):
        if not is_admin(request.user):
            return Response({'detail': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)
        assignment_ids = ProjectAssignment.objects.filter(project_id=pk).values_list('id', flat=True)
        payment = get_object_or_404(EmployeePayment, pk=pid, assignment_id__in=assignment_ids)
        payment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Nested: Notes ────────────────────────────────────────────────────────

    @action(detail=True, methods=['get', 'post'], url_path='notes')
    def notes(self, request, pk=None):
        project = get_object_or_404(Project, pk=pk)
        if request.method == 'GET':
            qs = Note.objects.filter(project=project)
            return Response(NoteSerializer(qs, many=True).data)

        if not is_admin(request.user):
            return Response({'detail': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = NoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(project=project, created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path=r'notes/(?P<nid>[^/.]+)')
    def delete_note(self, request, pk=None, nid=None):
        if not is_admin(request.user):
            return Response({'detail': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)
        note = get_object_or_404(Note, pk=nid, project_id=pk)
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
