from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Order, OrderItem
from products.models import Product
from users.models import Address
from cart.models import CartItem
import uuid
from datetime import datetime


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price', 'product_price']
        read_only_fields = ['id', 'product_name', 'product_price']


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for listing orders (customer view)"""
    items = OrderItemSerializer(many=True, read_only=True)
    customer = serializers.CharField(source='customer_name', read_only=True)
    email = serializers.CharField(source='customer_email', read_only=True)
    products = serializers.ListField(source='products_list', read_only=True)
    date = serializers.DateTimeField(format='%Y-%m-%d', read_only=True)
    shipping = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = ['id', 'customer', 'email', 'products', 'total', 'status', 'date', 'shipping', 'items']
        read_only_fields = ['id', 'customer', 'email', 'products', 'date', 'shipping']
    
    def get_shipping(self, obj):
        return {
            'address': obj.shipping_address_formatted,
            'method': obj.shipping_method_display
        }


class AdminOrderSerializer(serializers.ModelSerializer):
    """Serializer for admin order listing - matches your required format exactly"""
    customer = serializers.CharField(source='customer_name', read_only=True)
    email = serializers.CharField(source='customer_email', read_only=True)
    products = serializers.ListField(source='products_list', read_only=True)
    date = serializers.DateTimeField(format='%Y-%m-%d', read_only=True)
    shipping = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = ['id', 'customer', 'email', 'products', 'total', 'status', 'date', 'shipping']
        read_only_fields = ['id', 'customer', 'email', 'products', 'date', 'shipping']
    
    def get_shipping(self, obj):
        return {
            'address': obj.shipping_address_formatted,
            'method': obj.shipping_method_display
        }


class OrderDetailSerializer(serializers.ModelSerializer):
    """Detailed order serializer with all items"""
    items = OrderItemSerializer(many=True, read_only=True)
    customer = serializers.CharField(source='customer_name', read_only=True)
    email = serializers.CharField(source='customer_email', read_only=True)
    products = serializers.ListField(source='products_list', read_only=True)
    date = serializers.DateTimeField(format='%Y-%m-%d', read_only=True)
    shipping = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = ['id', 'customer', 'email', 'products', 'total', 'status', 'date', 'shipping', 'items']
        read_only_fields = ['id', 'customer', 'email', 'products', 'date', 'shipping']
    
    def get_shipping(self, obj):
        return {
            'address': obj.shipping_address_formatted,
            'method': obj.shipping_method_display
        }


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
        
        # Generate order ID
        order_id = f"APL{str(uuid.uuid4())[:6].upper()}"
        
        # Get shipping address
        shipping_address = None
        if shipping_address_id:
            try:
                shipping_address = Address.objects.get(id=shipping_address_id, user=user)
            except Address.DoesNotExist:
                pass
        
        # If no items provided, use cart items
        if not items_data:
            cart_items = CartItem.objects.filter(user=user)
            if not cart_items.exists():
                raise serializers.ValidationError("No items in cart to create order")
            items_data = [{'product_id': item.product.id, 'quantity': item.quantity} for item in cart_items]
        
        # Calculate total
        total = 0
        order_items = []
        
        for item_data in items_data:
            try:
                product = Product.objects.get(id=item_data['product_id'])
                quantity = item_data.get('quantity', 1)
                price = product.price
                total += price * quantity
                order_items.append({
                    'product': product,
                    'quantity': quantity,
                    'price': price
                })
            except Product.DoesNotExist:
                raise serializers.ValidationError(f"Product with id {item_data['product_id']} not found")
        
        # Create order
        order = Order.objects.create(
            id=order_id,
            user=user,
            shipping_address=shipping_address,
            shipping_method=validated_data.get('shipping_method', 'standard'),
            total=total
        )
        
        # Create order items
        for item_data in order_items:
            OrderItem.objects.create(
                order=order,
                product=item_data['product'],
                quantity=item_data['quantity'],
                price=item_data['price']
            )
        
        # Clear cart if items were from cart
        if not validated_data.get('items'):
            CartItem.objects.filter(user=user).delete()
        
        return order


class OrderStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating order status (admin only)"""
    
    class Meta:
        model = Order
        fields = ['status']
    
    def update(self, instance, validated_data):
        instance.status = validated_data.get('status', instance.status)
        instance.save()
        return instance
