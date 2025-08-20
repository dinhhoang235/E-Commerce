from django.core.management.base import BaseCommand
from products.models import ProductColor

APPLE_COLORS = [
    ("Black", "#1C1C1E"),
    ("Blue", "#0E5BA3"),
    ("Green", "#4CD964"),
    ("Yellow", "#FFCC00"),
    ("Pink", "#F875AA"),
    # Iphone 15 pro/pro max
    ("Natural Titanium", "#C4DFDF"),
    ("Blue Titanium", "#0077BE"),
    ("White Titanium", "#F5F5F0"),
    ("Black Titanium", "#000000"),
    # Ipad
    ("Space Gray", "#555555"),
    ("Purple", "#8E8E93"),
    ("Blue", "#5AC8FA"),
    ("Silver", "#E5E5EA"),
    # Macbook
    ("Space Black", "#1C1C1E"),
    ("Midnight", "#1E1F2B"),
    ("Starlight", "#E3D0C0"),
    ("Silver", "#F5F5F0"),
    ("Space Gray", "#8E8E93"),
]

class Command(BaseCommand):
    help = "Seed ProductColor data (Apple default colors)"

    def handle(self, *args, **kwargs):
        for name, hex_code in APPLE_COLORS:
            obj, created = ProductColor.objects.get_or_create(
                name=name, hex_code=hex_code
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Added color: {name} {hex_code}"))
            else:
                self.stdout.write(self.style.WARNING(f"Color already exists: {name}"))
