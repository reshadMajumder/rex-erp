from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from accounts.permissions import IsAdmin
from .models import Client
from .serializers import ClientSerializer, ClientMinSerializer


class ClientViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD for clients.
    GET /api/clients/min/ returns a lightweight list for dropdowns.
    """
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAdmin]

    @action(detail=False, methods=['get'], url_path='min')
    def min_list(self, request):
        clients = Client.objects.order_by('name')
        return Response(ClientMinSerializer(clients, many=True).data)
