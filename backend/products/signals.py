from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import Product, Category, ProductVariant
from backend.redis_client import redis_client


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
    redis_client.clear_pattern('category:*')
    redis_client.clear_pattern('products:list:*')
    redis_client.clear_pattern('products:filters:*')


# Track old category before product update
@receiver(pre_save, sender=Product)
def store_old_category(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._old_category = Product.objects.get(pk=instance.pk).category
        except Product.DoesNotExist:
            instance._old_category = None
    else:
        instance._old_category = None

# When creating or updating a product
@receiver(post_save, sender=Product)
def update_product_count_on_save(sender, instance, created, **kwargs):
    if created:
        # New product created
        if instance.category:
            instance.category.product_count = instance.category.products.count()
            instance.category.save()
    else:
        # Product updated, check if category changed
        old = instance._old_category
        new = instance.category
        if old != new:
            if old:
                old.product_count = old.products.count()
                old.save()
            if new:
                new.product_count = new.products.count()
                new.save()
    
    # Invalidate product cache
    invalidate_product_cache(instance.id)

# When deleting a product
@receiver(post_delete, sender=Product)
def update_product_count_on_delete(sender, instance, **kwargs):
    if instance.category:
        instance.category.product_count = instance.category.products.count()
        instance.category.save()
    
    # Invalidate product cache
    invalidate_product_cache(instance.id)

# When creating or updating a category
@receiver(post_save, sender=Category)
def invalidate_cache_on_category_save(sender, instance, created, **kwargs):
    """Invalidate cache when category is created or updated"""
    invalidate_category_cache()

# When deleting a category
@receiver(post_delete, sender=Category)
def invalidate_cache_on_category_delete(sender, instance, **kwargs):
    """Invalidate cache when category is deleted"""
    invalidate_category_cache()

# When creating or updating a product variant
@receiver(post_save, sender=ProductVariant)
def update_variant_stock_status(sender, instance, created, **kwargs):
    """Update stock status when variant is created or updated"""
    # Prevent recursion by checking if we're already updating the stock status
    if hasattr(instance, '_updating_stock_status'):
        return
    
    # Mark that we're updating stock status to prevent recursion
    instance._updating_stock_status = True
    
    try:
        # Ensure stock status is consistent with stock quantity
        new_stock_status = instance.stock > 0
        if instance.is_in_stock != new_stock_status:
            instance.is_in_stock = new_stock_status
            # Use update_fields to avoid triggering the signal again
            instance.save(update_fields=['is_in_stock'])
    finally:
        # Remove the flag
        delattr(instance, '_updating_stock_status')
    
    # Invalidate product cache after variant changes
    invalidate_product_cache(instance.product.id)

# When deleting a product variant
@receiver(post_delete, sender=ProductVariant)
def cleanup_after_variant_delete(sender, instance, **kwargs):
    """Cleanup after variant deletion"""
    # This could be extended to handle any cleanup needed when a variant is deleted
    # For example, updating product availability if no variants remain
    product = instance.product
    
    # Check if product still has any variants in stock
    has_stock = product.variants.filter(is_in_stock=True).exists()
    
    # You could add logic here to update product status based on variant availability
    # For example, marking a product as out of stock if no variants are available
    
    # Invalidate product cache
    invalidate_product_cache(product.id)
