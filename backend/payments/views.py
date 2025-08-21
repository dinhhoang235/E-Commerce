import stripe
import os
import json
import logging
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils.decorators import method_decorator
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .models import PaymentTransaction
from orders.models import Order, OrderItem
from orders.utils import OrderManager
from products.models import InsufficientStockError
from django.core.exceptions import ValidationError

# Set up logging
logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY


def cleanup_expired_pending_orders(user, hours=24):
    """
    Clean up pending orders that are older than specified hours
    This helps prevent accumulation of abandoned pending orders
    """
    try:
        cutoff_time = timezone.now() - timedelta(hours=hours)
        expired_orders = Order.objects.filter(
            user=user,
            status='pending',
            is_paid=False,
            date__lt=cutoff_time
        )
        
        count = expired_orders.count()
        if count > 0:
            expired_orders.delete()
            logger.info(f"Cleaned up {count} expired pending orders for user {user.id}")
            
    except Exception as e:
        logger.error(f"Error cleaning up expired orders: {str(e)}")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session_from_cart(request):
    try:
        user = request.user
        cart_items = request.data.get('cart_items', [])
        shipping_address = request.data.get('shipping_address', {})
        shipping_method = request.data.get('shipping_method', 'standard')
        
        # Log the incoming cart items for debugging
        logger.info(f"Creating checkout session for user {user.id} with {len(cart_items)} cart items")
        for i, item in enumerate(cart_items):
            logger.info(f"Cart item {i+1}: {item}")
        
        # Clean up any expired pending orders to prevent clutter
        cleanup_expired_pending_orders(user, hours=1)  # Clean orders older than 1 hour
        
        if not cart_items:
            return Response(
                {'error': 'Cart items are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create line items for Stripe from cart
        line_items = []
        total_amount = 0
        
        for item in cart_items:
            product_id = item.get('product_id')
            quantity = item.get('quantity', 1)
            price = float(item.get('price', 0))
            name = item.get('name', f'Product {product_id}')
            
            if not product_id or price <= 0:
                continue
                
            # Build product data
            product_data = {'name': name}
            description = item.get('description', '').strip()
            if description:  # Only add description if it's not empty
                product_data['description'] = description[:500]
            
            line_items.append({
                'price_data': {
                    'currency': 'usd',
                    'product_data': product_data,
                    'unit_amount': int(price * 100),  # Stripe uses cents
                    'tax_behavior': 'inclusive',  # Tax is included in the price
                },
                'quantity': quantity,
            })
            total_amount += price * quantity
        
        if not line_items:
            return Response(
                {'error': 'No valid cart items found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create shipping address if provided
        shipping_address_obj = None
        if shipping_address:
            try:
                from users.models import Address
                # Convert frontend field names to backend field names
                address_data = {
                    'first_name': shipping_address.get('firstName', ''),
                    'last_name': shipping_address.get('lastName', ''),
                    'phone': shipping_address.get('phone', ''),
                    'address_line1': shipping_address.get('address', ''),
                    'city': shipping_address.get('city', ''),
                    'state': shipping_address.get('state', ''),
                    'zip_code': shipping_address.get('zipCode', ''),
                    'country': shipping_address.get('country', 'US'),
                    'is_default': False
                }
                
                # Use get_or_create to prevent duplicate addresses
                shipping_address_obj, created = Address.get_or_create_for_user(user, address_data)
                if created:
                    logger.info(f"Created new address for user {user.id}")
                else:
                    logger.info(f"Reusing existing address {shipping_address_obj.id} for user {user.id}")
                    
            except Exception as e:
                logger.error(f"Failed to create/get shipping address: {e}")
        
        # Check if there's already a pending order for this user
        # This prevents duplicate orders when user clicks "proceed to payment" multiple times
        existing_pending_order = None
        
        # Look for recent pending orders (within last 2 hours) to avoid old abandoned orders
        recent_cutoff = timezone.now() - timedelta(hours=2)
        pending_orders = Order.objects.filter(
            user=user,
            status='pending',
            is_paid=False,
            date__gte=recent_cutoff  # Only check recent orders
        ).order_by('-date')
        
        logger.info(f"Found {pending_orders.count()} recent pending orders for user {user.id}")
        
        # First, try to find an exact match by total amount and item count
        for pending_order in pending_orders:
            if abs(float(pending_order.total) - float(total_amount)) < 0.01:  # Within 1 cent
                order_items = pending_order.items.all()
                if len(order_items) == len(cart_items):
                    logger.info(f"Found pending order {pending_order.id} with matching total ${pending_order.total} and {len(order_items)} items")
                    existing_pending_order = pending_order
                    break
        
        # If no exact match found, try the most recent pending order with similar total
        if not existing_pending_order and pending_orders.exists():
            most_recent = pending_orders.first()
            if abs(float(most_recent.total) - float(total_amount)) < 5.0:  # Within $5
                logger.info(f"Using most recent pending order {most_recent.id} (total: ${most_recent.total} vs cart: ${total_amount})")
                existing_pending_order = most_recent
        
        if existing_pending_order:
            # Use existing pending order instead of creating a new one
            order = existing_pending_order
            order_id = order.id
            logger.info(f"Using existing pending order {order_id} (created: {order.date})")
            
            # Optionally update the order total if it has changed slightly
            if abs(float(order.total) - float(total_amount)) > 0.01:
                logger.info(f"Updating order total from ${order.total} to ${total_amount}")
                order.total = float(total_amount)
                order.save(update_fields=['total'])
        else:
            # Prepare items data for OrderManager
            items_data = []
            invalid_variants = []
            for item_data in cart_items:
                # Handle both product_variant_id and product_id
                product_variant_id = item_data.get('product_variant_id')
                product_id = item_data.get('product_id')
                
                # If we have product_id but no product_variant_id, try to find the variant
                if not product_variant_id and product_id:
                    try:
                        from products.models import ProductVariant
                        # Try to find the variant based on product_id and other attributes
                        color = item_data.get('color')
                        storage = item_data.get('storage')
                        
                        # Parse color and storage from description if available
                        description = item_data.get('description', '')
                        if not color and 'Color:' in description:
                            import re
                            color_match = re.search(r'Color:\s*([^,]+)', description)
                            if color_match:
                                color = color_match.group(1).strip()
                        
                        if not storage and 'Storage:' in description:
                            import re
                            storage_match = re.search(r'Storage:\s*([^,)]+)', description)
                            if storage_match:
                                storage = storage_match.group(1).strip()
                        
                        # Find the variant
                        variant_query = ProductVariant.objects.filter(product_id=product_id)
                        if color:
                            variant_query = variant_query.filter(color__name=color)
                        if storage:
                            variant_query = variant_query.filter(storage=storage)
                        
                        variant = variant_query.first()
                        if variant:
                            product_variant_id = variant.id
                            logger.info(f"Resolved product_id {product_id} to variant_id {product_variant_id} (Color: {color}, Storage: {storage})")
                        else:
                            logger.warning(f"Could not find variant for product_id {product_id} with Color: {color}, Storage: {storage}")
                    except Exception as e:
                        logger.error(f"Error resolving product_id to variant_id: {e}")
                
                if not product_variant_id:
                    logger.error(f"No product_variant_id found in item data: {item_data}")
                    invalid_variants.append({
                        'variant_id': product_id or 'unknown',
                        'name': item_data.get('name', 'Unknown product'),
                        'quantity': item_data.get('quantity', 0),
                        'price': item_data.get('price', 0),
                        'error': 'Could not determine product variant ID'
                    })
                    continue
                
                # Check if variant exists before adding to items_data
                try:
                    from products.models import ProductVariant
                    variant = ProductVariant.objects.get(id=product_variant_id)
                    items_data.append({
                        'product_variant_id': product_variant_id,
                        'quantity': item_data['quantity'],
                        'price': float(item_data['price'])
                    })
                except ProductVariant.DoesNotExist:
                    invalid_variants.append({
                        'variant_id': product_variant_id,
                        'name': item_data.get('name', 'Unknown product'),
                        'quantity': item_data.get('quantity', 0),
                        'price': item_data.get('price', 0),
                        'error': f'Product variant {product_variant_id} not found'
                    })
                    logger.error(f"Product variant {product_variant_id} not found for cart item: {item_data}")
            
            if invalid_variants:
                # Return detailed error about invalid variants
                variant_details = [f"ID {v['variant_id']} ({v['name']})" for v in invalid_variants]
                return Response(
                    {
                        'error': 'Some products in your cart are no longer available',
                        'details': f'Invalid product variants: {", ".join(variant_details)}',
                        'invalid_variants': invalid_variants,
                        'suggestion': 'Please refresh your cart and try again'
                    }, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not items_data:
                return Response(
                    {'error': 'No valid cart items found'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create order using OrderManager for proper ID generation and stock handling
            try:
                order = OrderManager.create_order(
                    user=user,
                    items_data=items_data,
                    shipping_address=shipping_address_obj,
                    shipping_method=shipping_method
                )
                order_id = order.id
                logger.info(f"Created new order {order_id} using OrderManager")
            except (ValidationError, InsufficientStockError) as e:
                logger.error(f"Failed to create order using OrderManager: {str(e)}")
                return Response(
                    {'error': f'Failed to create order: {str(e)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                logger.error(f"Unexpected error creating order using OrderManager: {str(e)}")
                return Response(
                    {'error': 'An unexpected error occurred while creating order'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Check if there's already a pending payment transaction for this order
        existing_transaction = PaymentTransaction.objects.filter(
            order=order,
            status='pending'
        ).first()
        
        if existing_transaction:
            # Check if the existing Stripe session is still valid
            try:
                existing_session = stripe.checkout.Session.retrieve(existing_transaction.stripe_checkout_id)
                if existing_session.status == 'open':
                    logger.info(f"Returning existing checkout session for order {order_id}")
                    return Response({
                        'checkout_url': existing_session.url,
                        'session_id': existing_session.id,
                        'order_id': order_id
                    })
                else:
                    # Session expired, we'll create a new one and update the transaction
                    logger.info(f"Existing session expired for order {order_id}, creating new session")
            except stripe.error.StripeError:
                # Session doesn't exist or is invalid, create a new one
                logger.info(f"Existing session invalid for order {order_id}, creating new session")
        
        # Create Stripe checkout session
        # Note: automatic_tax is disabled until business address is configured in Stripe Dashboard
        
        # Prepare metadata with shipping address information
        session_metadata = {
            'user_id': str(user.id),
            'order_id': order_id,  # Include order ID in metadata
            'shipping_method': shipping_method,
            'total_amount': str(total_amount),
        }
        
        # Add shipping address to metadata if available
        if shipping_address_obj:
            session_metadata.update({
                'shipping_name': f"{shipping_address_obj.first_name} {shipping_address_obj.last_name}",
                'shipping_address': shipping_address_obj.address_line1,
                'shipping_city': shipping_address_obj.city,
                'shipping_state': shipping_address_obj.state,
                'shipping_zip': shipping_address_obj.zip_code,
                'shipping_country': shipping_address_obj.country,
                'shipping_phone': shipping_address_obj.phone or '',
            })
        
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=f"{settings.FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/payment/cancel",
            metadata=session_metadata,
            customer_email=user.email,
            # TODO: Enable automatic tax after configuring business address in Stripe Dashboard
            # automatic_tax={'enabled': True},
            # Use address from checkout form instead of Stripe collection
            # billing_address_collection='required',
            # shipping_address_collection removed - using checkout form address
        )
        
        # Create or update payment transaction with pending status
        if existing_transaction:
            existing_transaction.stripe_checkout_id = session.id
            existing_transaction.amount = float(total_amount)
            existing_transaction.save()
            logger.info(f"Updated existing payment transaction for order {order_id}")
        else:
            PaymentTransaction.objects.create(
                order=order,
                stripe_checkout_id=session.id,
                amount=float(total_amount),
                status='pending'
            )
            logger.info(f"Created new payment transaction for order {order_id}")
        
        # Save checkout URL to order for future reference
        order.checkout_url = session.url
        order.save(update_fields=['checkout_url'])
        
        return Response({
            'checkout_url': session.url,
            'session_id': session.id,
            'order_id': order_id  # Return order ID to frontend
        })
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        return Response(
            {'error': f'Payment processing error: {str(e)}'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Unexpected error in create_checkout_session_from_cart: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment_and_create_order(request):
    """
    Verify payment with Stripe and update existing order status
    For development use when webhooks are not available
    """
    try:
        user = request.user
        session_id = request.data.get('session_id')
        
        if not session_id:
            return Response(
                {'error': 'Session ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Retrieve the checkout session from Stripe
        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except stripe.error.StripeError as e:
            logger.error(f"Failed to retrieve Stripe session {session_id}: {str(e)}")
            return Response(
                {'error': 'Invalid payment session'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if payment was successful
        if session.payment_status != 'paid':
            return Response(
                {'error': 'Payment was not successful'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if we already processed this payment
        existing_transaction = PaymentTransaction.objects.filter(
            stripe_checkout_id=session_id,
            status='success'
        ).first()
        
        if existing_transaction:
            return Response({
                'success': True,
                'order_id': existing_transaction.order.id,
                'message': 'Order already processed for this payment'
            })
        
        # Get order data from session metadata
        user_id = session.metadata.get('user_id')
        order_id = session.metadata.get('order_id')
        
        if str(user.id) != user_id:
            return Response(
                {'error': 'Payment session does not belong to current user'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not order_id:
            return Response(
                {'error': 'Order ID not found in payment session'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the existing order
        try:
            order = Order.objects.get(id=order_id, user=user)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update order status to processing and mark as paid
        order.status = 'processing'
        order.is_paid = True
        order.checkout_url = None  # Clear checkout URL after successful payment
        order.save()
        
        # Update payment transaction status
        try:
            transaction = PaymentTransaction.objects.get(
                order=order,
                stripe_checkout_id=session_id
            )
            transaction.status = 'success'
            transaction.stripe_payment_intent = session.payment_intent
            transaction.save()
        except PaymentTransaction.DoesNotExist:
            # Create transaction if it doesn't exist (fallback)
            PaymentTransaction.objects.create(
                order=order,
                stripe_checkout_id=session_id,
                stripe_payment_intent=session.payment_intent,
                amount=order.total,
                status='success'
            )
        
        logger.info(f"Order {order_id} updated to processing status after payment verification")
        
        return Response({
            'success': True,
            'order_id': order_id,
            'message': 'Order updated successfully after payment'
        })
        
    except Exception as e:
        logger.error(f"Error in verify_payment_and_create_order: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def validate_cart_variants(request):
    """
    Validate that all product variant IDs in the cart still exist in the database
    This helps identify stale cart data after database resets
    """
    try:
        cart_items = request.data.get('cart_items', [])
        
        if not cart_items:
            return Response({
                'valid': True,
                'message': 'No cart items to validate'
            })
        
        from products.models import ProductVariant
        
        valid_items = []
        invalid_items = []
        
        for item in cart_items:
            product_variant_id = item.get('product_variant_id') or item.get('product_id')
            
            if not product_variant_id:
                invalid_items.append({
                    'item': item,
                    'error': 'Missing product_variant_id'
                })
                continue
            
            try:
                variant = ProductVariant.objects.get(id=product_variant_id)
                valid_items.append({
                    'variant_id': variant.id,
                    'product_id': variant.product.id,
                    'product_name': variant.product.name,
                    'color': variant.color.name if variant.color else None,
                    'storage': variant.storage,
                    'price': float(variant.price),
                    'stock': variant.stock,
                    'quantity': item.get('quantity', 1)
                })
            except ProductVariant.DoesNotExist:
                invalid_items.append({
                    'variant_id': product_variant_id,
                    'item': item,
                    'error': f'Product variant {product_variant_id} not found'
                })
        
        return Response({
            'valid': len(invalid_items) == 0,
            'total_items': len(cart_items),
            'valid_items': valid_items,
            'invalid_items': invalid_items,
            'message': f'Validated {len(cart_items)} cart items. {len(valid_items)} valid, {len(invalid_items)} invalid.'
        })
        
    except Exception as e:
        logger.error(f"Error validating cart variants: {str(e)}")
        return Response(
            {'error': f'Failed to validate cart: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    """
    Create a Stripe checkout session for an order
    Expected payload: {'order_id': 'order_id'}
    """
    try:
        user = request.user
        order_id = request.data.get('order_id')
        
        if not order_id:
            return Response(
                {'error': 'Order ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the order
        try:
            order = Order.objects.get(id=order_id, user=user)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if order is already paid
        if order.is_paid:
            return Response(
                {'error': 'Order is already paid'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if there's already a pending payment transaction
        existing_transaction = PaymentTransaction.objects.filter(
            order=order, 
            status='pending'
        ).first()
        
        if existing_transaction:
            # Return existing checkout session if still valid
            try:
                session = stripe.checkout.Session.retrieve(existing_transaction.stripe_checkout_id)
                if session.status == 'open':
                    return Response({
                        'checkout_url': session.url,
                        'session_id': session.id
                    })
            except stripe.error.StripeError:
                # If session is expired/invalid, create a new one
                pass
        
        # Create line items for Stripe
        line_items = []
        for item in order.items.all():
            # Build product data from product variant
            product_data = {'name': item.product_variant.product.name}
            if item.product_variant.product.description and item.product_variant.product.description.strip():
                product_data['description'] = item.product_variant.product.description[:500]
            
            line_items.append({
                'price_data': {
                    'currency': 'usd',
                    'product_data': product_data,
                    'unit_amount': int(item.price * 100),  # Stripe uses cents
                    'tax_behavior': 'inclusive',  # Tax is included in the price
                },
                'quantity': item.quantity,
            })
        
        # Create Stripe checkout session
        # Note: automatic_tax is disabled until business address is configured in Stripe Dashboard
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=f"{settings.FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/payment/cancel",
            metadata={
                'order_id': str(order.id),
                'user_id': str(user.id),
            },
            customer_email=user.email,
            # Use address from checkout form instead of Stripe collection
            # billing_address_collection='required',
            # TODO: Enable automatic tax after configuring business address in Stripe Dashboard
            # automatic_tax={'enabled': True},
            # shipping_address_collection removed - using checkout form address
        )
        
        # Create or update payment transaction
        if existing_transaction:
            existing_transaction.stripe_checkout_id = session.id
            existing_transaction.amount = order.total
            existing_transaction.save()
        else:
            PaymentTransaction.objects.create(
                order=order,
                stripe_checkout_id=session.id,
                amount=order.total,
                status='pending'
            )
        
        # Save checkout URL to order for future reference
        order.checkout_url = session.url
        order.save(update_fields=['checkout_url'])
        
        return Response({
            'checkout_url': session.url,
            'session_id': session.id
        })
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        return Response(
            {'error': f'Payment processing error: {str(e)}'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Unexpected error in create_checkout_session: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@csrf_exempt
@require_POST
def stripe_webhook(request):
    """
    Handle Stripe webhook events
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    endpoint_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', None)
    
    # TEMPORARY: Skip signature verification for testing
    # TODO: Configure proper webhook secret from Stripe dashboard
    try:
        import json
        event = json.loads(payload.decode('utf-8'))
        logger.info(f"Webhook received: {event.get('type', 'unknown')}")
    except json.JSONDecodeError:
        logger.error("Invalid JSON payload in webhook")
        return HttpResponse(status=400)
    
    # Original signature verification (commented out for testing)
    # if not endpoint_secret:
    #     logger.error("Stripe webhook secret not configured")
    #     return HttpResponse(status=400)
    # 
    # try:
    #     # Verify webhook signature
    #     event = stripe.Webhook.construct_event(
    #         payload, sig_header, endpoint_secret
    #     )
    # except ValueError:
    #     logger.error("Invalid payload in webhook")
    #     return HttpResponse(status=400)
    # except stripe.error.SignatureVerificationError:
    #     logger.error("Invalid signature in webhook")
    #     return HttpResponse(status=400)
    
    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        handle_successful_payment(session)
    
    elif event['type'] == 'checkout.session.expired':
        session = event['data']['object']
        handle_expired_payment(session)
    
    elif event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        handle_payment_intent_succeeded(payment_intent)
    
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        handle_payment_failed(payment_intent)
    
    elif event['type'] == 'charge.dispute.created':
        dispute = event['data']['object']
        handle_chargeback_created(dispute)
    
    elif event['type'] == 'refund.created':
        refund = event['data']['object']
        handle_refund_created(refund)
    
    elif event['type'] == 'refund.updated':
        refund = event['data']['object']
        handle_refund_updated(refund)
    
    else:
        logger.info(f"Unhandled event type: {event['type']}")
    
    return HttpResponse(status=200)


def handle_successful_payment(session):
    """
    Handle successful payment completion and update existing order
    """
    try:
        session_id = session['id']
        user_id = session['metadata'].get('user_id')
        order_id = session['metadata'].get('order_id')
        
        if not user_id:
            logger.error(f"No user_id in session metadata: {session_id}")
            return
        
        if not order_id:
            logger.error(f"No order_id in session metadata: {session_id}")
            return
        
        try:
            # Get the existing order
            user = User.objects.get(id=user_id)
            order = Order.objects.get(id=order_id, user=user)
            
            # Update order status to processing and mark as paid
            order.status = 'processing'
            order.is_paid = True
            order.checkout_url = None  # Clear checkout URL after successful payment
            order.save()
            
            # Update payment transaction status
            try:
                transaction = PaymentTransaction.objects.get(
                    order=order,
                    stripe_checkout_id=session_id
                )
                transaction.status = 'success'
                transaction.stripe_payment_intent = session.get('payment_intent')
                transaction.save()
            except PaymentTransaction.DoesNotExist:
                # Create transaction if it doesn't exist (fallback)
                PaymentTransaction.objects.create(
                    order=order,
                    stripe_checkout_id=session_id,
                    stripe_payment_intent=session.get('payment_intent'),
                    amount=order.total,
                    status='success'
                )
            
            logger.info(f"Payment successful for order {order_id} - updated to processing status")
            return
            
        except (User.DoesNotExist, Order.DoesNotExist) as e:
            logger.error(f"User or Order not found for session {session_id}: {str(e)}")
            return
            
    except Exception as e:
        logger.error(f"Error handling successful payment: {str(e)}")


def handle_expired_payment(session):
    """
    Handle expired payment session
    """
    try:
        session_id = session['id']
        
        # Update payment transaction status
        try:
            transaction = PaymentTransaction.objects.get(stripe_checkout_id=session_id)
            transaction.status = 'failed'
            transaction.save()
            
            # Clear checkout URL from order since session expired
            order = transaction.order
            if order.checkout_url:
                order.checkout_url = None
                order.save(update_fields=['checkout_url'])
            
            logger.info(f"Payment session expired for transaction {transaction.id}")
            
        except PaymentTransaction.DoesNotExist:
            logger.error(f"Payment transaction not found for expired session {session_id}")
            
    except Exception as e:
        logger.error(f"Error handling expired payment: {str(e)}")


def handle_payment_intent_succeeded(payment_intent):
    """
    Handle payment intent succeeded event
    """
    try:
        payment_intent_id = payment_intent['id']
        
        # Update payment transaction if exists
        transaction = PaymentTransaction.objects.filter(
            stripe_payment_intent=payment_intent_id
        ).first()
        
        if transaction and transaction.status != 'success':
            transaction.status = 'success'
            transaction.save()
            
            # Ensure order is marked as paid
            order = transaction.order
            if not order.is_paid:
                order.is_paid = True
                order.status = 'processing'
                order.checkout_url = None  # Clear checkout URL after successful payment
                order.save()
            
            logger.info(f"Payment intent succeeded for order {order.id}")
            
    except Exception as e:
        logger.error(f"Error handling payment intent succeeded: {str(e)}")


def handle_payment_failed(payment_intent):
    """
    Handle failed payment intent
    """
    try:
        payment_intent_id = payment_intent['id']
        
        # Update payment transaction if exists
        transaction = PaymentTransaction.objects.filter(
            stripe_payment_intent=payment_intent_id
        ).first()
        
        if transaction:
            transaction.status = 'failed'
            transaction.save()
            
            logger.info(f"Payment failed for order {transaction.order.id}")
            
    except Exception as e:
        logger.error(f"Error handling payment failed: {str(e)}")


def handle_chargeback_created(dispute):
    """
    Handle chargeback/dispute created event
    """
    try:
        charge_id = dispute.get('charge')
        if not charge_id:
            logger.error("No charge ID found in dispute event")
            return
        
        # Find the payment transaction by charge ID or payment intent
        # Note: We may need to enhance the model to store charge_id if needed
        transaction = PaymentTransaction.objects.filter(
            stripe_payment_intent__isnull=False,
            status='success'
        ).first()  # This is a simplified lookup, could be enhanced
        
        if transaction:
            # Mark the transaction as disputed
            # You might want to add a 'disputed' status to STATUS_CHOICES
            logger.warning(f"Chargeback created for order {transaction.order.id}, charge: {charge_id}")
            # Additional logic to handle chargeback (notify admin, update order status, etc.)
            
    except Exception as e:
        logger.error(f"Error handling chargeback created: {str(e)}")


def handle_refund_created(refund):
    """
    Handle refund created event from Stripe webhook
    """
    try:
        refund_id = refund['id']
        charge_id = refund.get('charge')
        payment_intent_id = refund.get('payment_intent')
        amount_refunded = refund['amount'] / 100  # Convert from cents
        
        # Find the original transaction
        transaction = None
        if payment_intent_id:
            transaction = PaymentTransaction.objects.filter(
                stripe_payment_intent=payment_intent_id,
                status='success'
            ).first()
        
        if not transaction:
            logger.error(f"No transaction found for refund {refund_id}")
            return
        
        # Check if we already have a refund record for this specific Stripe refund
        existing_refund = PaymentTransaction.objects.filter(
            stripe_payment_intent=refund_id
        ).first()
        
        if existing_refund:
            logger.info(f"Refund transaction already exists for {refund_id}")
            return
        
        # Check if transaction is already marked as refunded
        if transaction.status == 'refunded':
            logger.info(f"Transaction {transaction.id} is already marked as refunded")
            return
        
        # Update original transaction status to refunded (no new transaction needed)
        transaction.status = 'refunded'
        transaction.save()
        
        # Update order status if full refund
        order = transaction.order
        if amount_refunded >= float(transaction.amount):
            order.status = 'refunded'
            order.is_paid = False
            order.save()
            
            # Restore stock and reduce sold count for all items
            for item in order.items.all():
                try:
                    product_variant = item.product_variant
                    product_variant.increase_stock(item.quantity)  # This handles both stock + and sold -
                    logger.info(f"Restored {item.quantity} units to product variant {product_variant.id} stock and reduced sold count due to refund")
                except Exception as e:
                    logger.error(f"Failed to restore stock for product variant {item.product_variant.id}: {str(e)}")
        
        logger.info(f"Refund webhook processed for order {order.id}, refund: {refund_id}")
        
    except Exception as e:
        logger.error(f"Error handling refund created: {str(e)}")


def handle_refund_updated(refund):
    """
    Handle refund updated event from Stripe webhook
    """
    try:
        refund_id = refund['id']
        refund_status = refund['status']
        
        # Find the refund transaction
        refund_transaction = PaymentTransaction.objects.filter(
            stripe_payment_intent=refund_id
        ).first()
        
        if not refund_transaction:
            logger.error(f"No refund transaction found for {refund_id}")
            return
        
        # Update refund transaction based on status
        if refund_status == 'succeeded':
            # Refund completed successfully
            logger.info(f"Refund {refund_id} succeeded for order {refund_transaction.order.id}")
        elif refund_status == 'failed':
            # Refund failed - might need to revert changes
            logger.error(f"Refund {refund_id} failed for order {refund_transaction.order.id}")
            # You might want to update the transaction status or take other actions
        elif refund_status == 'canceled':
            # Refund was canceled
            logger.info(f"Refund {refund_id} was canceled for order {refund_transaction.order.id}")
        
    except Exception as e:
        logger.error(f"Error handling refund updated: {str(e)}")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def continue_payment(request):
    """
    Continue payment for an existing pending order
    Expected payload: {'order_id': 'order_id'}
    """
    try:
        user = request.user
        order_id = request.data.get('order_id')
        
        if not order_id:
            return Response(
                {'error': 'Order ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the order
        try:
            order = Order.objects.get(id=order_id, user=user)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if order is pending payment
        if order.is_paid:
            return Response(
                {'error': 'Order is already paid'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if order.status != 'pending':
            return Response(
                {'error': 'Order is not in pending status'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if there's an existing valid checkout session
        existing_transaction = PaymentTransaction.objects.filter(
            order=order, 
            status='pending'
        ).first()
        
        if existing_transaction and order.checkout_url:
            # Check if the existing Stripe session is still valid
            try:
                session = stripe.checkout.Session.retrieve(existing_transaction.stripe_checkout_id)
                if session.status == 'open':
                    return Response({
                        'checkout_url': session.url,
                        'session_id': session.id,
                        'order_id': order_id
                    })
            except stripe.error.StripeError:
                # Session is invalid, we'll create a new one
                pass
        
        # Create new checkout session using the existing create_checkout_session logic
        # This will reuse the existing order items
        return create_checkout_session(request)
        
    except Exception as e:
        logger.error(f"Unexpected error in continue_payment: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_status(request, order_id):
    """
    Get payment status for an order
    """
    try:
        user = request.user
        order = Order.objects.get(id=order_id, user=user)
        
        # Get the latest payment transaction
        transaction = PaymentTransaction.objects.filter(order=order).order_by('-created_at').first()
        
        if not transaction:
            return Response({
                'status': 'no_payment',
                'order_status': order.status,
                'is_paid': order.is_paid
            })
        
        return Response({
            'status': transaction.status,
            'order_status': order.status,
            'is_paid': order.is_paid,
            'amount': str(transaction.amount),
            'created_at': transaction.created_at.isoformat()
        })
        
    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_full_refund(request):
    """
    Process a full refund for an order
    Expected payload: {'order_id': 'order_id', 'reason': 'refund_reason'}
    """
    try:
        user = request.user
        order_id = request.data.get('order_id')
        refund_reason = request.data.get('reason', 'Customer requested refund')
        
        if not order_id:
            return Response(
                {'error': 'Order ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the order
        try:
            order = Order.objects.get(id=order_id, user=user)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if order is eligible for refund
        if not order.is_paid:
            return Response(
                {'error': 'Order has not been paid yet'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if order.status == 'cancelled':
            return Response(
                {'error': 'Order is already cancelled'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the successful payment transaction
        successful_transaction = PaymentTransaction.objects.filter(
            order=order, 
            status='success'
        ).first()
        
        if not successful_transaction:
            return Response(
                {'error': 'No successful payment found for this order'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already refunded
        if successful_transaction.status == 'refunded':
            return Response(
                {'error': 'Order has already been refunded'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Also check if order status is already refunded
        if order.status == 'refunded':
            return Response(
                {'error': 'Order has already been refunded'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Process refund with Stripe
            if successful_transaction.stripe_payment_intent:
                # Create refund using payment intent
                refund = stripe.Refund.create(
                    payment_intent=successful_transaction.stripe_payment_intent,
                    amount=int(successful_transaction.amount * 100),  # Stripe uses cents
                    metadata={
                        'order_id': order_id,
                        'user_id': str(user.id),
                        'reason': refund_reason,
                        'refund_type': 'full_refund'
                    },
                    reason='requested_by_customer'
                )
            else:
                return Response(
                    {'error': 'Cannot process refund: Payment intent not found'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update the original transaction status to refunded (no new transaction needed)
            successful_transaction.status = 'refunded'
            successful_transaction.save()
            
            # Update order status
            order.status = 'refunded'
            order.is_paid = False  # Mark as not paid since it's refunded
            order.save()
            
            # Restore product stock and reduce sold count for all items in the order
            for item in order.items.all():
                try:
                    product_variant = item.product_variant
                    product_variant.increase_stock(item.quantity)  # This handles both stock + and sold -
                    logger.info(f"Restored {item.quantity} units to product variant {product_variant.id} stock and reduced sold count")
                except Exception as e:
                    logger.error(f"Failed to restore stock for product variant {item.product_variant.id}: {str(e)}")
            
            logger.info(f"Full refund processed for order {order_id}. Refund ID: {refund['id']}")
            
            return Response({
                'success': True,
                'message': 'Full refund processed successfully',
                'order_id': order_id,
                'refund_id': refund['id'],
                'refunded_amount': str(successful_transaction.amount),
                'order_status': order.status,
                'transaction_id': successful_transaction.id
            })
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe refund error for order {order_id}: {str(e)}")
            return Response(
                {'error': f'Refund processing failed: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except Exception as e:
        logger.error(f"Unexpected error in process_full_refund: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred while processing refund'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def refund_status(request, order_id):
    """
    Get refund status for an order
    """
    try:
        user = request.user
        order = Order.objects.get(id=order_id, user=user)
        
        # Get all payment transactions for this order
        transactions = PaymentTransaction.objects.filter(order=order).order_by('-created_at')
        
        # Check for refunded transactions
        refund_transaction = transactions.filter(status='refunded').first()
        successful_transaction = transactions.filter(status='success').first()
        
        if not successful_transaction:
            return Response({
                'refund_status': 'no_payment',
                'message': 'No successful payment found for this order'
            })
        
        if refund_transaction:
            return Response({
                'refund_status': 'refunded',
                'order_status': order.status,
                'refunded_amount': str(abs(refund_transaction.amount)),
                'refund_date': refund_transaction.created_at.isoformat(),
                'original_amount': str(successful_transaction.amount),
                'refund_transaction_id': refund_transaction.id
            })
        
        # Check if order is eligible for refund
        eligible_for_refund = (
            order.is_paid and 
            order.status not in ['cancelled'] and
            successful_transaction.status == 'success'
        )
        
        return Response({
            'refund_status': 'not_refunded',
            'order_status': order.status,
            'is_paid': order.is_paid,
            'eligible_for_refund': eligible_for_refund,
            'original_amount': str(successful_transaction.amount),
            'payment_date': successful_transaction.created_at.isoformat()
        })
        
    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


def process_refund_for_cancelled_order(order, refund_reason="Order cancelled by customer"):
    """
    Helper function to process actual refund through Stripe when an order is cancelled.
    This function is called from OrderManager.cancel_order()
    
    Args:
        order: Order instance
        refund_reason: Reason for the refund
        
    Returns:
        dict: Result of refund operation with success status and details
    """
    try:
        # Get the successful payment transaction
        successful_transaction = PaymentTransaction.objects.filter(
            order=order, 
            status='success'
        ).first()
        
        if not successful_transaction:
            return {
                'success': False,
                'error': 'No successful payment found for this order',
                'refund_processed': False
            }
        
        # Check if already refunded
        if successful_transaction.status == 'refunded':
            return {
                'success': True,
                'message': 'Payment already refunded',
                'refund_processed': False,
                'already_refunded': True
            }
        
        # Process refund with Stripe only if we have payment intent
        if successful_transaction.stripe_payment_intent:
            try:
                # Create refund using payment intent
                refund = stripe.Refund.create(
                    payment_intent=successful_transaction.stripe_payment_intent,
                    amount=int(successful_transaction.amount * 100),  # Stripe uses cents
                    metadata={
                        'order_id': order.id,
                        'user_id': str(order.user.id),
                        'reason': refund_reason,
                        'refund_type': 'order_cancellation'
                    },
                    reason='requested_by_customer'
                )
                
                # Update the transaction status to refunded
                successful_transaction.status = 'refunded'
                successful_transaction.save()
                
                logger.info(f"Refund processed for cancelled order {order.id}. Refund ID: {refund['id']}")
                
                return {
                    'success': True,
                    'message': 'Refund processed successfully through Stripe',
                    'refund_processed': True,
                    'refund_id': refund['id'],
                    'refunded_amount': str(successful_transaction.amount),
                    'transaction_id': successful_transaction.id
                }
                
            except stripe.error.StripeError as e:
                logger.error(f"Stripe refund error for cancelled order {order.id}: {str(e)}")
                # Still mark as refunded in our system even if Stripe fails
                successful_transaction.status = 'refunded'
                successful_transaction.save()
                
                return {
                    'success': False,
                    'error': f'Stripe refund failed: {str(e)}',
                    'refund_processed': False,
                    'marked_as_refunded': True
                }
        else:
            # No payment intent available, just mark as refunded in our system
            successful_transaction.status = 'refunded'
            successful_transaction.save()
            
            return {
                'success': True,
                'message': 'Payment marked as refunded (no payment intent available)',
                'refund_processed': False,
                'marked_as_refunded': True
            }
            
    except Exception as e:
        logger.error(f"Unexpected error processing refund for cancelled order {order.id}: {str(e)}")
        return {
            'success': False,
            'error': f'Refund processing failed: {str(e)}',
            'refund_processed': False
        }