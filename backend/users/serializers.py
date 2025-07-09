from rest_framework import serializers 
from django.contrib.auth.models import User
from .models import Account, Address
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Count, Sum
from django.utils import timezone
from datetime import datetime, timedelta
# Import orders model for the CustomerSerializer
# from orders.models import Order  # Uncomment when orders app is ready

class CustomTokenObtainPairSerializer(serializers.Serializer):
    username_or_email = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username_or_email = attrs.get("username_or_email")
        password = attrs.get("password")

        user = (
            User.objects.filter(username=username_or_email).first()
            or User.objects.filter(email=username_or_email).first()
        )

        if user is None:
            raise serializers.ValidationError({
                "username_or_email": ("No user found with this username/email.")
            })

        authenticated_user = authenticate(username=user.username, password=password)
        if authenticated_user is None:
            raise serializers.ValidationError({"password": ("Invalid credentials.")})

        refresh = self.get_token(authenticated_user)

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email
            }
        }
        
    @classmethod
    def get_token(cls, user):
        token = RefreshToken.for_user(user)
        
        token['user_id'] = user.id 
        token['username'] = user.username
        token['email'] = user.email
        
        return token

class BaseUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(write_only=True, required=False)
    phone = serializers.CharField(write_only=True, required=False)
    token = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'confirm_password',
            'first_name', 'last_name', 'date_joined', 'token',
            'full_name', 'phone',
        ]
        read_only_fields = ['id', 'date_joined', 'token']

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def _process_full_name(self, user, full_name):
        if full_name:
            names = full_name.strip().split(" ", 1)
            user.first_name = names[0]
            user.last_name = names[1] if len(names) == 2 else ""
            user.save()

    def get_token(self, user):
        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }

class UserSerializer(BaseUserSerializer):
    """General user serializer"""
    
    def create(self, validated_data):
        full_name = validated_data.pop('full_name', '')
        validated_data.pop('confirm_password')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        
        self._process_full_name(user, full_name)
        return user

class UserRegistrationSerializer(BaseUserSerializer):
    def validate(self, attrs):
        attrs = super().validate(attrs)
        if User.objects.filter(username=attrs.get('username')).exists():
            raise serializers.ValidationError({"username": "This username is already taken."})
        if attrs.get('email') and User.objects.filter(email=attrs.get('email')).exists():
            raise serializers.ValidationError({"email": "This email is already in use."})
        return attrs

    def create(self, validated_data):
        full_name = validated_data.pop('full_name', '')
        phone = validated_data.pop('phone', '')
        validated_data.pop('confirm_password')

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )

        self._process_full_name(user, full_name)

        # Gán thông tin vào Account
        if hasattr(user, 'account'):
            user.account.phone = phone
            user.account.first_name = user.first_name
            user.account.last_name = user.last_name
            user.account.save()

        return user
        
class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    confirm_password = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs.get('new_password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value
        
class AccountSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    avatar = serializers.SerializerMethodField()
    avatarFile = serializers.ImageField(write_only=True, required=False)
    
    
    class Meta:
        model = Account
        fields = ['id', 'username','first_name', 'last_name', 'avatar', 'email', 'phone', 'avatarFile']
    
    def get_avatar(self, obj):
        request = self.context.get('request')
        url = obj.get_avatar
        if request:
            return request.build_absolute_uri(url) 
        return url


    def update(self, instance, validated_data):
        avatar_file = validated_data.pop('avatarFile', None)

        if validated_data.get('avatar') in [None, ""]:
            instance.avatar.delete(save=False)
            instance.avatar = None
            validated_data.pop('avatar', None) 

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if avatar_file:
            instance.avatar = avatar_file

        instance.save()
        return instance

class AddressSerializer(serializers.ModelSerializer):
    country_label = serializers.SerializerMethodField()
    email = serializers.EmailField(source="user.email", read_only=True)
    
    class Meta:
        model = Address
        fields = [
            'id', 'first_name', 'last_name', 'phone', 
            'address_line1', 'city', 'state', 'zip_code', 
            'country', 'country_label', 
            'created_at', 'is_default', 'email'
        ]

    def get_country_label(self, obj):
        return obj.get_country_display()

class AdminCustomerSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    orders = serializers.SerializerMethodField()
    totalSpent = serializers.SerializerMethodField()
    joinDate = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'name', 'email', 'phone', 'location', 
            'orders', 'totalSpent', 'joinDate', 'status'
        ]
    
    def get_name(self, obj):
        """Get full name from first_name and last_name"""
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        elif obj.first_name:
            return obj.first_name
        elif obj.last_name:
            return obj.last_name
        return obj.username
    
    def get_location(self, obj):
        """Get location from user's default address"""
        try:
            default_address = obj.addresses.filter(is_default=True).first()
            if not default_address:
                default_address = obj.addresses.first()
            
            if default_address:
                return f"{default_address.city}, {default_address.state}"
            return "No address"
        except:
            return "No address"
    
    def get_orders(self, obj):
        """Get total number of orders"""
        return obj.orders.count()
    
    def get_totalSpent(self, obj):
        """Get total amount spent across all orders"""
        total = obj.orders.aggregate(total=Sum('total'))['total']
        return float(total) if total else 0.0
    
    def get_joinDate(self, obj):
        """Get join date in YYYY-MM-DD format"""
        return obj.date_joined.strftime('%Y-%m-%d')
    
    def get_status(self, obj):
        """Determine user status based on recent activity"""
        # Consider user active if they have orders in the last 6 months
        six_months_ago = timezone.now() - timedelta(days=180)
        recent_orders = obj.orders.filter(date__gte=six_months_ago).exists()
        
        if recent_orders or obj.last_login and obj.last_login >= six_months_ago:
            return "active"
        return "inactive"
    
    def get_phone(self, obj):
        """Get phone number from Account model"""
        try:
            return obj.account.phone if obj.account.phone else ""
        except:
            return ""
