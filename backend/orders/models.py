from django.db import models
from django.contrib.auth.models import User
from users.models import Address
from products.models import Product


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('completed', 'Completed')
    ]
    
    SHIPPING_METHOD_CHOICES = [
        ('standard', 'Standard Shipping'),
        ('express', 'Express Shipping'),
        ('overnight', 'Overnight Shipping'),
    ]
    
    id = models.CharField(max_length=20, primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    shipping_address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True)
    shipping_method = models.CharField(max_length=20, choices=SHIPPING_METHOD_CHOICES, default='standard')
    total = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    date = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.id} - {self.user.username}"
    
    @property
    def customer_name(self):
        """Get customer full name"""
        if hasattr(self.user, 'account'):
            account = self.user.account
            if account.first_name and account.last_name:
                return f"{account.first_name} {account.last_name}"
        return f"{self.user.first_name} {self.user.last_name}" if self.user.first_name else self.user.username
    
    @property
    def customer_email(self):
        """Get customer email"""
        return self.user.email
    
    @property
    def products_list(self):
        """Get list of product names in this order"""
        return [f"{item.product.name}" + (f" x{item.quantity}" if item.quantity > 1 else "") for item in self.items.all()]
    
    @property
    def shipping_address_formatted(self):
        """Get formatted shipping address"""
        if self.shipping_address:
            return str(self.shipping_address)
        return "No shipping address"
    
    @property
    def shipping_method_display(self):
        """Get shipping method display name"""
        return dict(self.SHIPPING_METHOD_CHOICES).get(self.shipping_method, 'Standard Shipping')

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"