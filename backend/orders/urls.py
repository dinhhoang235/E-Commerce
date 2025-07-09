from django.urls import path
from . import views
from django.urls import include

app_name = 'orders'

# Admin endpoints
admin_patterns = [
    path('', views.AdminOrderListView.as_view(), name='admin-order-list'),
    path('stats/', views.AdminOrderStatsView.as_view(), name='admin-order-stats'),
    path('<str:id>/', views.AdminOrderDetailView.as_view(), name='admin-order-detail'),
]

# User endpoints
user_patterns = [
    path('', views.OrderListCreateView.as_view(), name='user-order-list-create'),
    path('stats/', views.user_order_stats, name='user-order-stats'),
    path('create-from-cart/', views.create_order_from_cart, name='create-order-from-cart'),
    path('<str:pk>/', views.OrderDetailView.as_view(), name='user-order-detail'),
    path('<str:order_id>/status/', views.update_order_status, name='user-order-status'),
]

urlpatterns = [
    path('admin/', include((admin_patterns, 'admin'))),
    path('', include((user_patterns, 'user'))),
]
