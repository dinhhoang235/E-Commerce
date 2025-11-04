"""
Redis client utility for E-Commerce application
Provides easy access to Redis for caching, sessions, and real-time data
"""

from django.core.cache import cache
from django.conf import settings
import redis
import json
from typing import Any, Optional


class RedisClient:
    """Wrapper class for Redis operations"""
    
    def __init__(self):
        """Initialize Redis client"""
        self._redis = redis.Redis(
            host=settings.REDIS_HOST,
            port=int(settings.REDIS_PORT),
            db=int(settings.REDIS_DB),
            decode_responses=True
        )
    
    @property
    def client(self):
        """Get raw Redis client"""
        return self._redis
    
    def set(self, key: str, value: Any, timeout: int = 300) -> bool:
        """
        Set a value in Redis with optional timeout
        
        Args:
            key: Redis key
            value: Value to store (will be JSON serialized)
            timeout: Expiration time in seconds (default: 5 minutes)
        
        Returns:
            True if successful, False otherwise
        """
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            return cache.set(key, value, timeout)
        except Exception as e:
            print(f"Redis SET error: {e}")
            return False
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get a value from Redis
        
        Args:
            key: Redis key
            default: Default value if key doesn't exist
        
        Returns:
            Value from Redis or default
        """
        try:
            value = cache.get(key, default)
            if value and isinstance(value, str):
                try:
                    return json.loads(value)
                except (json.JSONDecodeError, TypeError):
                    return value
            return value
        except Exception as e:
            print(f"Redis GET error: {e}")
            return default
    
    def delete(self, key: str) -> bool:
        """
        Delete a key from Redis
        
        Args:
            key: Redis key to delete
        
        Returns:
            True if successful, False otherwise
        """
        try:
            cache.delete(key)
            return True
        except Exception as e:
            print(f"Redis DELETE error: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """
        Check if a key exists in Redis
        
        Args:
            key: Redis key
        
        Returns:
            True if key exists, False otherwise
        """
        try:
            return cache.has_key(key)
        except Exception as e:
            print(f"Redis EXISTS error: {e}")
            return False
    
    def incr(self, key: str, amount: int = 1) -> Optional[int]:
        """
        Increment a value in Redis
        
        Args:
            key: Redis key
            amount: Amount to increment by (default: 1)
        
        Returns:
            New value after increment, or None on error
        """
        try:
            return self._redis.incr(key, amount)
        except Exception as e:
            print(f"Redis INCR error: {e}")
            return None
    
    def expire(self, key: str, seconds: int) -> bool:
        """
        Set expiration time for a key
        
        Args:
            key: Redis key
            seconds: Expiration time in seconds
        
        Returns:
            True if successful, False otherwise
        """
        try:
            return self._redis.expire(key, seconds)
        except Exception as e:
            print(f"Redis EXPIRE error: {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern
        
        Args:
            pattern: Pattern to match (e.g., 'user:*')
        
        Returns:
            Number of keys deleted
        """
        try:
            keys = self._redis.keys(f"{settings.CACHES['default']['KEY_PREFIX']}:{pattern}")
            if keys:
                return self._redis.delete(*keys)
            return 0
        except Exception as e:
            print(f"Redis CLEAR_PATTERN error: {e}")
            return 0
    
    def get_ttl(self, key: str) -> Optional[int]:
        """
        Get time-to-live for a key
        
        Args:
            key: Redis key
        
        Returns:
            TTL in seconds, -1 if no expiration, -2 if key doesn't exist, None on error
        """
        try:
            full_key = f"{settings.CACHES['default']['KEY_PREFIX']}:{key}"
            return self._redis.ttl(full_key)
        except Exception as e:
            print(f"Redis TTL error: {e}")
            return None
    
    def ping(self) -> bool:
        """
        Check if Redis is alive
        
        Returns:
            True if Redis is responsive, False otherwise
        """
        try:
            return self._redis.ping()
        except Exception as e:
            print(f"Redis PING error: {e}")
            return False


# Global Redis client instance
redis_client = RedisClient()


# Utility functions for common caching patterns
def cache_product(product_id: int, data: dict, timeout: int = 600):
    """Cache product data for 10 minutes"""
    return redis_client.set(f'product:{product_id}', data, timeout)


def get_cached_product(product_id: int) -> Optional[dict]:
    """Get cached product data"""
    return redis_client.get(f'product:{product_id}')


def cache_user_cart(user_id: int, cart_data: dict, timeout: int = 1800):
    """Cache user cart for 30 minutes"""
    return redis_client.set(f'cart:user:{user_id}', cart_data, timeout)


def get_cached_cart(user_id: int) -> Optional[dict]:
    """Get cached user cart"""
    return redis_client.get(f'cart:user:{user_id}')


def invalidate_user_cache(user_id: int):
    """Clear all cache for a specific user"""
    return redis_client.clear_pattern(f'*:user:{user_id}*')


def cache_category_products(category_id: int, products: list, timeout: int = 900):
    """Cache category products for 15 minutes"""
    return redis_client.set(f'category:{category_id}:products', products, timeout)


def get_cached_category_products(category_id: int) -> Optional[list]:
    """Get cached category products"""
    return redis_client.get(f'category:{category_id}:products')
