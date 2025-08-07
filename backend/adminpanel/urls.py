from django.urls import path
from .views import (
    AdminLoginView, 
    SalesAnalyticsView, 
    TopProductsView, 
    CustomerMetricsView, 
    TrafficSourcesView,
    ConversionRateView,
    AnalyticsDashboardView,
    StoreSettingsView,
    StoreSettingsPartialView,
    ProductStatsView,
    PaymentTransactionsView,
    PaymentStatsView
)

urlpatterns = [
    path("login/", AdminLoginView.as_view(), name="admin-login"),
    path("analytics/sales/", SalesAnalyticsView.as_view(), name="admin-analytics-sales"),
    path("analytics/products/", TopProductsView.as_view(), name="admin-analytics-products"),
    path("analytics/products/<int:product_id>/", ProductStatsView.as_view(), name="admin-product-stats"),
    path("analytics/customers/", CustomerMetricsView.as_view(), name="admin-analytics-customers"),
    path("analytics/traffic/", TrafficSourcesView.as_view(), name="admin-analytics-traffic"),
    path("analytics/conversion/", ConversionRateView.as_view(), name="admin-analytics-conversion"),
    path("analytics/dashboard/", AnalyticsDashboardView.as_view(), name="admin-analytics-dashboard"),
    
    # Payment endpoints
    path("payments/", PaymentTransactionsView.as_view(), name="admin-payments"),
    path("payments/stats/", PaymentStatsView.as_view(), name="admin-payments-stats"),
    
    # Settings endpoints
    path("settings/", StoreSettingsView.as_view(), name="store-settings"),
    path("settings/<str:section>/", StoreSettingsPartialView.as_view(), name="store-settings-partial"),
]
