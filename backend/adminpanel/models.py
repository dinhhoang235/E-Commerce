from django.db import models
from django.core.validators import EmailValidator

class StoreSettings(models.Model):
    # Store Information
    store_name = models.CharField(max_length=255, default="Apple Store")
    store_description = models.TextField(default="Your trusted destination for the latest Apple products")
    store_email = models.EmailField(validators=[EmailValidator()], default="contact@applestore.com")
    store_phone = models.CharField(max_length=20, default="+1 (555) 123-4567")
    
    # Regional Settings
    CURRENCY_CHOICES = [
        ('USD', 'USD - US Dollar'),
        ('EUR', 'EUR - Euro'),
        ('GBP', 'GBP - British Pound'),
        ('CAD', 'CAD - Canadian Dollar'),
    ]
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')
    
    TIMEZONE_CHOICES = [
        ('America/New_York', 'Eastern Time'),
        ('America/Chicago', 'Central Time'),
        ('America/Denver', 'Mountain Time'),
        ('America/Los_Angeles', 'Pacific Time'),
    ]
    timezone = models.CharField(max_length=50, choices=TIMEZONE_CHOICES, default='America/New_York')
    
    # Notification Settings
    email_notifications = models.BooleanField(default=True)
    order_notifications = models.BooleanField(default=True)
    inventory_alerts = models.BooleanField(default=True)
    
    # Security Settings
    maintenance_mode = models.BooleanField(default=False)
    allow_guest_checkout = models.BooleanField(default=True)
    require_email_verification = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Store Settings"
        verbose_name_plural = "Store Settings"
    
    def __str__(self):
        return f"Store Settings - {self.store_name}"
    
    @classmethod
    def get_settings(cls):
        """Get or create settings instance (singleton pattern)"""
        settings, created = cls.objects.get_or_create(id=1)
        return settings
