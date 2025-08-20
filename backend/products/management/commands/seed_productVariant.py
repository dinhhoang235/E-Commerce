from django.core.management.base import BaseCommand
from products.models import Product, ProductVariant, ProductColor

VARIANTS_DATA = [
    {
        "product_name": "Iphone 15 Pro Max",
        "variants": [
            {"color": "Natural Titanium", "storage": "256GB", "price": 1299, "stock": 20},
            {"color": "Natural Titanium", "storage": "512GB", "price": 1399, "stock": 30},
            {"color": "Natural Titanium", "storage": "1TB", "price": 1499, "stock": 50},
            {"color": "Blue Titanium", "storage": "256GB", "price": 1299, "stock": 50},
            {"color": "Blue Titanium", "storage": "512GB", "price": 1399, "stock": 60},
            {"color": "Blue Titanium", "storage": "1TB", "price": 1499, "stock": 20},
            {"color": "Black Titanium", "storage": "256GB", "price": 1299, "stock": 30},
            {"color": "Black Titanium", "storage": "512GB", "price": 1399, "stock": 40},
            {"color": "Black Titanium", "storage": "1TB", "price": 1499, "stock": 50},
        ]
    },
    {
        "product_name": "Iphone 15 Pro",
        "variants": [
            {"color": "Natural Titanium", "storage": "256GB", "price": 1099, "stock": 50},
            {"color": "Natural Titanium", "storage": "512GB", "price": 1199, "stock": 20},
            {"color": "Natural Titanium", "storage": "1TB", "price": 1299, "stock": 30},
            {"color": "Blue Titanium", "storage": "256GB", "price": 1099, "stock": 20},
            {"color": "Blue Titanium", "storage": "512GB", "price": 1199, "stock": 40},
            {"color": "Blue Titanium", "storage": "1TB", "price": 1299, "stock": 30},
            {"color": "Black Titanium", "storage": "256GB", "price": 1099, "stock": 60},
            {"color": "Black Titanium", "storage": "512GB", "price": 1199, "stock": 20},
            {"color": "Black Titanium", "storage": "1TB", "price": 1299, "stock": 30},
        ]
    },
    {
        "product_name": "Iphone 15",
        "variants": [
            {"color": "Black", "storage": "128GB", "price": 799, "stock": 20},
            {"color": "Black", "storage": "256GB", "price": 899, "stock": 30},
            {"color": "Black", "storage": "512GB", "price": 999, "stock": 30},
            {"color": "Blue", "storage": "128GB", "price": 799, "stock": 50},
            {"color": "Blue ", "storage": "256GB", "price": 899, "stock": 50},
            {"color": "Blue ", "storage": "512GB", "price": 999, "stock": 10},
            {"color": "Pink", "storage": "128GB", "price": 799, "stock": 20},
            {"color": "Pink", "storage": "256GB", "price": 899, "stock": 30},
            {"color": "Pink", "storage": "512GB", "price": 999, "stock": 20},
        ]
    },
    # Ipad
    {
        "product_name": "Ipad Pro 12.9 M2",
        "variants": [
            {"color": "Space Gray", "storage": "256GB", "price": 1099, "stock": 20},
            {"color": "Space Gray", "storage": "512GB", "price": 1199, "stock": 30},
            {"color": "Space Gray", "storage": "1TB", "price": 1299, "stock": 30},
            {"color": "Starlight", "storage": "256GB", "price": 1099, "stock": 40},
            {"color": "Starlight", "storage": "512GB", "price": 1199, "stock": 50},
            {"color": "Starlight", "storage": "1TB", "price": 1299, "stock": 60},
            {"color": "Silver", "storage": "256GB", "price": 1099, "stock": 40},
            {"color": "Silver", "storage": "512GB", "price": 1199, "stock": 20},
            {"color": "Silver", "storage": "1TB", "price": 1299, "stock": 10},
        ]
    },
    {
        "product_name": "Ipad Air",
        "variants": [
            {"color": "Purple", "storage": "256GB", "price": 899, "stock": 20},
            {"color": "Purple", "storage": "512GB", "price": 999, "stock": 30},
            {"color": "Purple", "storage": "1TB", "price": 1099, "stock": 30},
            {"color": "Starlight", "storage": "256GB", "price": 899, "stock": 40},
            {"color": "Starlight", "storage": "512GB", "price": 999, "stock": 50},
            {"color": "Starlight", "storage": "1TB", "price": 1099, "stock": 60},
            {"color": "Silver", "storage": "256GB", "price": 899, "stock": 40},
            {"color": "Silver", "storage": "512GB", "price": 999, "stock": 20},
            {"color": "Silver", "storage": "1TB", "price": 1099, "stock": 10},
            {"color": "Blue", "storage": "256GB", "price": 899, "stock": 40},
            {"color": "Blue", "storage": "512GB", "price": 999, "stock": 20},
            {"color": "Blue", "storage": "1TB", "price": 1099, "stock": 10},
        ]
    },
    {
        "product_name": "Ipad mini",
        "variants": [
            {"color": "Space Gray", "storage": "128GB", "price": 699, "stock": 20},
            {"color": "Space Gray", "storage": "256GB", "price": 799, "stock": 30},
            {"color": "Space Gray", "storage": "512GB", "price": 899, "stock": 30},
            {"color": "Starlight", "storage": "128GB", "price": 699, "stock": 40},
            {"color": "Starlight", "storage": "256GB", "price": 799, "stock": 50},
            {"color": "Starlight", "storage": "512GB", "price": 899, "stock": 60},
            {"color": "Silver", "storage": "128GB", "price": 699, "stock": 40},
            {"color": "Silver", "storage": "256GB", "price": 799, "stock": 20},
            {"color": "Silver", "storage": "512GB", "price": 899, "stock": 10},
        ]
    },
    # MacBook
    {
        "product_name": "MacBook Pro 14 M3",
        "variants": [
            {"color": "Space Black", "storage": "512GB", "price": 1999, "stock": 20},
            {"color": "Space Black", "storage": "1TB", "price": 2099, "stock": 30},
            {"color": "Space Black", "storage": "2TB", "price": 2199, "stock": 30},
            {"color": "Silver", "storage": "512GB", "price": 1999, "stock": 40},
            {"color": "Silver", "storage": "1TB", "price": 2099, "stock": 20},
            {"color": "Silver", "storage": "2TB", "price": 2199, "stock": 10},
        ]
    },
    {
        "product_name": "MacBook Air 13 M2",
        "variants": [
            {"color": "Midnight", "storage": "256GB", "price": 999, "stock": 20},
            {"color": "Midnight", "storage": "512GB", "price": 1099, "stock": 30},
            {"color": "Midnight", "storage": "1TB", "price": 1199, "stock": 30},
            {"color": "Starlight", "storage": "256GB", "price": 999, "stock": 40},
            {"color": "Starlight", "storage": "512GB", "price": 1099, "stock": 50},
            {"color": "Starlight", "storage": "1TB", "price": 1199, "stock": 60},
            {"color": "Silver", "storage": "256GB", "price": 999, "stock": 40},
            {"color": "Silver", "storage": "512GB", "price": 1099, "stock": 20},
            {"color": "Silver", "storage": "1TB", "price": 1199, "stock": 10},
        ]
    },
]

class Command(BaseCommand):
    help = "Seed ProductVariant data"

    def handle(self, *args, **kwargs):
        for pdata in VARIANTS_DATA:
            product = Product.objects.filter(name=pdata["product_name"]).first()
            if not product:
                self.stdout.write(self.style.WARNING(f"Product not found: {pdata['product_name']}"))
                continue

            for v in pdata["variants"]:
                color = ProductColor.objects.filter(name=v["color"]).first()
                if not color:
                    self.stdout.write(self.style.WARNING(f"Color not found: {v['color']}"))
                    continue

                variant, created = ProductVariant.objects.get_or_create(
                    product=product,
                    color=color,
                    storage=v["storage"],
                    defaults={
                        "price": v["price"],
                        "stock": v["stock"],
                        "sold": 0,
                        "is_in_stock": v["stock"] > 0
                    }
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(
                        f"Created variant: {product.name} - {color.name} - {v['storage']}"
                    ))
                else:
                    self.stdout.write(self.style.WARNING(
                        f"Variant already exists: {product.name} - {color.name} - {v['storage']}"
                    ))