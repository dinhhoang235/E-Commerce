from django.db import models
from PIL import Image
import os
from django.db.models import Avg, Count


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
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    image = models.ImageField(upload_to=upload_image_path, blank=True, null=True)
    rating = models.FloatField(default=0.0)
    reviews = models.PositiveIntegerField(default=0)
    badge = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True)
    full_description = models.TextField(blank=True)
    features = models.JSONField(default=list)
    colors = models.JSONField(default=list)
    storage = models.JSONField(default=list)
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