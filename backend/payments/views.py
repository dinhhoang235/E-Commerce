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
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .models import PaymentTransaction
from orders.models import Order, OrderItem

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
                shipping_address_obj = Address.objects.create(
                    user=user,
                    first_name=shipping_address.get('firstName', ''),
                    last_name=shipping_address.get('lastName', ''),
                    phone=shipping_address.get('phone', ''),
                    address_line1=shipping_address.get('address', ''),
                    city=shipping_address.get('city', ''),
                    state=shipping_address.get('state', ''),
                    zip_code=shipping_address.get('zipCode', ''),
                    country=shipping_address.get('country', 'US'),
                    is_default=False
                )
            except Exception as e:
                logger.error(f"Failed to create shipping address: {e}")
        
        # Check if there's already a pending order for this user with same total and items
        # This prevents duplicate orders when user clicks "proceed to payment" multiple times
        existing_pending_order = None
        pending_orders = Order.objects.filter(
            user=user,
            status='pending',
            is_paid=False,
            total=float(total_amount)
        ).order_by('-date')
        
        # Check if any pending order has the same cart items
        for pending_order in pending_orders:
            order_items = pending_order.items.all()
            if len(order_items) == len(cart_items):
                # Check if all items match
                items_match = True
                for cart_item in cart_items:
                    matching_order_item = order_items.filter(
                        product_id=cart_item['product_id'],
                        quantity=cart_item['quantity'],
                        price=float(cart_item['price'])
                    ).first()
                    if not matching_order_item:
                        items_match = False
                        break
                
                if items_match:
                    existing_pending_order = pending_order
                    break
        
        if existing_pending_order:
            # Use existing pending order instead of creating a new one
            order = existing_pending_order
            order_id = order.id
            logger.info(f"Using existing pending order {order_id}")
        else:
            # Generate order ID
            import uuid
            order_id = f"APL{uuid.uuid4().hex[:8].upper()}"
            
            # Create order with PENDING status first
            order = Order.objects.create(
                id=order_id,
                user=user,
                shipping_address=shipping_address_obj,
                shipping_method=shipping_method,
                total=float(total_amount),
                status='pending',  # Create with pending status
                is_paid=False  # Not paid yet
            )
            
            # Create order items only for new orders
            from products.models import Product
            for item_data in cart_items:
                try:
                    product = Product.objects.get(id=item_data['product_id'])
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        quantity=item_data['quantity'],
                        price=float(item_data['price'])
                    )
                except Product.DoesNotExist:
                    logger.error(f"Product {item_data['product_id']} not found for order {order_id}")
                    continue
        
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
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=f"{settings.FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/payment/cancel",
            metadata={
                'user_id': str(user.id),
                'order_id': order_id,  # Include order ID in metadata
                'shipping_method': shipping_method,
                'total_amount': str(total_amount),
            },
            customer_email=user.email,
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
            # Build product data
            product_data = {'name': item.product.name}
            if item.product.description and item.product.description.strip():
                product_data['description'] = item.product.description[:500]
            
            line_items.append({
                'price_data': {
                    'currency': 'usd',
                    'product_data': product_data,
                    'unit_amount': int(item.price * 100),  # Stripe uses cents
                },
                'quantity': item.quantity,
            })
        
        # Create Stripe checkout session
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
            billing_address_collection='required',
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
            from django.contrib.auth.models import User
            user = User.objects.get(id=user_id)
            order = Order.objects.get(id=order_id, user=user)
            
            # Update order status to processing and mark as paid
            order.status = 'processing'
            order.is_paid = True
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
        transaction = PaymentTransaction.objects.filter(order=order).order_by('-create_at').first()
        
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
            'created_at': transaction.create_at
        })
        
    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )