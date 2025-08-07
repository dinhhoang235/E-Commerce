from django.db import models

# Create your models here.

STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

class PaymentTransaction(models.Model):
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='payments')
    stripe_checkout_id = models.CharField(max_length=255, unique=True)
    stripe_payment_intent = models.CharField(max_length=255, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)  
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.order.id} - {self.status}"
