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
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from users.models import Account, Address
from django.utils import timezone
from datetime import timedelta


from users.serializers import (
    UserSerializer, 
    UserRegistrationSerializer,
    PasswordChangeSerializer,
    CustomTokenObtainPairSerializer,
    AccountSerializer,
    AddressSerializer,
    AdminCustomerSerializer,
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
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            # Set new password (old password validation is handled in serializer)
            user.set_password(serializer.validated_data.get('new_password'))
            user.save()
            update_session_auth_hash(request, user)  # Keep user logged in
            return Response({'status': 'password updated'}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AccountView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        try:
            account = request.user.account
        except Account.DoesNotExist:
            return Response({'detail': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        account_data = AccountSerializer(account, context={'request': request}).data

        address = Address.objects.filter(user=request.user).order_by('-is_default', '-created_at').first()
        address_data = AddressSerializer(address).data if address else None

        return Response({
            **account_data,
            "address": address_data,
        })

    def patch(self, request):
        try:
            account = request.user.account
        except Account.DoesNotExist:
            return Response({'detail': 'Account not found.'}, status=status.HTTP_404_NOT_FOUND)

        account_serializer = AccountSerializer(account, data=request.data, partial=True, context={'request': request})
        if not account_serializer.is_valid():
            return Response(account_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        account_serializer.save()

        address_data = request.data.get("address")
        address_response = None

        if address_data:
            address = Address.objects.filter(user=request.user).order_by('-is_default', '-created_at').first()
            if address:
                address_serializer = AddressSerializer(address, data=address_data, partial=True)
            else:
                address_serializer = AddressSerializer(data=address_data)

            if address_serializer.is_valid():
                address_serializer.save(user=request.user)
                address_response = address_serializer.data
            else:
                return Response({"address": address_serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            **account_serializer.data,
            "address": address_response or None
        })
    

class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Chỉ trả về địa chỉ của người đang đăng nhập
        return Address.objects.filter(user=self.request.user).order_by('-is_default', '-created_at')

    def perform_create(self, serializer):
        # Gán user khi tạo mới
        serializer.save(user=self.request.user)

class AdminCustomerListView(APIView):
    """
    API endpoint to get customer list with order statistics
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Get all users who have made at least one order or have complete profiles
        users = User.objects.select_related('account').prefetch_related('addresses', 'orders')
        
        # Filter by search query if provided
        search = request.query_params.get('search', '')
        if search:
            users = users.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        # Filter by status if provided
        status_filter = request.query_params.get('status', '')
        if status_filter in ['active', 'inactive']:

            
            six_months_ago = timezone.now() - timedelta(days=180)
            
            if status_filter == 'active':
                users = users.filter(
                    Q(orders__date__gte=six_months_ago) |
                    Q(last_login__gte=six_months_ago)
                ).distinct()
            else:
                active_user_ids = User.objects.filter(
                    Q(orders__date__gte=six_months_ago) |
                    Q(last_login__gte=six_months_ago)
                ).distinct().values_list('id', flat=True)
                users = users.exclude(id__in=active_user_ids)
        
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        start = (page - 1) * page_size
        end = start + page_size
        
        total_users = users.count()
        users_page = users[start:end]
        
        serializer = AdminCustomerSerializer(users_page, many=True)
        
        return Response({
            'count': total_users,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_users + page_size - 1) // page_size,
            'results': serializer.data
        })