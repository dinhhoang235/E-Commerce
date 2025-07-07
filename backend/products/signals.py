from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import Product, Category

# Theo dõi category cũ trước khi cập nhật
@receiver(pre_save, sender=Product)
def store_old_category(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._old_category = Product.objects.get(pk=instance.pk).category
        except Product.DoesNotExist:
            instance._old_category = None
    else:
        instance._old_category = None

# Khi tạo mới hoặc cập nhật sản phẩm
@receiver(post_save, sender=Product)
def update_product_count_on_save(sender, instance, created, **kwargs):
    if created:
        # Tạo mới
        if instance.category:
            instance.category.product_count = instance.category.products.count()
            instance.category.save()
    else:
        # Cập nhật, kiểm tra nếu đổi category
        old = instance._old_category
        new = instance.category
        if old != new:
            if old:
                old.product_count = old.products.count()
                old.save()
            if new:
                new.product_count = new.products.count()
                new.save()

# Khi xóa sản phẩm
@receiver(post_delete, sender=Product)
def update_product_count_on_delete(sender, instance, **kwargs):
    if instance.category:
        instance.category.product_count = instance.category.products.count()
        instance.category.save()
