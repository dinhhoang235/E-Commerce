from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.db.models import Avg
from .models import Review
from .serializers import ReviewSerializer, ReviewCreateSerializer, ReviewUpdateSerializer
from products.models import Product


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        queryset = Review.objects.all()
        product_id = self.request.query_params.get('product_id', None)
        if product_id is not None:
            queryset = queryset.filter(product_id=product_id)
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ReviewCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ReviewUpdateSerializer
        return ReviewSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if user already reviewed this product
        product_id = serializer.validated_data['product'].id
        if Review.objects.filter(user=request.user, product_id=product_id).exists():
            return Response(
                {'error': 'You have already reviewed this product.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        review = serializer.save()
        
        # Update product rating and review count
        self._update_product_rating(product_id)
        
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Only allow user to update their own review
        if instance.user != request.user:
            return Response(
                {'error': 'You can only update your own reviews.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        response = super().update(request, *args, **kwargs)
        
        # Update product rating after review update
        self._update_product_rating(instance.product.id)
        
        return response
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Only allow user to delete their own review or admin
        if instance.user != request.user and not request.user.is_staff:
            return Response(
                {'error': 'You can only delete your own reviews.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        product_id = instance.product.id
        response = super().destroy(request, *args, **kwargs)
        
        # Update product rating after review deletion
        self._update_product_rating(product_id)
        
        return response
    
    def _update_product_rating(self, product_id):
        """Update product rating and review count based on all reviews"""
        try:
            product = Product.objects.get(id=product_id)
            product.update_rating_and_review_count()
        except Product.DoesNotExist:
            pass
    
    @action(detail=False, methods=['get'])
    def product_reviews(self, request):
        """Get all reviews for a specific product"""
        product_id = request.query_params.get('product_id')
        if not product_id:
            return Response(
                {'error': 'product_id parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reviews = Review.objects.filter(product_id=product_id)
        serializer = self.get_serializer(reviews, many=True)
        return Response(serializer.data)
