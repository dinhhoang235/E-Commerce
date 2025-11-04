# Redis Caching Quick Reference

## Quick Commands

### Cache Management
```bash
# Clear all cache
docker-compose exec backend python manage.py clear_product_cache --all

# Clear specific cache
docker-compose exec backend python manage.py clear_product_cache --products
docker-compose exec backend python manage.py clear_product_cache --categories
docker-compose exec backend python manage.py clear_product_cache --product-id 123

# Warm up cache
docker-compose exec backend python manage.py warmup_cache --verbose
```

### Redis CLI
```bash
# Connect to Redis
docker-compose exec redis redis-cli

# List all keys
KEYS ecommerce:*

# Get a value
GET ecommerce:products:top_sellers

# Check TTL
TTL ecommerce:products:top_sellers

# Delete a key
DEL ecommerce:products:top_sellers

# Flush all Redis data (careful!)
FLUSHALL
```

## Cache Keys Reference

| Key Pattern | Endpoint | TTL |
|-------------|----------|-----|
| `categories:all` | GET /api/categories/ | 30m |
| `category:{id}` | GET /api/categories/{id}/ | 30m |
| `product:{id}` | GET /api/products/{id}/ | 15m |
| `product:{id}:variants` | GET /api/products/{id}/variants/ | 15m |
| `product:{id}:recommendations` | GET /api/products/{id}/recommendations/ | 20m |
| `products:list:{hash}` | GET /api/products/?filters | 10m |
| `products:filters:{hash}` | GET /api/products/filters/ | 30m |
| `products:top_sellers` | GET /api/products/top_sellers/ | 30m |
| `products:new_arrivals` | GET /api/products/new_arrivals/ | 15m |
| `products:personalized:{hash}` | GET /api/products/personalized/ | 20m |
| `product_colors:all` | GET /api/product-colors/ | 1h |

## When Cache is Invalidated

| Action | Invalidates |
|--------|-------------|
| Create/Update/Delete Product | Product detail, lists, filters, recommendations |
| Create/Update/Delete Variant | Product detail, variants, lists, filters |
| Create/Update/Delete Category | Categories, product lists, filters |
| Create/Update/Delete Color | Colors, product lists |
| Stock Change | Product detail, variants, lists |

## Testing Cache Performance

### Using Django Shell
```python
from backend.redis_client import redis_client

# Test connection
redis_client.ping()  # Returns True

# Check if key exists
redis_client.exists('products:top_sellers')

# Get value
data = redis_client.get('products:top_sellers')

# Get TTL
ttl = redis_client.get_ttl('products:top_sellers')
print(f"TTL: {ttl} seconds")

# Clear pattern
count = redis_client.clear_pattern('products:*')
print(f"Cleared {count} keys")
```

### Using cURL
```bash
# Test response time (first request - cache miss)
time curl -s http://localhost:8000/api/products/top_sellers/ > /dev/null

# Test response time (second request - cache hit)
time curl -s http://localhost:8000/api/products/top_sellers/ > /dev/null
```

## Common Issues

### Cache Not Working
```bash
# 1. Check Redis is running
docker-compose ps | grep redis

# 2. Test Redis connection
docker-compose exec backend python manage.py shell
>>> from backend.redis_client import redis_client
>>> redis_client.ping()

# 3. Check for errors
docker-compose logs redis
docker-compose logs backend
```

### Stale Data
```bash
# Clear specific product cache
docker-compose exec backend python manage.py clear_product_cache --product-id 123

# Or clear all cache
docker-compose exec backend python manage.py clear_product_cache --all
```

### Memory Issues
```bash
# Check Redis memory
docker-compose exec redis redis-cli INFO memory

# Clear old cache
docker-compose exec backend python manage.py clear_product_cache --all
```

## Development Tips

### After Making Changes
1. Clear relevant cache
2. Test endpoint
3. Verify new data is cached

### Before Committing
1. Test cache invalidation works
2. Verify TTL values are appropriate
3. Check for memory leaks

### In Production
1. Warm up cache after deployment
2. Monitor cache hit rates
3. Set up alerts for Redis issues

## Monitoring

### Cache Statistics
```bash
# Overall stats
docker-compose exec redis redis-cli INFO stats

# Hit/miss rates
docker-compose exec redis redis-cli INFO stats | grep keyspace

# Memory usage
docker-compose exec redis redis-cli INFO memory | grep used_memory_human
```

### Key Count
```bash
# Count all cached keys
docker-compose exec redis redis-cli DBSIZE

# Count specific pattern
docker-compose exec redis redis-cli KEYS "ecommerce:products:*" | wc -l
```

## Best Practices

✅ **DO:**
- Clear cache after bulk updates
- Warm up cache after deployments
- Monitor cache hit rates
- Use appropriate TTL values
- Test cache invalidation

❌ **DON'T:**
- Cache user-specific data in shared cache
- Set TTL too high (stale data risk)
- Set TTL too low (defeats purpose)
- Forget to invalidate on updates
- Use cache for critical security data

## Environment Variables

```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
```

## Useful Redis Commands

```bash
# Get all keys with pattern
KEYS ecommerce:product:*

# Get key type
TYPE ecommerce:products:top_sellers

# Get info about key
DEBUG OBJECT ecommerce:products:top_sellers

# Monitor Redis commands in real-time
MONITOR

# Get Redis stats
INFO

# Check memory usage
MEMORY USAGE ecommerce:products:top_sellers
```

## Performance Expectations

### Cold Cache (First Request)
- Product list: ~500ms
- Product detail: ~200ms
- Top sellers: ~300ms

### Warm Cache (Cached Request)
- Product list: ~50ms (90% faster)
- Product detail: ~20ms (90% faster)
- Top sellers: ~10ms (95% faster)

## Support

For detailed documentation, see:
- `/backend/REDIS_OPTIMIZATION.md` - Full documentation
- `/backend/REDIS_OPTIMIZATION_SUMMARY.md` - Implementation summary
- `/backend/REDIS_USAGE_GUIDE.md` - Redis basics

For testing:
- Run `/backend/test_redis_cache.sh`
