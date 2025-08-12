"""
Order management utilities for handling stock and order operations.
"""
from django.db import transaction
from django.core.exceptions import ValidationError
from .models import Order, OrderItem
from products.models import Product, InsufficientStockError
import uuid
from decimal import Decimal


class OrderManager:
    """
    Utility class for managing order operations with stock control.
    """
    
    @staticmethod
    def generate_order_id():
        """Generate a unique order ID"""
        return f"ORD-{uuid.uuid4().hex[:8].upper()}"
    
    @staticmethod
    def validate_order_items(items_data):
        """
        Validate that all items in the order have sufficient stock.
        
        Args:
            items_data: List of dicts with 'product_id', 'quantity' keys
            
        Returns:
            List of validated Product objects and quantities
            
        Raises:
            ValidationError: If any validation fails
            InsufficientStockError: If insufficient stock
        """
        validated_items = []
        
        for item in items_data:
            try:
                product = Product.objects.get(id=item['product_id'])
            except Product.DoesNotExist:
                raise ValidationError(f"Product with ID {item['product_id']} not found")
            
            quantity = item['quantity']
            if quantity <= 0:
                raise ValidationError(f"Quantity must be positive for {product.name}")
            
            if not product.check_stock_availability(quantity):
                raise InsufficientStockError(
                    f"Insufficient stock for {product.name}. "
                    f"Available: {product.stock}, Requested: {quantity}"
                )
            
            validated_items.append({
                'product': product,
                'quantity': quantity,
                'price': product.price
            })
        
        return validated_items
    
    @staticmethod
    def create_order(user, items_data, shipping_address=None, shipping_method='standard'):
        """
        Create a new order with stock validation and automatic stock reduction.
        
        Args:
            user: User creating the order
            items_data: List of dicts with 'product_id', 'quantity' keys
            shipping_address: Address object (optional)
            shipping_method: Shipping method choice
            
        Returns:
            Order: The created order
            
        Raises:
            ValidationError: If validation fails
            InsufficientStockError: If insufficient stock
        """
        # Validate all items first
        validated_items = OrderManager.validate_order_items(items_data)
        
        # Calculate total
        total = sum(Decimal(str(item['price'])) * item['quantity'] for item in validated_items)
        
        # Create order with atomic transaction
        with transaction.atomic():
            # Generate unique order ID
            order_id = OrderManager.generate_order_id()
            while Order.objects.filter(id=order_id).exists():
                order_id = OrderManager.generate_order_id()
            
            # Create the order
            order = Order.objects.create(
                id=order_id,
                user=user,
                shipping_address=shipping_address,
                shipping_method=shipping_method,
                total=total,
                status='pending'
            )
            
            # Create order items (stock will be reduced by signals)
            for item in validated_items:
                OrderItem.objects.create(
                    order=order,
                    product=item['product'],
                    quantity=item['quantity'],
                    price=item['price']
                )
        
        return order
    
    @staticmethod
    def update_order_quantity(order_item, new_quantity):
        """
        Update the quantity of an order item with stock validation.
        
        Args:
            order_item: OrderItem instance
            new_quantity: New quantity
            
        Returns:
            bool: True if successful
            
        Raises:
            ValidationError: If validation fails
            InsufficientStockError: If insufficient stock
        """
        if new_quantity <= 0:
            raise ValidationError("Quantity must be positive")
        
        old_quantity = order_item.quantity
        quantity_diff = new_quantity - old_quantity
        
        with transaction.atomic():
            product = Product.objects.select_for_update().get(id=order_item.product.id)
            
            if quantity_diff > 0:
                # Increasing quantity - check stock availability
                if not product.check_stock_availability(quantity_diff):
                    raise InsufficientStockError(
                        f"Insufficient stock for {product.name}. "
                        f"Available: {product.stock}, Additional needed: {quantity_diff}"
                    )
                product.reduce_stock(quantity_diff)
            elif quantity_diff < 0:
                # Decreasing quantity - restore stock
                product.increase_stock(abs(quantity_diff))
            
            # Update order item
            order_item.quantity = new_quantity
            order_item.save()
            
            # Update order total
            order_item.order.total = order_item.order.calculate_total()
            order_item.order.save(update_fields=['total'])
        
        return True
    
    @staticmethod
    def cancel_order(order):
        """
        Cancel an order and restore stock for all items.
        Also cancels associated payments if they are pending or processes actual refunds if they were successful.
        
        Args:
            order: Order instance
            
        Returns:
            bool: True if successful
            
        Raises:
            ValidationError: If order cannot be cancelled
        """
        print(f"DEBUG: Attempting to cancel order {order.id}, current status: {order.status}")
        print(f"DEBUG: Order can_be_cancelled: {order.can_be_cancelled}")
        
        if not order.can_be_cancelled:
            raise ValidationError(f"Cannot cancel order {order.id} with status: {order.status}")
        
        with transaction.atomic():
            # Store the original status for debugging
            original_status = order.status
            
            # Set status to cancelled (signals will handle stock restoration)
            order.status = 'cancelled'
            order.save(update_fields=['status'])
            
            # Handle associated payments based on their current status
            from payments.models import PaymentTransaction
            
            # Cancel pending payments
            pending_payments = PaymentTransaction.objects.filter(
                order=order, 
                status='pending'
            )
            
            for payment in pending_payments:
                payment.status = 'canceled'
                payment.save(update_fields=['status'])
                print(f"DEBUG: Payment {payment.id} status changed to canceled for order {order.id}")
            
            # Process actual refunds for successful payments (for processing orders that are being cancelled)
            successful_payments = PaymentTransaction.objects.filter(
                order=order, 
                status='success'
            )
            
            refund_results = []
            for payment in successful_payments:
                # Import the refund function from payments.views
                from payments.views import process_refund_for_cancelled_order
                
                # Process actual refund through Stripe
                refund_result = process_refund_for_cancelled_order(
                    order, 
                    refund_reason=f"Order {order.id} cancelled by customer"
                )
                refund_results.append(refund_result)
                
                if refund_result['success'] and refund_result.get('refund_processed'):
                    print(f"DEBUG: Payment {payment.id} successfully refunded through Stripe for order {order.id}")
                elif refund_result['success'] and refund_result.get('marked_as_refunded'):
                    print(f"DEBUG: Payment {payment.id} marked as refunded (no Stripe processing) for order {order.id}")
                else:
                    print(f"DEBUG: Payment {payment.id} refund failed for order {order.id}: {refund_result.get('error', 'Unknown error')}")
            
            successful_refunds = sum(1 for result in refund_results if result['success'] and result.get('refund_processed'))
            marked_refunds = sum(1 for result in refund_results if result['success'] and result.get('marked_as_refunded'))
            failed_refunds = sum(1 for result in refund_results if not result['success'])
            
            print(f"DEBUG: Order {order.id} status changed from {original_status} to {order.status}")
            print(f"DEBUG: Cancelled {pending_payments.count()} pending payments for order {order.id}")
            print(f"DEBUG: Processed {successful_refunds} successful refunds, {marked_refunds} marked refunds, {failed_refunds} failed refunds for order {order.id}")
        
        return True
    
    @staticmethod
    def get_low_stock_products(threshold=10):
        """
        Get products with stock below the threshold.
        
        Args:
            threshold: Stock threshold
            
        Returns:
            QuerySet: Products with low stock
        """
        return Product.objects.filter(stock__lt=threshold, is_in_stock=True)
    
    @staticmethod
    def get_out_of_stock_products():
        """
        Get products that are out of stock.
        
        Returns:
            QuerySet: Out of stock products
        """
        return Product.objects.filter(stock=0, is_in_stock=False)
