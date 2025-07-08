"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from backend.routers import router
from rest_framework_simplejwt.views import TokenRefreshView
from users.views import UserRegistrationView, CustomTokenObtainPairView, CheckUsernameAvailabilityView, CheckEmailAvailabilityView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/register/', UserRegistrationView.as_view(), name='user_register'),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),  # login
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),  # refresh token
    path('api/check-username/', CheckUsernameAvailabilityView.as_view(), name='check_username'),
    path('api/check-email/', CheckEmailAvailabilityView.as_view(), name='check_email'),
    
    path('api/users/', include('users.urls')),
    path("api/admin/", include("adminpanel.urls")),
    path('api/orders/', include('orders.urls')),
]
# This is used for
if settings.DEBUG: 
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)