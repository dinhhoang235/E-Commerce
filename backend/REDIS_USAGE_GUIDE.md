# Redis Usage Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Basic Operations](#basic-operations)
3. [Practical Examples](#practical-examples)
4. [Best Practices](#best-practices)
5. [Monitoring](#monitoring)

---

## Getting Started

### 1. Start Redis with Docker Compose

```bash
# Start all services including Redis
docker-compose up -d

# Check Redis is running
docker-compose ps | grep redis

# View Redis logs
docker-compose logs redis
```

### 2. Test Redis Connection

```bash
# Enter Django shell
docker-compose exec backend python manage.py shell
```

```python
# Inside Django shell
from backend.redis_client import redis_client

# Test connection
redis_client.ping()  # Returns: True

# Set a value
redis_client.set('test_key', 'Hello Redis!')

# Get the value
redis_client.get('test_key')  # Returns: 'Hello Redis!'
```

---

## Basic Operations

### Import the Redis Client

```python
from backend.redis_client import redis_client

# Or import specific helper functions
from backend.redis_client import (
    cache_product,
    get_cached_product,
    cache_user_cart,
    get_cached_cart
)
```

### Set and Get Values

```python
# Simple string
redis_client.set('username', 'john_doe', timeout=300)  # 5 minutes
value = redis_client.get('username')

# Dictionary (auto JSON serialization)
user_data = {'id': 1, 'name': 'John', 'email': 'john@example.com'}
redis_client.set('user:1', user_data, timeout=600)  # 10 minutes
cached_user = redis_client.get('user:1')

# List
items = ['apple', 'banana', 'orange']
redis_client.set('fruits', items, timeout=300)
cached_items = redis_client.get('fruits')
```

### Delete and Check Existence

```python
# Delete a key
redis_client.delete('username')

# Check if key exists
if redis_client.exists('user:1'):
    print("User data is cached")
else:
    print("User data not found in cache")
```

### Increment Counter

```python
# Track page views
redis_client.incr('product:123:views')  # Increment by 1
redis_client.incr('product:123:views', amount=5)  # Increment by 5

# Get current count
views = redis_client.get('product:123:views')
```

### Set Expiration

```python
# Set a value without expiration
redis_client.set('permanent_key', 'value', timeout=None)

# Add expiration later (3600 seconds = 1 hour)
redis_client.expire('permanent_key', 3600)

# Check time-to-live
ttl = redis_client.get_ttl('permanent_key')  # Returns seconds remaining
```

---

## Practical Examples

### Example 1: Cache Product Details

```python
from backend.redis_client import cache_product, get_cached_product
from products.models import Product

def get_product_detail(product_id):
    """Get product with caching"""
    
    # Try to get from cache first
    cached_data = get_cached_product(product_id)
    if cached_data:
        print(f"Cache HIT for product {product_id}")
        return cached_data
    
    # Cache miss - fetch from database
    print(f"Cache MISS for product {product_id}")
    try:
        product = Product.objects.get(id=product_id)
        product_data = {
            'id': product.id,
            'name': product.name,
            'price': str(product.price),
            'stock': product.stock,
            'description': product.description
        }
        
        # Cache for 10 minutes
        cache_product(product_id, product_data, timeout=600)
        return product_data
    except Product.DoesNotExist:
        return None
```

### Example 2: Cache User Cart

```python
from backend.redis_client import cache_user_cart, get_cached_cart, redis_client
from cart.models import Cart, CartItem

def get_user_cart(user_id):
    """Get user cart with caching"""
    
    # Check cache first
    cached_cart = get_cached_cart(user_id)
    if cached_cart:
        return cached_cart
    
    # Fetch from database
    try:
        cart = Cart.objects.get(user_id=user_id)
        cart_items = CartItem.objects.filter(cart=cart).select_related('product')
        
        cart_data = {
            'cart_id': cart.id,
            'total_items': cart_items.count(),
            'items': [
                {
                    'product_id': item.product.id,
                    'name': item.product.name,
                    'quantity': item.quantity,
                    'price': str(item.product.price)
                }
                for item in cart_items
            ]
        }
        
        # Cache for 30 minutes
        cache_user_cart(user_id, cart_data, timeout=1800)
        return cart_data
    except Cart.DoesNotExist:
        return None


def update_cart_item(user_id, product_id, quantity):
    """Update cart and invalidate cache"""
    
    # Update database...
    # ... your cart update logic here ...
    
    # Invalidate cart cache
    redis_client.delete(f'cart:user:{user_id}')
```

### Example 3: Cache API Responses in Views

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from backend.redis_client import redis_client

class ProductListView(APIView):
    def get(self, request):
        category_id = request.query_params.get('category')
        cache_key = f'products:category:{category_id}' if category_id else 'products:all'
        
        # Try cache first
        cached_data = redis_client.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        # Query database
        if category_id:
            products = Product.objects.filter(category_id=category_id)
        else:
            products = Product.objects.all()
        
        # Serialize data
        serializer = ProductSerializer(products, many=True)
        data = serializer.data
        
        # Cache for 15 minutes
        redis_client.set(cache_key, data, timeout=900)
        
        return Response(data)
```

### Example 4: Rate Limiting

```python
from backend.redis_client import redis_client
from rest_framework.exceptions import Throttled

def check_rate_limit(user_id, action='api_call', limit=100, window=3600):
    """
    Rate limiting using Redis
    
    Args:
        user_id: User ID
        action: Action name (e.g., 'api_call', 'login_attempt')
        limit: Maximum number of attempts
        window: Time window in seconds (default: 1 hour)
    
    Returns:
        bool: True if within limit, raises Throttled if exceeded
    """
    key = f'rate_limit:{action}:{user_id}'
    
    # Get current count
    current = redis_client.get(key) or 0
    current = int(current)
    
    if current >= limit:
        ttl = redis_client.get_ttl(key)
        raise Throttled(detail=f'Rate limit exceeded. Try again in {ttl} seconds.')
    
    # Increment counter
    if current == 0:
        # First request - set with expiration
        redis_client.set(key, 1, timeout=window)
    else:
        # Increment existing counter
        redis_client.incr(key)
    
    return True

# Usage in view
def my_api_view(request):
    user_id = request.user.id
    check_rate_limit(user_id, action='product_creation', limit=10, window=3600)
    # ... rest of your view logic
```

### Example 5: Session Data

```python
from backend.redis_client import redis_client

def store_user_session_data(user_id, session_data):
    """Store additional session data in Redis"""
    key = f'session:user:{user_id}'
    redis_client.set(key, session_data, timeout=3600)  # 1 hour

def get_user_session_data(user_id):
    """Retrieve user session data"""
    key = f'session:user:{user_id}'
    return redis_client.get(key)

# Example usage
session_data = {
    'last_viewed_products': [1, 5, 10, 23],
    'current_category': 'electronics',
    'search_history': ['iphone', 'macbook', 'ipad']
}
store_user_session_data(user_id=1, session_data=session_data)
```

### Example 6: Popular Products Tracking

```python
from backend.redis_client import redis_client

def track_product_view(product_id):
    """Track product views"""
    key = f'product:{product_id}:views'
    redis_client.incr(key)
    # Set 7 days expiration
    redis_client.expire(key, 7 * 24 * 3600)

def get_popular_products(limit=10):
    """Get most viewed products"""
    # Get all product view keys
    pattern = 'ecommerce:product:*:views'
    keys = redis_client.client.keys(pattern)
    
    # Get counts
    products_views = []
    for key in keys:
        # Extract product_id from key
        product_id = key.split(':')[2]
        views = int(redis_client.client.get(key) or 0)
        products_views.append((product_id, views))
    
    # Sort by views
    products_views.sort(key=lambda x: x[1], reverse=True)
    
    return products_views[:limit]
```

### Example 7: Cache Invalidation Pattern

```python
from backend.redis_client import redis_client, invalidate_user_cache
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from products.models import Product

@receiver(post_save, sender=Product)
def invalidate_product_cache(sender, instance, **kwargs):
    """Invalidate cache when product is updated"""
    # Clear specific product cache
    redis_client.delete(f'product:{instance.id}')
    
    # Clear category cache
    if instance.category:
        redis_client.delete(f'category:{instance.category.id}:products')
    
    # Clear all products list cache
    redis_client.delete('products:all')

@receiver(post_delete, sender=Product)
def invalidate_product_cache_on_delete(sender, instance, **kwargs):
    """Invalidate cache when product is deleted"""
    redis_client.delete(f'product:{instance.id}')
```

---

## Best Practices

### 1. Cache Naming Convention

```python
# Use descriptive, hierarchical keys
'product:{product_id}'                      # Product details
'category:{category_id}:products'           # Category products
'user:{user_id}:cart'                       # User cart
'order:{order_id}:status'                   # Order status
'rate_limit:{action}:{user_id}'             # Rate limiting
```

### 2. Set Appropriate TTL (Time To Live)

```python
# Frequently changing data - short TTL
redis_client.set('stock:product:123', stock_count, timeout=60)  # 1 minute

# Moderately stable data - medium TTL
redis_client.set('product:123', product_data, timeout=600)  # 10 minutes

# Stable data - long TTL
redis_client.set('category:list', categories, timeout=3600)  # 1 hour

# Temporary data - short TTL
redis_client.set('otp:user:123', otp_code, timeout=300)  # 5 minutes
```

### 3. Handle Cache Misses Gracefully

```python
def get_data_with_fallback(key):
    # Always have a fallback to database
    cached = redis_client.get(key)
    if cached:
        return cached
    
    # Fetch from database
    data = fetch_from_database()
    
    # Cache it
    if data:
        redis_client.set(key, data, timeout=600)
    
    return data
```

### 4. Batch Operations

```python
# Instead of multiple get operations
def get_multiple_products(product_ids):
    products = []
    for pid in product_ids:
        product = get_cached_product(pid)
        if not product:
            # Fetch from DB and cache
            product = fetch_and_cache_product(pid)
        products.append(product)
    return products
```

### 5. Clear Cache Patterns

```python
# Clear all user-related cache
redis_client.clear_pattern('*:user:123:*')

# Clear all product cache
redis_client.clear_pattern('product:*')

# Clear all cart cache
redis_client.clear_pattern('cart:*')
```

---

## Monitoring

### Check Redis Stats

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Check info
INFO

# Check memory usage
INFO memory

# Check keyspace
INFO keyspace

# See all keys (development only!)
KEYS *

# Get specific key value
GET ecommerce:product:1

# Check TTL
TTL ecommerce:product:1

# Exit Redis CLI
exit
```

### Monitor Cache Hit Rate

```python
from backend.redis_client import redis_client

def get_cache_stats():
    """Get basic cache statistics"""
    info = redis_client.client.info('stats')
    return {
        'total_connections': info.get('total_connections_received'),
        'total_commands': info.get('total_commands_processed'),
        'keyspace_hits': info.get('keyspace_hits', 0),
        'keyspace_misses': info.get('keyspace_misses', 0),
        'hit_rate': info.get('keyspace_hits', 0) / (info.get('keyspace_hits', 0) + info.get('keyspace_misses', 1)) * 100
    }
```

### Debug Cache in Django Admin

```python
# Create a management command
# backend/management/commands/clear_cache.py
from django.core.management.base import BaseCommand
from backend.redis_client import redis_client

class Command(BaseCommand):
    help = 'Clear Redis cache'

    def add_arguments(self, parser):
        parser.add_argument('--pattern', type=str, help='Pattern to match')

    def handle(self, *args, **options):
        if options['pattern']:
            count = redis_client.clear_pattern(options['pattern'])
            self.stdout.write(f'Cleared {count} keys matching pattern: {options["pattern"]}')
        else:
            self.stdout.write('Please provide --pattern argument')
```

```bash
# Usage
python manage.py clear_cache --pattern "product:*"
```

---

## Quick Reference

| Operation | Command | Example |
|-----------|---------|---------|
| Set value | `redis_client.set(key, value, timeout)` | `redis_client.set('key', 'value', 300)` |
| Get value | `redis_client.get(key)` | `redis_client.get('key')` |
| Delete | `redis_client.delete(key)` | `redis_client.delete('key')` |
| Exists | `redis_client.exists(key)` | `redis_client.exists('key')` |
| Increment | `redis_client.incr(key)` | `redis_client.incr('counter')` |
| Set expire | `redis_client.expire(key, seconds)` | `redis_client.expire('key', 3600)` |
| Get TTL | `redis_client.get_ttl(key)` | `redis_client.get_ttl('key')` |
| Clear pattern | `redis_client.clear_pattern(pattern)` | `redis_client.clear_pattern('user:*')` |
| Ping | `redis_client.ping()` | `redis_client.ping()` |

---

## Troubleshooting

### Redis Connection Error

```python
# Check if Redis is running
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test connection
from backend.redis_client import redis_client
redis_client.ping()  # Should return True
```

### Cache Not Working

```python
# Verify cache backend in settings
from django.conf import settings
print(settings.CACHES)

# Test cache directly
from django.core.cache import cache
cache.set('test', 'value', 60)
print(cache.get('test'))  # Should print 'value'
```

### Clear All Cache

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Flush all data (CAUTION: deletes everything!)
FLUSHALL

# Or flush only current database
FLUSHDB
```

---

## Performance Tips

1. **Use connection pooling** - Already configured in settings.py
2. **Set appropriate TTL** - Don't cache forever, don't refresh too often
3. **Cache expensive queries** - Database joins, aggregations, complex filters
4. **Invalidate on updates** - Clear cache when data changes
5. **Monitor hit rates** - Aim for >80% hit rate
6. **Use compression for large data** - Consider compressing before caching
7. **Batch operations** - Fetch multiple keys when possible

---

Happy caching! 🚀
