from itertools import product
from rest_framework import viewsets, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Case, When, IntegerField, Value, CharField, Count
from django.utils import timezone
from datetime import timedelta
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer, ProductRecommendationSerializer
from .permissions import IsAdminOrReadOnly

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]  # Remove SearchFilter for custom implementation
    filterset_fields = ['category', 'category__name']  # Removed 'category__slug' to handle hierarchical filtering in get_queryset
    ordering_fields = ['name', 'price', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', '').strip()
        category_slug = self.request.query_params.get('category__slug', '').strip()
        
        # Handle hierarchical category filtering
        if category_slug:
            try:
                # Find the category by slug
                target_category = Category.objects.get(slug=category_slug)
                
                # Get all subcategories (children) of the target category
                subcategories = Category.objects.filter(parent=target_category)
                
                # Create a list of all categories to include: target + all its children
                categories_to_include = [target_category] + list(subcategories)
                
                # Get products from the target category and all its subcategories
                queryset = queryset.filter(category__in=categories_to_include)
                
            except Category.DoesNotExist:
                # If category doesn't exist, return empty queryset
                queryset = queryset.none()
        
        if not search:
            return queryset
        
        # Search only in product name
        # Split results into two groups: starts with vs contains
        
        # Products that start with the search term (highest priority)
        starts_with_qs = queryset.filter(name__istartswith=search)
        
        # Products that contain but don't start with the search term (lower priority)
        contains_qs = queryset.filter(
            name__icontains=search
        ).exclude(name__istartswith=search)
        
        # Combine querysets with proper ordering
        # First all products that start with search term, then all that contain it
        starts_with_annotated = starts_with_qs.annotate(
            search_rank=Value(1, output_field=IntegerField())
        )
        contains_annotated = contains_qs.annotate(
            search_rank=Value(2, output_field=IntegerField())
        )
        
        # Union and order by rank, then name
        combined_qs = starts_with_annotated.union(contains_annotated).order_by('search_rank', 'name')
        
        return combined_qs
    
    def list(self, request, *args, **kwargs):
        # Get the filtered queryset (including search logic)
        queryset = self.get_queryset()
        
        # Apply additional filters from DjangoFilterBackend
        queryset = self.filter_queryset(queryset)
        
        # Apply limit after filtering if provided
        limit = request.query_params.get('limit')
        if limit:
            try:
                limit = int(limit)
                queryset = queryset[:limit]
            except (ValueError, TypeError):
                pass
        
        # Use the default pagination if no limit is specified
        if not limit:
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    # Products detail recommendations
    @action(detail=True, methods=['get'])
    def recommendations(self, request, pk=None):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=404)

        target_category = product.category.parent if product.category.parent else product.category

        # Get products from the same category, excluding the current product
        queryset = Product.objects.filter(
            Q(category=target_category) | Q(category__parent=target_category)
        ).exclude(id=product.id)
        # Limit to 8 recommendations
        queryset = queryset[:8]
        serializer = ProductRecommendationSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def top_sellers(self, request):
        """Top sản phẩm bán chạy trong 7 ngày qua, hoặc tất cả thời gian nếu không có"""
        last_7_days = timezone.now() - timedelta(days=7)

        # Try to get products sold in the last 7 days
        top_products = (
            Product.objects
            .filter(orderitem__order__date__gte=last_7_days)
            .annotate(total_sold=Count('orderitem'))
            .order_by('-total_sold')[:10]
        )

        # If no products found in last 7 days, get all-time top sellers
        if not top_products.exists():
            top_products = (
                Product.objects
                .filter(orderitem__isnull=False)
                .annotate(total_sold=Count('orderitem'))
                .order_by('-total_sold')[:10]
            )
            
        # If still no products (no orders at all), return recent products
        if not top_products.exists():
            top_products = Product.objects.all().order_by('-created_at')[:10]

        serializer = ProductRecommendationSerializer(top_products, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def new_arrivals(self, request):
        """Sản phẩm mới nhất"""
        products = Product.objects.all().order_by('-created_at')[:10]
        serializer = ProductRecommendationSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def personalized(self, request):
        """Gợi ý sản phẩm dành riêng cho user dựa theo category"""
        category_ids = request.query_params.getlist("categories")  # ?categories=1&categories=3
        queryset = Product.objects.all()

        if category_ids:
            queryset = queryset.filter(category__id__in=category_ids)

        queryset = queryset.distinct().order_by('-created_at')[:10]
        serializer = ProductRecommendationSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

