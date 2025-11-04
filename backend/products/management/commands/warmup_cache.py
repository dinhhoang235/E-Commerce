"""
Management command to warm up (pre-populate) product cache
Usage: python manage.py warmup_cache
"""

from django.core.management.base import BaseCommand
from django.db.models import Q, Sum, Min, Max
from django.utils import timezone
from datetime import timedelta
from products.models import Product, Category, ProductColor, ProductVariant
from products.serializers import (
    ProductSerializer,
    ProductRecommendationSerializer,
    CategorySerializer,
    ProductColorSerializer,
    ProductVariantSerializer
)
from backend.redis_client import redis_client


class Command(BaseCommand):
    help = 'Warm up Redis cache with frequently accessed data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed progress',
        )

    def handle(self, *args, **options):
        verbose = options['verbose']
        self.stdout.write('Starting cache warmup...')
        
        # 1. Cache all categories
        if verbose:
            self.stdout.write('Caching categories...')
        categories = Category.objects.all()
        serializer = CategorySerializer(categories, many=True)
        redis_client.set('categories:all', serializer.data, timeout=1800)
        if verbose:
            self.stdout.write(f"  ✓ Cached {categories.count()} categories")
        
        # 2. Cache individual categories
        for category in categories:
            redis_client.set(f'category:{category.id}', CategorySerializer(category).data, timeout=1800)
        if verbose:
            self.stdout.write(f"  ✓ Cached {categories.count()} individual categories")
        
        # 3. Cache all product colors
        if verbose:
            self.stdout.write('Caching product colors...')
        colors = ProductColor.objects.all()
        serializer = ProductColorSerializer(colors, many=True)
        redis_client.set('product_colors:all', serializer.data, timeout=3600)
        if verbose:
            self.stdout.write(f"  ✓ Cached {colors.count()} colors")
        
        # 4. Cache top sellers
        if verbose:
            self.stdout.write('Caching top sellers...')
        last_7_days = timezone.now() - timedelta(days=7)
        top_products = (
            Product.objects
            .filter(variants__orderitem__order__date__gte=last_7_days)
            .prefetch_related('variants__color')
            .annotate(total_sold=Sum('variants__sold'))
            .order_by('-total_sold')
            .distinct()[:10]
        )
        if not top_products.exists():
            top_products = (
                Product.objects
                .filter(variants__sold__gt=0)
                .prefetch_related('variants__color')
                .annotate(total_sold=Sum('variants__sold'))
                .order_by('-total_sold')[:10]
            )
        if not top_products.exists():
            top_products = Product.objects.prefetch_related('variants__color').order_by('-created_at')[:10]
        
        serializer = ProductRecommendationSerializer(top_products, many=True)
        redis_client.set('products:top_sellers', serializer.data, timeout=1800)
        if verbose:
            self.stdout.write(f"  ✓ Cached {top_products.count()} top sellers")
        
        # 5. Cache new arrivals
        if verbose:
            self.stdout.write('Caching new arrivals...')
        new_products = (
            Product.objects
            .filter(variants__is_in_stock=True)
            .prefetch_related('variants__color')
            .distinct()
            .order_by('-created_at')[:10]
        )
        serializer = ProductRecommendationSerializer(new_products, many=True)
        redis_client.set('products:new_arrivals', serializer.data, timeout=900)
        if verbose:
            self.stdout.write(f"  ✓ Cached {new_products.count()} new arrivals")
        
        # 6. Cache popular products (highest rated)
        if verbose:
            self.stdout.write('Caching popular products...')
        popular_products = (
            Product.objects
            .filter(variants__is_in_stock=True, rating__gt=0)
            .prefetch_related('variants__color')
            .distinct()
            .order_by('-rating', '-reviews')[:20]
        )
        for product in popular_products:
            # Cache individual product
            serializer = ProductSerializer(product)
            redis_client.set(f'product:{product.id}', serializer.data, timeout=900)
            
            # Cache product variants
            variants = product.variants.select_related('color').order_by('color__name', 'storage', '-created_at')
            variant_serializer = ProductVariantSerializer(variants, many=True)
            redis_client.set(f'product:{product.id}:variants', variant_serializer.data, timeout=900)
        
        if verbose:
            self.stdout.write(f"  ✓ Cached {popular_products.count()} popular products and their variants")
        
        # 7. Cache filter options for main categories
        if verbose:
            self.stdout.write('Caching filter options...')
        main_categories = Category.objects.filter(parent__isnull=True)
        for category in main_categories:
            queryset = Product.objects.filter(
                Q(category=category) | Q(category__parent=category)
            ).filter(variants__isnull=False).distinct()
            
            price_range = ProductVariant.objects.filter(
                product__in=queryset
            ).aggregate(
                min_price=Min('price'),
                max_price=Max('price')
            )
            
            colors = ProductColor.objects.filter(
                variants__product__in=queryset
            ).distinct().values('id', 'name', 'hex_code')
            
            storages = ProductVariant.objects.filter(
                product__in=queryset
            ).values_list('storage', flat=True).distinct()
            storage_options = [storage for storage in storages if storage]
            
            filter_data = {
                'price_range': price_range,
                'colors': list(colors),
                'storage_options': storage_options,
            }
            
            # Generate cache key
            import hashlib
            params = f"category__slug={category.slug}"
            params_hash = hashlib.md5(params.encode()).hexdigest()[:8]
            cache_key = f'products:filters:{params_hash}'
            
            redis_client.set(cache_key, filter_data, timeout=1800)
        
        if verbose:
            self.stdout.write(f"  ✓ Cached filters for {main_categories.count()} categories")
        
        # 8. Cache product list for main categories
        if verbose:
            self.stdout.write('Caching product lists for categories...')
        for category in main_categories[:5]:  # Limit to top 5 categories
            queryset = Product.objects.filter(
                Q(category=category) | Q(category__parent=category)
            ).prefetch_related('variants__color').order_by('-created_at')[:20]
            
            serializer = ProductSerializer(queryset, many=True)
            
            # Generate cache key
            import hashlib
            params = f"category__slug={category.slug}"
            params_hash = hashlib.md5(params.encode()).hexdigest()[:8]
            cache_key = f'products:list:{params_hash}'
            
            redis_client.set(cache_key, serializer.data, timeout=600)
        
        if verbose:
            self.stdout.write(f"  ✓ Cached product lists for top categories")
        
        self.stdout.write(
            self.style.SUCCESS('✓ Cache warmup completed successfully!')
        )
