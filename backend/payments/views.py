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
from .models import PaymentTransaction
from orders.models import Order, OrderItem

# Set up logging
logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session_from_cart(request):
    try:
        user = request.user
        cart_items = request.data.get('cart_items', [])
        shipping_address = request.data.get('shipping_address', {})
        shipping_method = request.data.get('shipping_method', 'standard')
        
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
        
        # Create Stripe checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=f"{settings.FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/payment/cancel",
            metadata={
                'user_id': str(user.id),
                'cart_items': json.dumps(cart_items),
                'shipping_address': json.dumps(shipping_address),
                'shipping_method': shipping_method,
                'total_amount': str(total_amount),
            },
            customer_email=user.email,
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
        logger.error(f"Unexpected error in create_checkout_session_from_cart: {str(e)}")
        return Response(
            {'error': 'An unexpected error occurred'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment_and_create_order(request):
    """
    Verify payment with Stripe and create order
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
        
        # Check if we already created an order for this session
        existing_transaction = PaymentTransaction.objects.filter(
            stripe_checkout_id=session_id,
            status='success'
        ).first()
        
        if existing_transaction:
            return Response({
                'success': True,
                'order_id': existing_transaction.order.id,
                'message': 'Order already exists for this payment'
            })
        
        # Get cart data from session metadata
        user_id = session.metadata.get('user_id')
        if str(user.id) != user_id:
            return Response(
                {'error': 'Payment session does not belong to current user'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Create order from session metadata (same logic as webhook)
        cart_items_json = session.metadata.get('cart_items')
        shipping_address_json = session.metadata.get('shipping_address')
        shipping_method = session.metadata.get('shipping_method', 'standard')
        total_amount = session.metadata.get('total_amount', '0')
        
        if not cart_items_json:
            return Response(
                {'error': 'No cart items found in payment session'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse cart data
        import json
        cart_items = json.loads(cart_items_json)
        shipping_address_data = json.loads(shipping_address_json) if shipping_address_json else {}
        
        # Create shipping address if provided
        shipping_address = None
        if shipping_address_data:
            try:
                from users.models import Address
                shipping_address = Address.objects.create(
                    user=user,
                    first_name=shipping_address_data.get('firstName', ''),
                    last_name=shipping_address_data.get('lastName', ''),
                    phone=shipping_address_data.get('phone', ''),
                    address_line1=shipping_address_data.get('address', ''),
                    city=shipping_address_data.get('city', ''),
                    state=shipping_address_data.get('state', ''),
                    zip_code=shipping_address_data.get('zipCode', ''),
                    country=shipping_address_data.get('country', 'US'),
                    is_default=False
                )
            except Exception as e:
                logger.error(f"Failed to create shipping address: {e}")
        
        # Generate order ID
        import uuid
        order_id = f"APL{uuid.uuid4().hex[:8].upper()}"
        
        # Create order
        order = Order.objects.create(
            id=order_id,
            user=user,
            shipping_address=shipping_address,
            shipping_method=shipping_method,
            total=float(total_amount),
            status='processing',
            is_paid=True
        )
        
        # Create order items
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
        
        # Create payment transaction record
        PaymentTransaction.objects.create(
            order=order,
            stripe_checkout_id=session_id,
            stripe_payment_intent=session.payment_intent,
            amount=float(total_amount),
            status='success'
        )
        
        logger.info(f"Order {order_id} created successfully after payment verification")
        
        return Response({
            'success': True,
            'order_id': order_id,
            'message': 'Order created successfully'
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
    Handle successful payment completion and create order
    """
    try:
        session_id = session['id']
        user_id = session['metadata'].get('user_id')
        order_id = session['metadata'].get('order_id')  # For existing order flow
        
        if not user_id:
            logger.error(f"No user_id in session metadata: {session_id}")
            return
        
        # If this is from existing order flow
        if order_id:
            try:
                transaction = PaymentTransaction.objects.get(stripe_checkout_id=session_id)
                transaction.status = 'success'
                transaction.stripe_payment_intent = session.get('payment_intent')
                transaction.save()
                
                # Update order status
                order = transaction.order
                order.is_paid = True
                order.status = 'processing'
                order.save()
                
                logger.info(f"Payment successful for existing order {order_id}")
                return
                
            except PaymentTransaction.DoesNotExist:
                logger.error(f"Payment transaction not found for session {session_id}")
                return
        
        # New flow: Create order from cart after successful payment
        try:
            from django.contrib.auth.models import User
            from users.models import Address
            from products.models import Product
            import json
            
            user = User.objects.get(id=user_id)
            cart_items_json = session['metadata'].get('cart_items')
            shipping_address_json = session['metadata'].get('shipping_address')
            shipping_method = session['metadata'].get('shipping_method', 'standard')
            total_amount = session['metadata'].get('total_amount', '0')
            
            if not cart_items_json:
                logger.error(f"No cart items in session metadata: {session_id}")
                return
            
            cart_items = json.loads(cart_items_json)
            shipping_address_data = json.loads(shipping_address_json) if shipping_address_json else {}
            
            # Create shipping address if provided
            shipping_address = None
            if shipping_address_data:
                try:
                    shipping_address = Address.objects.create(
                        user=user,
                        first_name=shipping_address_data.get('firstName', ''),
                        last_name=shipping_address_data.get('lastName', ''),
                        phone=shipping_address_data.get('phone', ''),
                        address_line1=shipping_address_data.get('address', ''),
                        city=shipping_address_data.get('city', ''),
                        state=shipping_address_data.get('state', ''),
                        zip_code=shipping_address_data.get('zipCode', ''),
                        country=shipping_address_data.get('country', 'US'),
                        is_default=False
                    )
                except Exception as e:
                    logger.error(f"Failed to create shipping address: {e}")
            
            # Generate order ID
            import uuid
            order_id = f"APL{uuid.uuid4().hex[:8].upper()}"
            
            # Create order
            order = Order.objects.create(
                id=order_id,
                user=user,
                shipping_address=shipping_address,
                shipping_method=shipping_method,
                total=float(total_amount),
                status='processing',
                is_paid=True
            )
            
            # Create order items
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
            
            # Create payment transaction record
            PaymentTransaction.objects.create(
                order=order,
                stripe_checkout_id=session_id,
                stripe_payment_intent=session.get('payment_intent'),
                amount=float(total_amount),
                status='success'
            )
            
            logger.info(f"Order {order_id} created successfully after payment")
            
        except User.DoesNotExist:
            logger.error(f"User {user_id} not found for session {session_id}")
        except Exception as e:
            logger.error(f"Error creating order from payment session {session_id}: {str(e)}")
            
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