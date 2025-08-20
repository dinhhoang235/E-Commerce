from django.db import models
from django.contrib.auth.models import User
from products.models import ProductVariant
from django.core.exceptions import ValidationError


class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart for {self.user.username}"

    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())

    @property
    def total_price(self):
        return sum(item.total_price for item in self.items.all())

    def clear(self):
        """Clear all items from the cart"""
        self.items.all().delete()


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    product_variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('cart', 'product_variant')

    def __str__(self):
        return f"{self.quantity}x {self.product_variant}"

    @property
    def total_price(self):
        return self.product_variant.price * self.quantity

    def clean(self):
        if self.quantity <= 0:
            raise ValidationError("Quantity must be greater than 0")
        
        # Validate stock availability
        if self.product_variant and self.quantity:
            if not self.product_variant.check_stock_availability(self.quantity):
                raise ValidationError(
                    f"Insufficient stock for {self.product_variant}. "
                    f"Available: {self.product_variant.stock}, Requested: {self.quantity}"
                )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
