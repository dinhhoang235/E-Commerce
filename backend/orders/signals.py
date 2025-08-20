from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.db import transaction
from .models import Order, OrderItem
from products.models import ProductVariant, InsufficientStockError


@receiver(post_save, sender=OrderItem)
def update_stock_on_order_item_create(sender, instance, created, **kwargs):
    """
    Update product variant stock when an OrderItem is created or updated.
    This handles stock reduction when items are added to orders.
    """
    if created:
        # Only reduce stock for new order items
        try:
            with transaction.atomic():
                product_variant = ProductVariant.objects.select_for_update().get(id=instance.product_variant.id)
                product_variant.reduce_stock(instance.quantity)
        except InsufficientStockError as e:
            # Log the error or handle it appropriately
            # For now, we'll let it pass but in production you might want to
            # prevent the order creation or handle this differently
            print(f"Stock warning: {e}")


@receiver(post_delete, sender=OrderItem)
def restore_stock_on_order_item_delete(sender, instance, **kwargs):
    """
    Restore product variant stock when an OrderItem is deleted.
    """
    try:
        with transaction.atomic():
            product_variant = ProductVariant.objects.select_for_update().get(id=instance.product_variant.id)
            product_variant.increase_stock(instance.quantity)
    except ProductVariant.DoesNotExist:
        # Product variant might have been deleted
        pass


@receiver(pre_save, sender=Order)
def track_order_status_change(sender, instance, **kwargs):
    """
    Track the previous status of an order before it's saved.
    """
    if instance.pk:  # Only for existing orders
        try:
            old_order = Order.objects.get(pk=instance.pk)
            instance._previous_status = old_order.status
        except Order.DoesNotExist:
            instance._previous_status = None
    else:
        instance._previous_status = None


@receiver(post_save, sender=Order)
def handle_order_status_change(sender, instance, created, **kwargs):
    """
    Handle stock adjustments based on order status changes.
    """
    if not created and hasattr(instance, '_previous_status'):  # Only for existing orders that are being updated
        previous_status = instance._previous_status
        current_status = instance.status
        
        # Case 1: Order cancelled - restore stock
        if current_status == 'cancelled' and previous_status != 'cancelled':
            for item in instance.items.all():
                try:
                    with transaction.atomic():
                        product_variant = ProductVariant.objects.select_for_update().get(id=item.product_variant.id)
                        product_variant.increase_stock(item.quantity)
                        print(f"🔄 Order {instance.id} cancelled: Restored {item.quantity} units of {product_variant}")
                except ProductVariant.DoesNotExist:
                    continue
        
        # Case 2: Order un-cancelled (cancelled → any other status) - reduce stock again
        elif previous_status == 'cancelled' and current_status != 'cancelled':
            for item in instance.items.all():
                try:
                    with transaction.atomic():
                        product_variant = ProductVariant.objects.select_for_update().get(id=item.product_variant.id)
                        product_variant.reduce_stock(item.quantity)
                        print(f"🔄 Order {instance.id} un-cancelled: Reserved {item.quantity} units of {product_variant}")
                except (ProductVariant.DoesNotExist, Exception) as e:
                    print(f"⚠️ Could not reserve stock for {item.product_variant}: {e}")
                    continue
        
        # Case 3: Other status changes (pending → processing → shipped → completed)
        # These should NOT change stock as it was already reduced when order was created
        # This is CORRECT behavior - completed orders should keep stock reduced


def validate_stock_before_order(order_items):
    """
    Utility function to validate stock availability before creating an order.
    Call this before creating OrderItems to ensure stock availability.
    
    Args:
        order_items: List of dictionaries with 'product_variant' and 'quantity' keys
        
    Returns:
        bool: True if all items are available, False otherwise
        
    Raises:
        InsufficientStockError: If any product variant has insufficient stock
    """
    with transaction.atomic():
        for item in order_items:
            product_variant = ProductVariant.objects.select_for_update().get(id=item['product_variant'].id)
            if not product_variant.check_stock_availability(item['quantity']):
                raise InsufficientStockError(
                    f"Insufficient stock for {product_variant}. "
                    f"Available: {product_variant.stock}, Requested: {item['quantity']}"
                )
    return True


def create_order_with_stock_validation(user, order_items_data, **order_kwargs):
    """
    Create an order with automatic stock validation and reduction.
    
    Args:
        user: User creating the order
        order_items_data: List of dicts with 'product_variant', 'quantity', 'price' keys
        **order_kwargs: Additional order fields
        
    Returns:
        Order: The created order
        
    Raises:
        InsufficientStockError: If any product variant has insufficient stock
    """
    # First validate all stock availability
    validate_stock_before_order([
        {'product_variant': item['product_variant'], 'quantity': item['quantity']} 
        for item in order_items_data
    ])
    
    # Create the order
    order = Order.objects.create(user=user, **order_kwargs)
    
    # Create order items (stock will be reduced automatically by signals)
    for item_data in order_items_data:
        OrderItem.objects.create(
            order=order,
            product_variant=item_data['product_variant'],
            quantity=item_data['quantity'],
            price=item_data['price']
        )
    
    return order
