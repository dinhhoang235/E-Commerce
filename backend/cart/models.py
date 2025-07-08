from django.db import models
from django.contrib.auth.models import User
from products.models import Product
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
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    color = models.CharField(max_length=50, blank=True, null=True)
    storage = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('cart', 'product', 'color', 'storage')

    def __str__(self):
        options = []
        if self.color:
            options.append(f"Color: {self.color}")
        if self.storage:
            options.append(f"Storage: {self.storage}")
        
        option_str = f" ({', '.join(options)})" if options else ""
        return f"{self.quantity}x {self.product.name}{option_str}"

    @property
    def total_price(self):
        return self.product.price * self.quantity

    def clean(self):
        if self.quantity <= 0:
            raise ValidationError("Quantity must be greater than 0")
        
        # Validate color and storage options
        if self.color and self.color not in self.product.colors:
            raise ValidationError(f"Color '{self.color}' is not available for this product")
        
        if self.storage and self.storage not in self.product.storage:
            raise ValidationError(f"Storage '{self.storage}' is not available for this product")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
