from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.db import models
from django.db.models import Count, Sum
from django.core.exceptions import ValidationError
from .models import Order, OrderItem
from .serializers import (
    OrderSerializer, 
    OrderDetailSerializer, 
    OrderCreateSerializer, 
    AdminOrderSerializer,
    OrderStatusUpdateSerializer
)
from .utils import OrderManager
from products.models import InsufficientStockError
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
        """Create order with stock validation"""
        try:
            # Extract items data from the request
            items_data = self.request.data.get('items', [])
            shipping_address = serializer.validated_data.get('shipping_address')
            shipping_method = serializer.validated_data.get('shipping_method', 'standard')
            
            # Use OrderManager to create order with stock validation
            order = OrderManager.create_order(
                user=self.request.user,
                items_data=items_data,
                shipping_address=shipping_address,
                shipping_method=shipping_method
            )
            
            # Set the created order in the serializer
            serializer.instance = order
            
        except InsufficientStockError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except ValidationError as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


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
    cart_items = CartItem.objects.filter(cart__user=user)
    
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
    Get user's order history with pagination and pending payment info
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


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def cancel_order(request, order_id):
    """
    Cancel an order and restore stock
    """
    try:
        order = get_object_or_404(Order, id=order_id, user=request.user)
        
        # Use OrderManager to cancel order with stock restoration
        OrderManager.cancel_order(order)
        
        return Response({
            'message': f'Order {order_id} has been cancelled successfully',
            'order_id': order_id,
            'status': 'cancelled'
        })
        
    except ValidationError as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to cancel order: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['PUT'])
