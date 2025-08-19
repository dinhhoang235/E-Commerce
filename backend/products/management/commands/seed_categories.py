from django.core.management.base import BaseCommand
from products.models import Category
from django.utils.timezone import now

class Command(BaseCommand):
    help = "Seed categories data"

    def handle(self, *args, **kwargs):
        categories_data = [
            {
                "name": "iPhone",
                "slug": "iphone",
                "description": "Apple iPhone smartphones with cutting-edge technology",
                "sort_order": 0,
                "product_count": 0,
            },
            {
                "name": "iPad",
                "slug": "ipad",
                "description": "Apple iPad tablets for work and creativity",
                "sort_order": 3,
                "product_count": 0,
            },
            {
                "name": "MacBook",
                "slug": "macbook",
                "description": "Apple MacBook laptops for professionals",
                "sort_order": 5,
                "product_count": 0,
            },
        ]

        subcategories_data = [
            {
                "name": "iPhone Pro",
                "slug": "iphone-pro",
                "description": "Professional iPhone models with advanced features",
                "sort_order": 2,
                "product_count": 0,
                "parent_slug": "iphone",
            },
            {
                "name": "iPad Pro",
                "slug": "ipad-pro",
                "description": "Professional iPad models for creative work",
                "sort_order": 4,
                "product_count": 0,
                "parent_slug": "ipad",
            },
        ]

        # Create main categories
        for data in categories_data:
            category, created = Category.objects.get_or_create(
                slug=data["slug"],
                defaults={
                    "name": data["name"],
                    "description": data["description"],
                    "sort_order": data["sort_order"],
                    "product_count": data["product_count"],
                    "is_active": True,
                    "created_at": now().date(),
                    "updated_at": now().date(),
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created category {category.name}"))

        # Create subcategories
        for data in subcategories_data:
            parent = Category.objects.filter(slug=data["parent_slug"]).first()
            if parent:
                subcat, created = Category.objects.get_or_create(
                    slug=data["slug"],
                    defaults={
                        "name": data["name"],
                        "description": data["description"],
                        "sort_order": data["sort_order"],
                        "product_count": data["product_count"],
                        "is_active": True,
                        "parent": parent,
                        "created_at": now().date(),
                        "updated_at": now().date(),
                    }
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(f"Created subcategory {subcat.name}"))
