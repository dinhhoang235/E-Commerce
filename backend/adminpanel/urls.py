from django.urls import path
from .views import (
    AdminLoginView, 
    SalesAnalyticsView, 
    TopProductsView, 
    CustomerMetricsView, 
    TrafficSourcesView,
    ConversionRateView,
    AnalyticsDashboardView
)

urlpatterns = [
    path("login/", AdminLoginView.as_view(), name="admin-login"),
    path("analytics/sales/", SalesAnalyticsView.as_view(), name="admin-analytics-sales"),
    path("analytics/products/", TopProductsView.as_view(), name="admin-analytics-products"),
    path("analytics/customers/", CustomerMetricsView.as_view(), name="admin-analytics-customers"),
    path("analytics/traffic/", TrafficSourcesView.as_view(), name="admin-analytics-traffic"),
    path("analytics/conversion/", ConversionRateView.as_view(), name="admin-analytics-conversion"),
    path("analytics/dashboard/", AnalyticsDashboardView.as_view(), name="admin-analytics-dashboard"),
]