@permission_classes([permissions.IsAuthenticated])
def update_order_item_quantity(request, order_id, item_id):
    """
    Update the quantity of an order item with stock validation
    """
    try:
        order = get_object_or_404(Order, id=order_id, user=request.user)
        order_item = get_object_or_404(OrderItem, id=item_id, order=order)
        
        new_quantity = request.data.get('quantity')
        if not new_quantity or new_quantity <= 0:
            return Response(
                {'error': 'Quantity must be a positive integer'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Use OrderManager to update quantity with stock validation
        OrderManager.update_order_quantity(order_item, new_quantity)
        
        # Refresh the order item and return updated data
        order_item.refresh_from_db()
        return Response({
            'message': 'Order item quantity updated successfully',
            'order_id': order_id,
            'item_id': item_id,
            'new_quantity': order_item.quantity,
            'total_price': float(order_item.total_price)
        })
        
    except InsufficientStockError as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except ValidationError as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'Failed to update order item: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def stock_monitoring(request):
    """
    Get stock monitoring information for admin
    """
    try:
        threshold = int(request.GET.get('threshold', 10))
        
        # Get stock information using OrderManager utilities
        low_stock_products = OrderManager.get_low_stock_products(threshold)
        out_of_stock_products = OrderManager.get_out_of_stock_products()
        
        # Serialize the data
        low_stock_data = [
            {
                'id': product.id,
                'name': product.name,
                'stock': product.stock,
                'category': product.category.name,
                'price': float(product.price)
            }
            for product in low_stock_products
        ]
        
        out_of_stock_data = [
            {
                'id': product.id,
                'name': product.name,
                'category': product.category.name,
                'price': float(product.price),
                'sold': product.sold
            }
            for product in out_of_stock_products
        ]
        
        return Response({
            'threshold': threshold,
            'low_stock_products': low_stock_data,
            'out_of_stock_products': out_of_stock_data,
            'low_stock_count': len(low_stock_data),
            'out_of_stock_count': len(out_of_stock_data)
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to retrieve stock information: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_order_payment_status(request, order_id):
    """
    Update order payment status and change status to processing
    """
    try:
        order = get_object_or_404(Order, id=order_id, user=request.user)
        
        # Check if order is in correct status
        if order.status != 'pending':
            return Response(
                {'error': f'Cannot update payment for order with status: {order.status}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update order to processing and mark as paid
        order.status = 'processing'
        order.is_paid = True
        order.save(update_fields=['status', 'is_paid'])
        
        serializer = OrderSerializer(order)
        return Response({
            'message': 'Payment successful. Order is now being processed.',
            'order': serializer.data
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to update payment status: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def validate_cart_stock(request):
    """
    Validate stock availability for items in user's cart before checkout
    """
    try:
        items_data = request.data.get('items', [])
        
        if not items_data:
            return Response(
                {'error': 'No items provided for validation'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate stock using OrderManager
        try:
            validated_items = OrderManager.validate_order_items(items_data)
            
            return Response({
                'valid': True,
                'message': 'All items are available in stock',
                'validated_items': [
                    {
                        'product_id': item['product'].id,
                        'product_name': item['product'].name,
                        'requested_quantity': item['quantity'],
                        'available_stock': item['product'].stock,
                        'price': float(item['price'])
                    }
                    for item in validated_items
                ]
            })
            
        except (InsufficientStockError, ValidationError) as e:
            return Response({
                'valid': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to validate cart: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        
class CancelOrderView(generics.GenericAPIView):
    """
    POST: Cancel an order and restore stock - Frontend optimized
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    lookup_url_kwarg = 'order_id'
    
    def get_object(self):
        order_id = self.kwargs.get(self.lookup_url_kwarg)
        return get_object_or_404(Order, id=order_id, user=self.request.user)
    
    def post(self, request, *args, **kwargs):
        """Cancel the order"""
        try:
            order = self.get_object()
            
            # Check if order can be cancelled
            if order.status not in ['pending', 'processing']:
                return Response({
                    'success': False,
                    'error': f'Cannot cancel order with status: {order.status}. Only pending or processing orders can be cancelled.',
                    'current_status': order.status,
                    'order_id': order.id
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Store original status for response
            original_status = order.status
            
            # Check pending payments before cancellation
            from payments.models import PaymentTransaction
            pending_payments = PaymentTransaction.objects.filter(
                order=order, 
                status='pending'
            )
            pending_payments_count = pending_payments.count()
            
            # Use OrderManager to cancel order with stock restoration and payment cancellation
            OrderManager.cancel_order(order)
            
            # Return detailed response for frontend
            return Response({
                'success': True,
                'message': 'Order cancelled successfully',
                'data': {
                    'order_id': order.id,
                    'previous_status': original_status,
                    'current_status': 'cancelled',
                    'total_refund': float(order.total),
                    'cancelled_at': order.updated_at.isoformat() if hasattr(order, 'updated_at') else None,
                    'items_count': order.items.count(),
                    'payments_cancelled': pending_payments_count
                }
            }, status=status.HTTP_200_OK)
            
        except ValidationError as e:
            return Response({
                'success': False,
                'error': str(e),
                'order_id': kwargs.get('order_id')
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to cancel order: {str(e)}',
                'order_id': kwargs.get('order_id')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
class CheckCancelOrderView(generics.RetrieveAPIView):
    """
    GET: Check if an order can be cancelled - Helper endpoint for frontend
    """
    permission_classes = [permissions.IsAuthenticated]
    lookup_url_kwarg = 'order_id'
    
    def get_object(self):
        """Get the order for the authenticated user"""
        order_id = self.kwargs.get(self.lookup_url_kwarg)
        return get_object_or_404(Order, id=order_id, user=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        """Check cancellation eligibility"""
        try:
            order = self.get_object()
            
            can_cancel = order.status in ['pending', 'processing']
            
            return Response({
                'can_cancel': can_cancel,
                'order_id': order.id,
                'current_status': order.status,
                'reason': 'Order can be cancelled' if can_cancel else f'Cannot cancel order with status: {order.status}',
                'order_details': {
                    'total': float(order.total),
                    'date': order.date.isoformat(),
                    'items_count': order.items.count()
                }
            })
        except Exception as e:
            return Response({
                'error': f'Failed to check cancellation status: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OrderCancellationView(generics.GenericAPIView):
    """
    Combined view for order cancellation operations
    GET: Check if order can be cancelled
    POST: Cancel the order
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    lookup_url_kwarg = 'order_id'
    
    def get_object(self):
        """Get the order for the authenticated user"""
        order_id = self.kwargs.get(self.lookup_url_kwarg)
        return get_object_or_404(Order, id=order_id, user=self.request.user)
    
    def get(self, request, *args, **kwargs):
        """Check if order can be cancelled"""
        try:
            order = self.get_object()
            
            can_cancel = order.status in ['pending', 'processing']
            
            return Response({
                'can_cancel': can_cancel,
                'order_id': order.id,
                'current_status': order.status,
                'reason': 'Order can be cancelled' if can_cancel else f'Cannot cancel order with status: {order.status}',
                'order_details': {
                    'total': float(order.total),
                    'date': order.date.isoformat(),
                    'items_count': order.items.count(),
                    'customer': order.user.username
                }
            })
            
        except Exception as e:
            return Response({
                'error': f'Failed to check cancellation status: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request, *args, **kwargs):
        """Cancel the order"""
        try:
            order = self.get_object()
            
            # Check if order can be cancelled
            if order.status not in ['pending', 'processing']:
                return Response({
                    'success': False,
                    'error': f'Cannot cancel order with status: {order.status}. Only pending or processing orders can be cancelled.',
                    'current_status': order.status,
                    'order_id': order.id
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Store original status for response
            original_status = order.status
            
            # Use OrderManager to cancel order with stock restoration
            OrderManager.cancel_order(order)
            
            # Return detailed response for frontend
            return Response({
                'success': True,
                'message': 'Order cancelled successfully',
                'data': {
                    'order_id': order.id,
                    'previous_status': original_status,
                    'current_status': 'cancelled',
                    'total_refund': float(order.total),
                    'cancelled_at': order.updated_at.isoformat() if hasattr(order, 'updated_at') else None,
                    'items_count': order.items.count()
                }
            }, status=status.HTTP_200_OK)
            
        except ValidationError as e:
            return Response({
                'success': False,
                'error': str(e),
                'order_id': order.id
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Failed to cancel order: {str(e)}',
                'order_id': kwargs.get('order_id')
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)