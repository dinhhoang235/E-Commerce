from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.contrib.auth import update_session_auth_hash
from django.shortcuts import get_object_or_404
from django.db import models
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework_simplejwt.views import TokenViewBase
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from users.models import Account, Address


from users.serializers import (
    UserSerializer, 
    UserRegistrationSerializer,
    PasswordChangeSerializer,
    CustomTokenObtainPairSerializer,
    AccountSerializer,
    AddressSerializer,
)

class CustomTokenObtainPairView(TokenViewBase):
    serializer_class = CustomTokenObtainPairSerializer

class CheckUsernameAvailabilityView(APIView):
    """
    Check if a username is available
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, *args, **kwargs):
        username = request.query_params.get('username', '').strip()
        
        if not username:
            return Response({'error': 'Username parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(username) < 3:
            return Response({'error': 'Username must be at least 3 characters long'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if username contains only allowed characters
        if not username.replace('_', '').isalnum():
            return Response({'error': 'Username can only contain letters, numbers, and underscores'}, status=status.HTTP_400_BAD_REQUEST)
        
        is_available = not User.objects.filter(username__iexact=username).exists()
        
        return Response({
            'username': username,
            'available': is_available
        }, status=status.HTTP_200_OK)

class CheckEmailAvailabilityView(APIView):
    """
    Check if an email is available
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, *args, **kwargs):
        email = request.query_params.get('email', '').strip().lower()
        
        if not email:
            return Response({'error': 'Email parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Basic email validation
        if '@' not in email or '.' not in email.split('@')[-1]:
            return Response({'error': 'Please enter a valid email address'}, status=status.HTTP_400_BAD_REQUEST)
        
        is_available = not User.objects.filter(email__iexact=email).exists()
        
        return Response({
            'email': email,
            'available': is_available
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class UserRegistrationView(APIView):
    """
    Dedicated view for user registration
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = UserRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Serialize lại để đảm bảo `get_token` được gọi
        full_serializer = UserRegistrationSerializer(user)
        return Response(full_serializer.data, status=status.HTTP_201_CREATED)
    

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    
    def get_queryset(self):
        # For most actions, users should only see their own data
        if self.action in ['list', 'retrieve']:
            return User.objects.filter(id=self.request.user.id)
        return super().get_queryset()
    
    # Remove the create method since registration is now handled separately
    def create(self, request, *args, **kwargs):
        return Response(
            {'error': 'Registration not allowed through this endpoint. Use /api/register/ instead.'}, 
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Return data for the currently authenticated user"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change password for the currently authenticated user"""
        user = request.user
        serializer = PasswordChangeSerializer(data=request.data)
        
        if serializer.is_valid():
            # Check old password
            if not user.check_password(serializer.data.get('old_password')):
                return Response(
                    {'old_password': ['Wrong password.']}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set new password
            user.set_password(serializer.data.get('new_password'))
            user.save()
            update_session_auth_hash(request, user)  # Keep user logged in
            return Response({'status': 'password updated'}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            account = request.user.account
        except Account.DoesNotExist:
            return Response({'detail': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AccountSerializer(account, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        try:
            account = request.user.account
        except Account.DoesNotExist:
            return Response({'detail': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AccountSerializer(account, data=request.data, partial=False, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        try:
            account = request.user.account
        except Account.DoesNotExist:
            return Response({'detail': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AccountSerializer(account, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Chỉ trả về địa chỉ của người đang đăng nhập
        return Address.objects.filter(user=self.request.user).order_by('-is_default', '-created_at')

    def perform_create(self, serializer):
        # Gán user khi tạo mới
        serializer.save(user=self.request.user)