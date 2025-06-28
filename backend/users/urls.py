from django.urls import path
from .views import AccountView

urlpatterns = [
    path('me/account/', AccountView.as_view(), name='account-detail'),
]
