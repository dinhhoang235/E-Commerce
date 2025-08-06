from django.urls import path
from . import views
from django.urls import include

app_name = 'orders'

# Admin endpoints
admin_patterns = [
    path('', views.AdminOrderListView.as_view(), name='admin-order-list'),
    path('stats/', views.AdminOrderStatsView.as_view(), name='admin-order-stats'),
    path('stock-monitoring/', views.stock_monitoring, name='admin-stock-monitoring'),
    path('<str:id>/', views.AdminOrderDetailView.as_view(), name='admin-order-detail'),
]

# User endpoints
user_patterns = [
    path('', views.OrderListCreateView.as_view(), name='user-order-list-create'),
    path('stats/', views.user_order_stats, name='user-order-stats'),
    path('create-from-cart/', views.create_order_from_cart, name='create-order-from-cart'),
    path('validate-cart-stock/', views.validate_cart_stock, name='validate-cart-stock'),
    path('<str:pk>/', views.OrderDetailView.as_view(), name='user-order-detail'),
    path('<str:order_id>/status/', views.update_order_status, name='user-order-status'),
    path('<str:order_id>/cancel/', views.cancel_order, name='user-cancel-order'),
    path('<str:order_id>/items/<int:item_id>/quantity/', views.update_order_item_quantity, name='update-order-item-quantity'),
    path('cancel/<int:order_id>/', views.CancelOrderView.as_view(), name='cancel-order'),
    path('can-cancel/<int:order_id>/', views.CheckCancelOrderView.as_view(), name='can-cancel-order'),
    path('cancellation/<int:order_id>/', views.OrderCancellationView.as_view(), name='order-cancellation'),
]

urlpatterns = [
    path('admin/', include((admin_patterns, 'admin'))),
    path('', include((user_patterns, 'user'))),
]
