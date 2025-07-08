from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Cart, CartItem


@receiver(post_save, sender=User)
def create_user_cart(sender, instance, created, **kwargs):
    """Create a cart when a new user is created"""
    if created:
        Cart.objects.create(user=instance)


@receiver(post_save, sender=CartItem)
@receiver(post_delete, sender=CartItem)
def update_cart_timestamp(sender, instance, **kwargs):
    """Update cart timestamp when items are added, updated, or removed"""
    if instance.cart:
        instance.cart.save()  # This will update the updated_at field
