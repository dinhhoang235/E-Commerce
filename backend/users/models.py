from django.db import models
from django.contrib.auth.models import User
from PIL import Image
import os
from django.templatetags.static import static

COUNTRY_CHOICES = [
    ("VN", "Vietnam"),
    ("US", "United States"),
    ("JP", "Japan"),
]

def user_directory_path(instance, filename):
    return f'user_{instance.user.id}/{filename}'

class Account(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='account')
    last_name = models.CharField(max_length=150, blank=True)
    first_name = models.CharField(max_length=150, blank=True)
    avatar = models.ImageField(upload_to=user_directory_path, blank=True, null=True)
    phone = models.CharField(max_length=15, blank=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.avatar and os.path.exists(self.avatar.path):
            img = Image.open(self.avatar.path)
            if img.height > 300 or img.width > 300:
                img.thumbnail((300, 300))
                img.save(self.avatar.path)
    
    @property
    def get_avatar(self):
        if self.avatar:
            return self.avatar.url
        return static('images/default.jpg')

class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=15, blank=True)
    address_line1 = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100, choices=COUNTRY_CHOICES, default='VN')
    created_at = models.DateTimeField(auto_now_add=True)
    is_default = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.address_line1}, {self.city}, {self.state}, {self.zip_code}, {self.country}"