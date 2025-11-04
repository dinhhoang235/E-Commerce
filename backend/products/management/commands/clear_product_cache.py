"""
Management command to clear product-related cache
Usage: python manage.py clear_product_cache [--all] [--products] [--categories]
"""

from django.core.management.base import BaseCommand
from backend.redis_client import redis_client


class Command(BaseCommand):
    help = 'Clear product-related cache from Redis'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Clear all product and category caches',
        )
        parser.add_argument(
            '--products',
            action='store_true',
            help='Clear product caches only',
        )
        parser.add_argument(
            '--categories',
            action='store_true',
            help='Clear category caches only',
        )
        parser.add_argument(
            '--colors',
            action='store_true',
            help='Clear product color caches',
        )
        parser.add_argument(
            '--product-id',
            type=int,
            help='Clear cache for specific product ID',
        )

    def handle(self, *args, **options):
        cleared_count = 0
        
        if options['all']:
            # Clear all product-related caches
            patterns = [
                'products:*',
                'product:*',
                'categories:*',
                'category:*',
                'product_colors:*',
            ]
            for pattern in patterns:
                count = redis_client.clear_pattern(pattern)
                cleared_count += count
                self.stdout.write(f"Cleared {count} keys matching '{pattern}'")
        
        elif options['product_id']:
            # Clear cache for specific product
            product_id = options['product_id']
            patterns = [
                f'product:{product_id}',
                f'product:{product_id}:variants',
                f'product:{product_id}:recommendations',
                'products:list:*',
                'products:filters:*',
                'products:top_sellers',
                'products:new_arrivals',
                'products:personalized:*',
            ]
            for pattern in patterns:
                count = redis_client.clear_pattern(pattern)
                cleared_count += count
            self.stdout.write(
                self.style.SUCCESS(f"Cleared cache for product {product_id} and related caches")
            )
        
        else:
            # Clear based on flags
            if options['products'] or not any([options['categories'], options['colors']]):
                patterns = [
                    'products:*',
                    'product:*',
                ]
                for pattern in patterns:
                    count = redis_client.clear_pattern(pattern)
                    cleared_count += count
                    self.stdout.write(f"Cleared {count} keys matching '{pattern}'")
            
            if options['categories']:
                patterns = [
                    'categories:*',
                    'category:*',
                ]
                for pattern in patterns:
                    count = redis_client.clear_pattern(pattern)
                    cleared_count += count
                    self.stdout.write(f"Cleared {count} keys matching '{pattern}'")
            
            if options['colors']:
                count = redis_client.clear_pattern('product_colors:*')
                cleared_count += count
                self.stdout.write(f"Cleared {count} keys matching 'product_colors:*'")
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully cleared {cleared_count} cache keys')
        )
