from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Case, When, IntegerField, Value, CharField, Count, Min, Max, Sum
from django.utils import timezone
from datetime import timedelta
from django.core.cache import cache
from backend.redis_client import redis_client
import hashlib
import json
from .models import Category, Product, ProductColor, ProductVariant
from .serializers import (
    CategorySerializer, 
    ProductSerializer, 
    ProductRecommendationSerializer,
    ProductColorSerializer,
    ProductVariantSerializer
)
from .permissions import IsAdminOrReadOnly


def generate_cache_key(prefix: str, **kwargs) -> str:
    """Generate a consistent cache key from prefix and parameters"""
    params = "&".join([f"{k}={v}" for k, v in sorted(kwargs.items()) if v is not None])
    if params:
        params_hash = hashlib.md5(params.encode()).hexdigest()[:8]
        return f"{prefix}:{params_hash}"
    return prefix


def invalidate_product_cache(product_id=None):
    """Invalidate all product-related caches"""
    patterns = [
        'products:list:*',
        'products:filters:*',
        'products:top_sellers',
        'products:new_arrivals',
        'products:personalized:*',
    ]
    
    if product_id:
        patterns.extend([
            f'product:{product_id}',
            f'product:{product_id}:variants',
            f'product:{product_id}:recommendations',
        ])
    
    for pattern in patterns:
        redis_client.clear_pattern(pattern)


def invalidate_category_cache():
    """Invalidate category-related caches"""
    redis_client.clear_pattern('categories:*')
    redis_client.clear_pattern('products:list:*')
    redis_client.clear_pattern('products:filters:*')


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    
    def list(self, request, *args, **kwargs):
        """Get all categories with caching"""
        cache_key = 'categories:all'
        cached_data = redis_client.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        
        # Cache for 30 minutes
        redis_client.set(cache_key, serializer.data, timeout=1800)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """Get single category with caching"""
        pk = kwargs.get('pk')
        cache_key = f'category:{pk}'
        cached_data = redis_client.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        # Cache for 30 minutes
        redis_client.set(cache_key, serializer.data, timeout=1800)
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        """Clear cache after creating category"""
        serializer.save()
        invalidate_category_cache()
    
    def perform_update(self, serializer):
        """Clear cache after updating category"""
        serializer.save()
        invalidate_category_cache()
    
    def perform_destroy(self, instance):
        """Clear cache after deleting category"""
        instance.delete()
        invalidate_category_cache()


class ProductColorViewSet(viewsets.ModelViewSet):
    queryset = ProductColor.objects.all()
    serializer_class = ProductColorSerializer
    permission_classes = [IsAdminOrReadOnly]
    
    def list(self, request, *args, **kwargs):
        """Get all colors with caching"""
        cache_key = 'product_colors:all'
        cached_data = redis_client.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        
        # Cache for 1 hour
        redis_client.set(cache_key, serializer.data, timeout=3600)
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        """Clear cache after creating color"""
        serializer.save()
        redis_client.delete('product_colors:all')
        invalidate_product_cache()
    
    def perform_update(self, serializer):
        """Clear cache after updating color"""
        serializer.save()
        redis_client.delete('product_colors:all')
        invalidate_product_cache()
    
    def perform_destroy(self, instance):
        """Clear cache after deleting color"""
        instance.delete()
        redis_client.delete('product_colors:all')
        invalidate_product_cache()


