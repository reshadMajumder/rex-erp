from django.urls import path
from .views import (
    DashboardStatsView,
    DashboardActivityView,
    DashboardRecentProjectsView,
    MyAssignmentsView,
    MyPaymentsView,
)

urlpatterns = [
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/activity/', DashboardActivityView.as_view(), name='dashboard-activity'),
    path('dashboard/recent_projects/', DashboardRecentProjectsView.as_view(), name='dashboard-recent-projects'),
    path('me/assignments/', MyAssignmentsView.as_view(), name='my-assignments'),
    path('me/payments/', MyPaymentsView.as_view(), name='my-payments'),
]
