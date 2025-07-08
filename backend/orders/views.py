from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.db import models
from .models import Order, OrderItem
from .serializers import (
    OrderSerializer, 
    OrderDetailSerializer, 
    OrderCreateSerializer, 
    AdminOrderSerializer,
    OrderStatusUpdateSerializer
)
from cart.models import CartItem


class OrderListCreateView(generics.ListCreateAPIView):
    """
    GET: List all orders for the authenticated user
    POST: Create a new order
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return OrderCreateSerializer
        return OrderSerializer
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-date')
    
    def perform_create(self, serializer):
        serializer.save()


class OrderDetailView(generics.RetrieveUpdateAPIView):
    """
    GET: Retrieve a specific order
    PUT/PATCH: Update order status (admin only for status changes)
    """
    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)
    
    def get_object(self):
        order_id = self.kwargs.get('pk')
        return get_object_or_404(Order, id=order_id, user=self.request.user)


class AdminOrderListView(generics.ListAPIView):
    """
    Admin view to list all orders in the required format
    """
    serializer_class = AdminOrderSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    queryset = Order.objects.all().order_by('-date')
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Add filtering options
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        customer_filter = self.request.query_params.get('customer', None)
        if customer_filter:
            queryset = queryset.filter(
                models.Q(user__username__icontains=customer_filter) |
                models.Q(user__first_name__icontains=customer_filter) |
                models.Q(user__last_name__icontains=customer_filter) |
                models.Q(user__account__first_name__icontains=customer_filter) |
                models.Q(user__account__last_name__icontains=customer_filter)
            )
        
        return queryset


class AdminOrderDetailView(generics.RetrieveUpdateAPIView):
    """
    Admin view to retrieve and update specific orders
    """
    serializer_class = AdminOrderSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    queryset = Order.objects.all()
    lookup_field = 'id'
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return OrderStatusUpdateSerializer
        return AdminOrderSerializer


class AdminOrderStatsView(generics.GenericAPIView):
    """
    Admin view to get order statistics
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    
    def get(self, request):
        from django.db.models import Count, Sum
        from datetime import datetime, timedelta
        
        # Get basic stats
        total_orders = Order.objects.count()
        pending_orders = Order.objects.filter(status='pending').count()
        processing_orders = Order.objects.filter(status='processing').count()
        shipped_orders = Order.objects.filter(status='shipped').count()
        completed_orders = Order.objects.filter(status='completed').count()
        
        # Get revenue stats
        total_revenue = Order.objects.aggregate(total=Sum('total'))['total'] or 0
        
        # Get recent orders (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_orders = Order.objects.filter(date__gte=thirty_days_ago).count()
        recent_revenue = Order.objects.filter(date__gte=thirty_days_ago).aggregate(total=Sum('total'))['total'] or 0
        
        # Orders by status
        status_counts = Order.objects.values('status').annotate(count=Count('id'))
        
        return Response({
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'processing_orders': processing_orders,
            'shipped_orders': shipped_orders,
            'completed_orders': completed_orders,
            'total_revenue': float(total_revenue),
            'recent_orders_30_days': recent_orders,
            'recent_revenue_30_days': float(recent_revenue),
            'status_breakdown': list(status_counts)
        })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_order_from_cart(request):
    """
    Create an order from the user's cart
    """
    user = request.user
    cart_items = CartItem.objects.filter(user=user)
    
    if not cart_items.exists():
        return Response(
            {'error': 'No items in cart'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Use the create serializer
    serializer = OrderCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        order = serializer.save()
        response_serializer = OrderDetailSerializer(order)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_order_history(request):
    """
    Get user's order history with pagination
    """
    orders = Order.objects.filter(user=request.user).order_by('-date')
    
    # Simple pagination
    page_size = int(request.query_params.get('page_size', 10))
    page = int(request.query_params.get('page', 1))
    start = (page - 1) * page_size
    end = start + page_size
    
    paginated_orders = orders[start:end]
    serializer = OrderSerializer(paginated_orders, many=True)
    
    return Response({
        'orders': serializer.data,
        'total': orders.count(),
        'page': page,
        'page_size': page_size,
        'has_next': end < orders.count()
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, permissions.IsAdminUser])
def admin_sample_orders(request):
    """
    Return sample orders in the exact format you specified
    """
    sample_data = [
        {
            "id": "APL001234",
            "customer": "John Doe",
            "email": "john@example.com",
            "products": ["iPhone 15 Pro", "AirPods Pro"],
            "total": 1299.0,
            "status": "completed",
            "date": "2024-01-15",
            "shipping": {
                "address": "123 Main St, San Francisco, CA 94102",
                "method": "Standard Shipping",
            },
        },
        {
            "id": "APL001235",
            "customer": "Jane Smith",
            "email": "jane@example.com",
            "products": ["MacBook Air M2"],
            "total": 1299.0,
            "status": "processing",
            "date": "2024-01-15",
            "shipping": {
                "address": "456 Oak Ave, Los Angeles, CA 90210",
                "method": "Express Shipping",
            },
        }
    ]
    
    return Response(sample_data)
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Order.objects.all().order_by('-date')
    
    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset


class AdminOrderDetailView(generics.RetrieveUpdateAPIView):
    """
    Admin view to retrieve and update any order
    """
    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Order.objects.all()


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_order_from_cart(request):
    """
    Create an order from user's cart items
    """
    try:
        user = request.user
        cart_items = CartItem.objects.filter(user=user)
        
        if not cart_items.exists():
            return Response(
                {'error': 'Cart is empty'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get shipping address from request
        shipping_address_id = request.data.get('shipping_address')
        if not shipping_address_id:
            return Response(
                {'error': 'Shipping address is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prepare order data
        items_data = []
        total = 0
        
        for cart_item in cart_items:
            item_data = {
                'product_id': cart_item.product.id,
                'quantity': cart_item.quantity,
                'price': cart_item.product.price
            }
            items_data.append(item_data)
            total += cart_item.product.price * cart_item.quantity
        
        # Generate order ID (you might want to use a more sophisticated method)
        import uuid
        order_id = f"ORD{str(uuid.uuid4())[:8].upper()}"
        
        order_data = {
            'id': order_id,
            'shipping_address': shipping_address_id,
            'status': 'pending',
            'items': items_data
        }
        
        # Create order using serializer
        serializer = OrderCreateSerializer(data=order_data, context={'request': request})
        if serializer.is_valid():
            order = serializer.save()
            
            # Clear the cart after successful order creation
            cart_items.delete()
            
            # Return the created order with proper format
            response_serializer = OrderSerializer(order)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response(
            {'error': f'Failed to create order: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PATCH'])
@permission_classes([permissions.IsAuthenticated])
def update_order_status(request, order_id):
    """
    Update order status (for users: cancel only, for admin: any status)
    """
    try:
        if request.user.is_staff:
            # Admin can update any order
            order = get_object_or_404(Order, id=order_id)
        else:
            # Regular users can only update their own orders
            order = get_object_or_404(Order, id=order_id, user=request.user)
        
        new_status = request.data.get('status')
        if not new_status:
            return Response(
                {'error': 'Status is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate status choices
        valid_statuses = dict(Order.STATUS_CHOICES).keys()
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Valid choices: {list(valid_statuses)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Regular users can only cancel pending orders
        if not request.user.is_staff:
            if order.status != 'pending' or new_status != 'cancelled':
                return Response(
                    {'error': 'You can only cancel pending orders'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        order.status = new_status
        order.save()
        
        serializer = OrderSerializer(order)
        return Response(serializer.data)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to update order status: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_order_stats(request):
    """
    Get order statistics for the authenticated user
    """
    user = request.user
    orders = Order.objects.filter(user=user)
    
    stats = {
        'total_orders': orders.count(),
        'pending_orders': orders.filter(status='pending').count(),
        'processing_orders': orders.filter(status='processing').count(),
        'shipped_orders': orders.filter(status='shipped').count(),
        'completed_orders': orders.filter(status='completed').count(),
        'total_spent': sum(order.total for order in orders),
    }
    
    return Response(stats)


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def admin_order_stats(request):
    """
    Get comprehensive order statistics for admin
    """
    orders = Order.objects.all()
    
    stats = {
        'total_orders': orders.count(),
        'pending_orders': orders.filter(status='pending').count(),
        'processing_orders': orders.filter(status='processing').count(),
        'shipped_orders': orders.filter(status='shipped').count(),
        'completed_orders': orders.filter(status='completed').count(),
        'total_revenue': sum(order.total for order in orders),
        'average_order_value': orders.aggregate(
            avg_total=models.Avg('total')
        )['avg_total'] or 0,
    }
    
    return Response(stats)