class ProductVariantViewSet(viewsets.ModelViewSet):
    queryset = ProductVariant.objects.all()
    serializer_class = ProductVariantSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['product', 'color', 'storage', 'is_in_stock']
    ordering_fields = ['price', 'stock', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        product_id = self.request.query_params.get('product_id')
        
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Get variants with caching"""
        product_id = request.query_params.get('product_id')
        
        if product_id:
            cache_key = f'product:{product_id}:variants:list'
            cached_data = redis_client.get(cache_key)
            
            if cached_data:
                return Response(cached_data)
        
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        
        if product_id:
            # Cache for 15 minutes
            redis_client.set(cache_key, serializer.data, timeout=900)
        
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        """Clear cache after creating variant"""
        variant = serializer.save()
        invalidate_product_cache(variant.product.id)
    
    def perform_update(self, serializer):
        """Clear cache after updating variant"""
        variant = serializer.save()
        invalidate_product_cache(variant.product.id)
    
    def perform_destroy(self, instance):
        """Clear cache after deleting variant"""
        product_id = instance.product.id
        instance.delete()
        invalidate_product_cache(product_id)

    @action(detail=True, methods=['post'])
    def reduce_stock(self, request, pk=None):
        """Reduce stock for a specific variant"""
        try:
            variant = self.get_object()
            quantity = int(request.data.get('quantity', 0))
            
            if quantity <= 0:
                return Response({'error': 'Quantity must be positive'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not variant.check_stock_availability(quantity):
                return Response({
                    'error': f'Insufficient stock. Available: {variant.stock}, Requested: {quantity}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            variant.reduce_stock(quantity)
            
            # Invalidate cache after stock change
            invalidate_product_cache(variant.product.id)
            
            serializer = self.get_serializer(variant)
            return Response(serializer.data)
            
        except ValueError:
            return Response({'error': 'Invalid quantity'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def increase_stock(self, request, pk=None):
        """Increase stock for a specific variant"""
        try:
            variant = self.get_object()
            quantity = int(request.data.get('quantity', 0))
            
            if quantity <= 0:
                return Response({'error': 'Quantity must be positive'}, status=status.HTTP_400_BAD_REQUEST)
            
            variant.increase_stock(quantity)
            
            # Invalidate cache after stock change
            invalidate_product_cache(variant.product.id)
            
            serializer = self.get_serializer(variant)
            return Response(serializer.data)
            
        except ValueError:
            return Response({'error': 'Invalid quantity'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.prefetch_related('variants__color').all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['category', 'category__name']
    ordering_fields = ['name', 'created_at']
    ordering = ['-created_at']
    
    def filter_queryset(self, queryset):
        """Apply custom filtering logic"""
        search = self.request.query_params.get('search', '').strip()
        category_slug = self.request.query_params.get('category__slug', '').strip()
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        color_id = self.request.query_params.get('color')
        storage = self.request.query_params.get('storage')
        in_stock = self.request.query_params.get('in_stock')
        
        # Apply parent class filtering first
        queryset = super().filter_queryset(queryset)
        
        # Handle hierarchical category filtering
        if category_slug:
            try:
                target_category = Category.objects.get(slug=category_slug)
                subcategories = Category.objects.filter(parent=target_category)
                categories_to_include = [target_category] + list(subcategories)
                queryset = queryset.filter(category__in=categories_to_include)
            except Category.DoesNotExist:
                queryset = queryset.none()
        
        # Filter by price range (based on variant prices)
        if min_price:
            try:
                min_price = float(min_price)
                queryset = queryset.filter(variants__price__gte=min_price).distinct()
            except ValueError:
                pass
        
        if max_price:
            try:
                max_price = float(max_price)
                queryset = queryset.filter(variants__price__lte=max_price).distinct()
            except ValueError:
                pass
        
        # Filter by color
        if color_id:
            try:
                queryset = queryset.filter(variants__color_id=color_id).distinct()
            except ValueError:
                pass
        
        # Filter by storage
        if storage:
            queryset = queryset.filter(variants__storage=storage).distinct()
        
        # Filter by stock availability
        if in_stock and in_stock.lower() == 'true':
            queryset = queryset.filter(variants__is_in_stock=True).distinct()
        
        # Search functionality
        if search:
            # Products that start with the search term (highest priority)
            starts_with_qs = queryset.filter(name__istartswith=search)
            
            # Products that contain but don't start with the search term (lower priority)
            contains_qs = queryset.filter(
                name__icontains=search
            ).exclude(name__istartswith=search)
            
            # Combine querysets with proper ordering
            starts_with_annotated = starts_with_qs.annotate(
                search_rank=Value(1, output_field=IntegerField())
            )
            contains_annotated = contains_qs.annotate(
                search_rank=Value(2, output_field=IntegerField())
            )
            
            queryset = starts_with_annotated.union(contains_annotated).order_by('search_rank', 'name')
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Get products with caching"""
        # Generate cache key based on query parameters
        params = request.query_params.dict()
        cache_key = generate_cache_key('products:list', **params)
        
        # Try to get from cache
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        # Get the filtered queryset (including search logic)
        queryset = self.filter_queryset(self.get_queryset())
        
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
                response = self.get_paginated_response(serializer.data)
                # Cache paginated response for 10 minutes
                redis_client.set(cache_key, response.data, timeout=600)
                return response
        
        serializer = self.get_serializer(queryset, many=True)
        
        # Cache for 10 minutes
        redis_client.set(cache_key, serializer.data, timeout=600)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """Get single product with caching"""
        pk = kwargs.get('pk')
        cache_key = f'product:{pk}'
        
        # Try to get from cache
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        # Cache for 15 minutes
        redis_client.set(cache_key, serializer.data, timeout=900)
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        """Clear cache after creating product"""
        serializer.save()
        invalidate_product_cache()
    
    def perform_update(self, serializer):
        """Clear cache after updating product"""
        product = serializer.save()
        invalidate_product_cache(product.id)
    
    def perform_destroy(self, instance):
        """Clear cache after deleting product"""
        product_id = instance.id
        instance.delete()
        invalidate_product_cache(product_id)
    
    @action(detail=True, methods=['get'])
    def variants(self, request, pk=None):
        """Get all variants for a specific product with caching"""
        cache_key = f'product:{pk}:variants'
        
        # Try to get from cache
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        try:
            product = self.get_object()
            variants = (
                product.variants
                .select_related('color')
                .order_by('color__name', 'storage', '-created_at')
            )
            serializer = ProductVariantSerializer(variants, many=True, context={'request': request})
            
            # Cache for 15 minutes
            redis_client.set(cache_key, serializer.data, timeout=900)
            return Response(serializer.data)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'])
    def recommendations(self, request, pk=None):
        """Product detail recommendations based on category with caching"""
        cache_key = f'product:{pk}:recommendations'
        
        # Try to get from cache
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        target_category = product.category.parent if product.category.parent else product.category

        # Get products from the same category, excluding the current product
        queryset = Product.objects.filter(
            Q(category=target_category) | Q(category__parent=target_category)
        ).exclude(id=product.id).prefetch_related('variants__color')
        
        # Only include products that have variants in stock
        queryset = queryset.filter(variants__is_in_stock=True).distinct()
        
        # Order by rating and created_at for better recommendations
        queryset = queryset.order_by('-rating', '-created_at')
        
        # Limit to 8 recommendations
        queryset = queryset[:8]
        serializer = ProductRecommendationSerializer(queryset, many=True, context={'request': request})
        
        # Cache for 20 minutes
        redis_client.set(cache_key, serializer.data, timeout=1200)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def top_sellers(self, request):
        """Top selling products based on variant sales with caching"""
        cache_key = 'products:top_sellers'
        
        # Try to get from cache
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        last_7_days = timezone.now() - timedelta(days=7)

        # Try to get products with highest sales in the last 7 days
        top_products = (
            Product.objects
            .filter(variants__orderitem__order__date__gte=last_7_days)
            .prefetch_related('variants__color')
            .annotate(total_sold=Sum('variants__sold'))
            .order_by('-total_sold')
            .distinct()[:10]
        )

        # If no products found in last 7 days, get all-time top sellers
        if not top_products.exists():
            top_products = (
                Product.objects
                .filter(variants__sold__gt=0)
                .prefetch_related('variants__color')
                .annotate(total_sold=Sum('variants__sold'))
                .order_by('-total_sold')[:10]
            )
            
        # If still no products (no sales at all), return recent products
        if not top_products.exists():
            top_products = Product.objects.prefetch_related('variants__color').order_by('-created_at')[:10]

        serializer = ProductRecommendationSerializer(top_products, many=True, context={'request': request})
        
        # Cache for 30 minutes (top sellers don't change frequently)
        redis_client.set(cache_key, serializer.data, timeout=1800)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def new_arrivals(self, request):
        """Latest products with available variants with caching"""
        cache_key = 'products:new_arrivals'
        
        # Try to get from cache
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        products = (
            Product.objects
            .filter(variants__is_in_stock=True)
            .prefetch_related('variants__color')
            .distinct()
            .order_by('-created_at')[:10]
        )
        serializer = ProductRecommendationSerializer(products, many=True, context={'request': request})
        
        # Cache for 15 minutes (new arrivals can change more frequently)
        redis_client.set(cache_key, serializer.data, timeout=900)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def personalized(self, request):
        """Personalized product recommendations based on categories with caching"""
        category_ids = request.query_params.getlist("categories")  # ?categories=1&categories=3
        
        # Generate cache key based on categories
        cache_key = generate_cache_key('products:personalized', categories=','.join(sorted(category_ids)))
        
        # Try to get from cache
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        queryset = Product.objects.prefetch_related('variants__color').all()

        if category_ids:
            try:
                # Convert to integers and filter
                category_ids = [int(cat_id) for cat_id in category_ids if cat_id.isdigit()]
                queryset = queryset.filter(category__id__in=category_ids)
            except ValueError:
                # If invalid category IDs, return empty queryset
                queryset = queryset.none()

        # Only include products that have variants in stock
        queryset = queryset.filter(variants__is_in_stock=True).distinct().order_by('-rating', '-created_at')[:10]
        serializer = ProductRecommendationSerializer(queryset, many=True, context={'request': request})
        
        # Cache for 20 minutes
        redis_client.set(cache_key, serializer.data, timeout=1200)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def filters(self, request):
        """Get available filter options with caching"""
        category_slug = request.query_params.get('category__slug', '').strip()
        
        # Generate cache key
        cache_key = generate_cache_key('products:filters', category_slug=category_slug)
        
        # Try to get from cache
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        # Base queryset
        queryset = Product.objects.all()
        
        # Apply category filter if provided
        if category_slug:
            try:
                target_category = Category.objects.get(slug=category_slug)
                subcategories = Category.objects.filter(parent=target_category)
                categories_to_include = [target_category] + list(subcategories)
                queryset = queryset.filter(category__in=categories_to_include)
            except Category.DoesNotExist:
                queryset = queryset.none()
        
        # Only include products that have variants
        queryset = queryset.filter(variants__isnull=False).distinct()
        
        # Get price range from variants
        price_range = ProductVariant.objects.filter(
            product__in=queryset
        ).aggregate(
            min_price=Min('price'),
            max_price=Max('price')
        )
        
        # Get available colors from variants that belong to filtered products
        colors = ProductColor.objects.filter(
            variants__product__in=queryset
        ).distinct().values('id', 'name', 'hex_code')
        
        # Get available storage options from variants that belong to filtered products
        storages = ProductVariant.objects.filter(
            product__in=queryset
        ).values_list('storage', flat=True).distinct()
        storage_options = [storage for storage in storages if storage]
        
        response_data = {
            'price_range': price_range,
            'colors': list(colors),
            'storage_options': storage_options,
        }
        
        # Cache for 30 minutes (filters don't change very frequently)
        redis_client.set(cache_key, response_data, timeout=1800)
        return Response(response_data)

