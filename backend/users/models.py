from django.db import models
from django.contrib.auth.models import User
from PIL import Image
import os
from django.templatetags.static import static

COUNTRY_CHOICES = [
    ("VN", "Vietnam"),
    ("US", "United States"),
    ("CA", "Canada"),
    ("GB", "United Kingdom"),
    ("AU", "Australia"),
    ("SG", "Singapore"),
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
    
    @classmethod
    def get_or_create_for_user(cls, user, address_data):
        """
        Get an existing address or create a new one if it doesn't exist.
        This prevents duplicate addresses for the same user.
        """
        # Extract the core address fields for comparison
        core_fields = {
            'address_line1': address_data.get('address_line1', '').strip(),
            'city': address_data.get('city', '').strip(),
            'state': address_data.get('state', '').strip(),
            'zip_code': address_data.get('zip_code', '').strip(),
            'country': address_data.get('country', 'VN'),
        }
        
        # Look for an existing address with the same core fields
        existing_address = cls.objects.filter(
            user=user,
            **core_fields
        ).first()
        
        if existing_address:
            # Update other fields (name, phone) if they've changed
            updated = False
            first_name = address_data.get('first_name', '').strip()
            last_name = address_data.get('last_name', '').strip()
            phone = address_data.get('phone', '').strip()
            
            if existing_address.first_name != first_name:
                existing_address.first_name = first_name
                updated = True
            if existing_address.last_name != last_name:
                existing_address.last_name = last_name
                updated = True
            if existing_address.phone != phone:
                existing_address.phone = phone
                updated = True
                
            if updated:
                existing_address.save()
                
            return existing_address, False  # (address, created)
        else:
            # Create a new address
            new_address = cls.objects.create(
                user=user,
                first_name=address_data.get('first_name', ''),
                last_name=address_data.get('last_name', ''),
                phone=address_data.get('phone', ''),
                address_line1=core_fields['address_line1'],
                city=core_fields['city'],
                state=core_fields['state'],
                zip_code=core_fields['zip_code'],
                country=core_fields['country'],
                is_default=address_data.get('is_default', False)
            )
            return new_address, True  # (address, created)