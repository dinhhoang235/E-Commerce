from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import IntegrityError
from .models import Wishlist, WishlistItem
from .serializers import (
    WishlistSerializer, 
    WishlistItemSerializer, 
    AddToWishlistSerializer
)
from products.models import Product


class WishlistViewSet(viewsets.ViewSet):
    """
    ViewSet for managing user wishlist operations
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Get user's wishlist"""
        wishlist, created = Wishlist.objects.get_or_create(user=request.user)
        serializer = WishlistSerializer(wishlist, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        """Add item to wishlist"""
        serializer = AddToWishlistSerializer(data=request.data)
        if serializer.is_valid():
            wishlist, created = Wishlist.objects.get_or_create(user=request.user)
            product = get_object_or_404(Product, id=serializer.validated_data['product_id'])
            
            try:
                # Try to create new wishlist item
                wishlist_item = WishlistItem.objects.create(
                    wishlist=wishlist,
                    product=product
                )
                item_serializer = WishlistItemSerializer(wishlist_item, context={'request': request})
                return Response(
                    {
                        'message': 'Item added to wishlist successfully',
                        'item': item_serializer.data
                    },
                    status=status.HTTP_201_CREATED
                )
            except IntegrityError:
                # Item already exists in wishlist
                return Response(
                    {'message': 'Item is already in your wishlist'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['delete'])
    def remove_item(self, request):
        """Remove item from wishlist"""
        product_id = request.data.get('product_id')
        if not product_id:
            return Response(
                {'error': 'product_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            wishlist = Wishlist.objects.get(user=request.user)
            wishlist_item = get_object_or_404(
                WishlistItem, 
                wishlist=wishlist, 
                product_id=product_id
            )
            wishlist_item.delete()
            return Response(
                {'message': 'Item removed from wishlist successfully'},
                status=status.HTTP_200_OK
            )
        except Wishlist.DoesNotExist:
            return Response(
                {'error': 'Wishlist not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['delete'])
    def clear(self, request):
        """Clear all items from wishlist"""
        try:
            wishlist = Wishlist.objects.get(user=request.user)
            count = wishlist.items.count()
            wishlist.items.all().delete()
            return Response(
                {'message': f'{count} items removed from wishlist'},
                status=status.HTTP_200_OK
            )
        except Wishlist.DoesNotExist:
            return Response(
                {'message': 'Wishlist is already empty'},
                status=status.HTTP_200_OK
            )

    @action(detail=False, methods=['get'])
    def count(self, request):
        """Get wishlist items count"""
        try:
            wishlist = Wishlist.objects.get(user=request.user)
            count = wishlist.total_items
        except Wishlist.DoesNotExist:
            count = 0
        
        return Response({'count': count})

    @action(detail=False, methods=['post'])
    def toggle_item(self, request):
        """Toggle item in wishlist (add if not present, remove if present)"""
        serializer = AddToWishlistSerializer(data=request.data)
        if serializer.is_valid():
            wishlist, created = Wishlist.objects.get_or_create(user=request.user)
            product_id = serializer.validated_data['product_id']
            
            try:
                # Try to find existing item
                wishlist_item = WishlistItem.objects.get(
                    wishlist=wishlist, 
                    product_id=product_id
                )
                # If found, remove it
                wishlist_item.delete()
                return Response(
                    {
                        'message': 'Item removed from wishlist',
                        'action': 'removed'
                    },
                    status=status.HTTP_200_OK
                )
            except WishlistItem.DoesNotExist:
                # If not found, add it
                product = get_object_or_404(Product, id=product_id)
                wishlist_item = WishlistItem.objects.create(
                    wishlist=wishlist,
                    product=product
                )
                item_serializer = WishlistItemSerializer(wishlist_item, context={'request': request})
                return Response(
                    {
                        'message': 'Item added to wishlist',
                        'action': 'added',
                        'item': item_serializer.data
                    },
                    status=status.HTTP_201_CREATED
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def check_item(self, request):
        """Check if a specific item is in the wishlist"""
        product_id = request.query_params.get('product_id')
        if not product_id:
            return Response(
                {'error': 'product_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            wishlist = Wishlist.objects.get(user=request.user)
            is_in_wishlist = WishlistItem.objects.filter(
                wishlist=wishlist, 
                product_id=product_id
            ).exists()
            return Response({'in_wishlist': is_in_wishlist})
        except Wishlist.DoesNotExist:
            return Response({'in_wishlist': False})
