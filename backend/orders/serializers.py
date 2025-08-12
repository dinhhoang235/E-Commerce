from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Order, OrderItem
from products.models import Product
from users.models import Address
from cart.models import CartItem
from .utils import OrderManager
import uuid
from datetime import datetime


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price', 'product_price', 'product_image']
        read_only_fields = ['id', 'product_name', 'product_price', 'product_image']


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for listing orders (customer view)"""
    items = OrderItemSerializer(many=True, read_only=True)
    customer = serializers.CharField(source='customer_name', read_only=True)
    email = serializers.CharField(source='customer_email', read_only=True)
    products = serializers.ListField(source='products_list', read_only=True)
    date = serializers.DateTimeField(format='%Y-%m-%d', read_only=True)
    shipping = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    has_pending_payment = serializers.BooleanField(read_only=True)
    can_continue_payment = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = ['id', 'customer', 'email', 'products', 'total', 'status', 'date', 'shipping', 'items', 'is_paid', 'payment_status', 'has_pending_payment', 'can_continue_payment']
        read_only_fields = ['id', 'customer', 'email', 'products', 'date', 'shipping', 'is_paid', 'payment_status', 'has_pending_payment', 'can_continue_payment']
    
    def get_shipping(self, obj):
        return {
            'address': obj.shipping_address_formatted,
            'method': obj.shipping_method_display
        }
    
    def get_payment_status(self, obj):
        """Get the payment status from payment transactions, prioritizing refunded status"""
        from payments.models import PaymentTransaction
        
        # Check for refunded payments first (highest priority)
        refunded_transaction = PaymentTransaction.objects.filter(order=obj, status='refunded').first()
        if refunded_transaction:
            return 'refunded'
        
        # Then check for other statuses
        latest_transaction = PaymentTransaction.objects.filter(order=obj).order_by('-created_at').first()
        if latest_transaction:
            return latest_transaction.status
        return 'no_payment'
    
    def get_can_continue_payment(self, obj):
        """Check if user can continue payment for this order"""
        return obj.status == 'pending' and not obj.is_paid


class AdminOrderSerializer(serializers.ModelSerializer):
    """Serializer for admin order listing - matches your required format exactly"""
    customer = serializers.CharField(source='customer_name', read_only=True)
    email = serializers.CharField(source='customer_email', read_only=True)
    products = serializers.ListField(source='products_list', read_only=True)
    date = serializers.DateTimeField(format='%Y-%m-%d', read_only=True)
    shipping = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = ['id', 'customer', 'email', 'products', 'total', 'status', 'date', 'shipping', 'is_paid', 'payment_status']
        read_only_fields = ['id', 'customer', 'email', 'products', 'date', 'shipping', 'is_paid', 'payment_status']
    
    def get_shipping(self, obj):
        return {
            'address': obj.shipping_address_formatted,
            'method': obj.shipping_method_display
        }
    
    def get_payment_status(self, obj):
        """Get the payment status from payment transactions, prioritizing refunded status"""
        from payments.models import PaymentTransaction
        
        # Check for refunded payments first (highest priority)
        refunded_transaction = PaymentTransaction.objects.filter(order=obj, status='refunded').first()
        if refunded_transaction:
            return 'refunded'
        
        # Then check for other statuses
        latest_transaction = PaymentTransaction.objects.filter(order=obj).order_by('-created_at').first()
        if latest_transaction:
            return latest_transaction.status
        return 'no_payment'


class OrderDetailSerializer(serializers.ModelSerializer):
    """Detailed order serializer with all items"""
    items = OrderItemSerializer(many=True, read_only=True)
    customer = serializers.CharField(source='customer_name', read_only=True)
    email = serializers.CharField(source='customer_email', read_only=True)
    products = serializers.ListField(source='products_list', read_only=True)
    date = serializers.DateTimeField(format='%Y-%m-%d', read_only=True)
    shipping = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = ['id', 'customer', 'email', 'products', 'total', 'status', 'date', 'shipping', 'items', 'is_paid', 'payment_status']
        read_only_fields = ['id', 'customer', 'email', 'products', 'date', 'shipping', 'is_paid', 'payment_status']
    
    def get_shipping(self, obj):
        return {
            'address': obj.shipping_address_formatted,
            'method': obj.shipping_method_display
        }
    
    def get_payment_status(self, obj):
        """Get the latest payment status from payment transactions"""
        from payments.models import PaymentTransaction
        latest_transaction = PaymentTransaction.objects.filter(order=obj).order_by('-created_at').first()
        if latest_transaction:
            return latest_transaction.status
        return 'no_payment'


class OrderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new orders"""
    items = serializers.ListField(write_only=True, required=False)
    shipping_address_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = Order
        fields = ['shipping_address_id', 'shipping_method', 'items']
    
    def create(self, validated_data):
        user = self.context['request'].user
        items_data = validated_data.pop('items', [])
        shipping_address_id = validated_data.pop('shipping_address_id', None)
        
        # Get shipping address
        shipping_address = None
        if shipping_address_id:
            try:
                shipping_address = Address.objects.get(id=shipping_address_id, user=user)
            except Address.DoesNotExist:
                pass
        
        # If no items provided, use cart items
        if not items_data:
            cart_items = CartItem.objects.filter(cart__user=user)
            if not cart_items.exists():
                raise serializers.ValidationError("No items in cart to create order")
            items_data = [{'product_id': item.product.id, 'quantity': item.quantity} for item in cart_items]
        
        # Use OrderManager to create order with proper payment deadline
        try:
            order = OrderManager.create_order(
                user=user,
                items_data=items_data,
                shipping_address=shipping_address,
                shipping_method=validated_data.get('shipping_method', 'standard')
            )
            
            # Clear cart if items were from cart
            if not validated_data.get('items'):
                CartItem.objects.filter(cart__user=user).delete()
            
            return order
            
        except Exception as e:
            raise serializers.ValidationError(f"Failed to create order: {str(e)}")


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating order status (admin only)"""
    
    class Meta:
        model = Order
        fields = ['status']
    
    def update(self, instance, validated_data):
        instance.status = validated_data.get('status', instance.status)
        instance.save()
        return instance
