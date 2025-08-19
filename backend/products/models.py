from django.db import models
from django.core.exceptions import ValidationError
from PIL import Image
import os
from django.db.models import Avg, Count


STORAGE_CHOICES = [
    ("128GB", "128 GB"),
    ("256GB", "256 GB"),
    ("512GB", "512 GB"),
    ("1TB", "1 TB"),
    ("2TB", "2 TB"),
]

class InsufficientStockError(Exception):
    """Raised when there's insufficient stock for a product"""
    pass


def upload_image_path(instance, filename):
    if isinstance(instance, Category):
        return f'categories/{instance.slug}/{filename}'
    elif isinstance(instance, Product):
        return f'products/{instance.category.slug}/{filename}'
    return f'uploads/unknown/{filename}'

class Category(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to=upload_image_path, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    parent = models.ForeignKey(
        'self', null=True, blank=True, related_name='subcategories', on_delete=models.CASCADE
    )
    product_count = models.PositiveIntegerField(default=0)
    created_at = models.DateField(auto_now_add=True)
    updated_at = models.DateField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        if self.image and os.path.exists(self.image.path):
            img = Image.open(self.image.path)
            img = img.convert("RGB")
            img.thumbnail((200, 200))
            img.save(self.image.path, format="JPEG", quality=90)
    

class Product(models.Model):
    name = models.CharField(max_length=255)
    category = models.ForeignKey(Category, related_name='products', on_delete=models.CASCADE)
    image = models.ImageField(upload_to=upload_image_path, blank=True, null=True)
    
    rating = models.FloatField(default=0.0)
    reviews = models.PositiveIntegerField(default=0)
    badge = models.CharField(max_length=50, blank=True, null=True)
    
    description = models.TextField(blank=True)
    full_description = models.TextField(blank=True)
    features = models.JSONField(default=list)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name
    
    def update_rating_and_review_count(self):
        """
        Calculate and update the average rating and review count based on actual reviews.
        This method should be called whenever a review is added, updated, or deleted.
        """
        
        # Import here to avoid circular imports
        try:
            from reviews.models import Review
            
            # Get all reviews for this product
            review_data = Review.objects.filter(product=self).aggregate(
                avg_rating=Avg('rating'),
                review_count=Count('id')
            )
            
            # Update the product fields
            self.rating = round(review_data['avg_rating'], 1) if review_data['avg_rating'] else 0.0
            self.reviews = review_data['review_count'] or 0
            
            # Save without calling the full save method to avoid image processing
            Product.objects.filter(id=self.id).update(
                rating=self.rating,
                reviews=self.reviews
            )
            
        except ImportError:
            # If reviews app is not available, keep current values
            pass
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        if self.image and os.path.exists(self.image.path):
            img = Image.open(self.image.path)
            img = img.convert("RGB")
            img.thumbnail((300, 300))
            img.save(self.image.path, format="JPEG", quality=90)
            
class ProductColor(models.Model):
    name = models.CharField(max_length=50)   
    hex_code = models.CharField(max_length=7, blank=True, null=True)

    class Meta:
        verbose_name = "Product Color"
        verbose_name_plural = "Product Colors"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.hex_code})" if self.hex_code else self.name

            
class ProductVariant(models.Model):
    product = models.ForeignKey(Product, related_name='variants', on_delete=models.CASCADE)
    color = models.ForeignKey(ProductColor, on_delete=models.CASCADE, related_name="variants")
    storage = models.CharField(max_length=50, choices=STORAGE_CHOICES, blank=True, null=True)

    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    stock = models.PositiveIntegerField(default=0)
    sold = models.PositiveIntegerField(default=0)
    is_in_stock = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["product", "color", "storage"], name="unique_product_variant")
        ]
        ordering = ["product", "color", "storage"]
        
    def __str__(self):
        return f'{self.product.name} - {self.color or "No Color"} - {self.storage or "No Storage"}'
    
    def update_stock_status(self):
        self.is_in_stock = self.stock > 0
        self.save(update_fields=['is_in_stock'])
    
    def reduce_stock(self, quantity):
        """
        Reduce stock when a product is purchased.
        Raises InsufficientStockError if insufficient stock.
        """
        if self.stock < quantity:
            raise InsufficientStockError(
                f"Insufficient stock for {self.product.name} - {self.color or 'No Color'} - {self.storage or 'No Storage'}. "
                f"Available: {self.stock}, Requested: {quantity}"
            )
        self.stock -= quantity
        self.sold += quantity
        self.update_stock_status()
        self.save(update_fields=['stock', 'sold', 'is_in_stock'])
    
    def increase_stock(self, quantity):
        """
        Increase stock when an order is cancelled or returned.
        """
        self.stock += quantity
        if self.sold >= quantity:
            self.sold -= quantity
        else:
            self.sold = 0
        self.update_stock_status()
        self.save(update_fields=['stock', 'sold', 'is_in_stock'])
    
    def check_stock_availability(self, quantity):
        """
        Check if the requested quantity is available in stock.
        """
        return self.stock >= quantity
    
    