from django.urls import path
from .views import AccountView, AdminCustomerListView

urlpatterns = [
    path('me/account/', AccountView.as_view(), name='account-detail'),
    path('admin/customers/', AdminCustomerListView.as_view(), name='admin-customer-list'),
]
