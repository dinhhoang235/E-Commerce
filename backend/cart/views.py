from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from .models import Cart, CartItem
from .serializers import (
    CartSerializer, 
    CartItemSerializer, 
    AddToCartSerializer, 
    UpdateCartItemSerializer
)
from products.models import ProductVariant


class CartViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Get user's cart"""
        cart, created = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        """Add item to cart"""
        serializer = AddToCartSerializer(data=request.data)
        if serializer.is_valid():
            cart, created = Cart.objects.get_or_create(user=request.user)
            product_variant = get_object_or_404(ProductVariant, id=serializer.validated_data['product_variant_id'])
            
            # Check if item with same product variant already exists
            existing_item = CartItem.objects.filter(
                cart=cart,
                product_variant=product_variant
            ).first()

            if existing_item:
                # Update existing item quantity
                new_quantity = existing_item.quantity + serializer.validated_data['quantity']
                
                # Check stock availability for new quantity
                if not product_variant.check_stock_availability(new_quantity):
                    return Response(
                        {
                            'error': f'Insufficient stock for {product_variant}. '
                                   f'Available: {product_variant.stock}, '
                                   f'Requested: {new_quantity}'
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                existing_item.quantity = new_quantity
                existing_item.save()
                item_serializer = CartItemSerializer(existing_item, context={'request': request})
            else:
                # Create new cart item
                cart_item = CartItem.objects.create(
                    cart=cart,
                    product_variant=product_variant,
                    quantity=serializer.validated_data['quantity']
                )
                item_serializer = CartItemSerializer(cart_item, context={'request': request})

            return Response(
                {
                    'message': 'Item added to cart successfully',
                    'item': item_serializer.data
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['put'])
    def update_item(self, request):
        """Update cart item quantity"""
        item_id = request.data.get('item_id')
        if not item_id:
            return Response(
                {'error': 'item_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        cart = get_object_or_404(Cart, user=request.user)
        cart_item = get_object_or_404(CartItem, id=item_id, cart=cart)
        
        serializer = UpdateCartItemSerializer(data=request.data)
        if serializer.is_valid():
            new_quantity = serializer.validated_data['quantity']
            
            # Check stock availability for new quantity
            if not cart_item.product_variant.check_stock_availability(new_quantity):
                return Response(
                    {
                        'error': f'Insufficient stock for {cart_item.product_variant}. '
                               f'Available: {cart_item.product_variant.stock}, '
                               f'Requested: {new_quantity}'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            cart_item.quantity = new_quantity
            cart_item.save()
            
            item_serializer = CartItemSerializer(cart_item, context={'request': request})
            return Response(
                {
                    'message': 'Cart item updated successfully',
                    'item': item_serializer.data
                }
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['delete'])
    def remove_item(self, request):
        """Remove item from cart"""
        item_id = request.data.get('item_id')
        if not item_id:
            return Response(
                {'error': 'item_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        cart = get_object_or_404(Cart, user=request.user)
        cart_item = get_object_or_404(CartItem, id=item_id, cart=cart)
        cart_item.delete()
        
        return Response(
            {'message': 'Item removed from cart successfully'},
            status=status.HTTP_204_NO_CONTENT
        )

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        """Clear all items from cart"""
        cart = get_object_or_404(Cart, user=request.user)
        cart.clear()
        
        return Response(
            {'message': 'Cart cleared successfully'},
            status=status.HTTP_204_NO_CONTENT
        )

    @action(detail=False, methods=['get'])
    def count(self, request):
        """Get cart items count"""
        cart, created = Cart.objects.get_or_create(user=request.user)
        return Response({'count': cart.total_items})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get cart summary (total items and price)"""
        cart, created = Cart.objects.get_or_create(user=request.user)
        return Response({
            'total_items': cart.total_items,
            'total_price': cart.total_price
        })
