from django.core.management.base import BaseCommand
from django.utils.text import slugify
from django.utils.timezone import now
from products.models import Product, Category

PRODUCTS_DATA = [
    {
        "name": "Iphone 15 Pro Max",
        "category_slug": "iphone-pro",
        "rating": "0",
        "reviews": "0",
        "badge": "New",
        "description": "The ultimate iPhone with titanium design and A17 Pro chip",
        "full_description": "iPhone 15 Pro Max is the most advanced iPhone ever. Featuring a strong and lightweight titanium design with the most powerful iPhone camera system ever. A17 Pro, the industry's first 3-nanometer chip delivers incredible performance and enables next-level Apple Intelligence and gaming experiences. The new Action button is customizable, and USB-C comes to iPhone with USB 3 speeds.",
        "features": [
            "A17 Pro chip for breakthrough performance and mobile gaming",
            "Titanium design, lighter and stronger with industry-leading durability",
            "Pro camera system with 48MP Main camera and 5x Telephoto",
            "USB-C connector with USB 3 for up to 20x faster transfer speeds",
            "New Action button to customize for your favorite feature",
            "All-day battery life with up to 29 hours video playback",
        ],
    },
    {
        "name": "Iphone 15 Pro",
        "category_slug": "iphone-pro",
        "rating": "0",
        "reviews": "0",
        "badge": "Best Seller",
        "description": "Pro performance with titanium and advanced camera system",
        "full_description": "iPhone 15 Pro is designed with aerospace-grade titanium, making it both strong and light. The A17 Pro chip delivers incredible performance for demanding workflows and console-level gaming. The advanced camera system includes a 48MP Main camera with multiple focal lengths, a 3x Telephoto camera, and improved Ultra Wide camera. The customizable Action button gives you quick access to your favorite feature.",
        "features": [
            "A17 Pro chip for breakthrough performance",
            "Titanium design with the thinnest borders ever on iPhone",
            "Pro camera system with 48MP Main camera and 3x Telephoto",
            "USB-C connector with USB 3 for faster transfer speeds",
            "New Action button to customize for your favorite feature",
            "All-day battery life with up to 23 hours video playback",
        ],
    },
    {
        "name": "Iphone 15 ",
        "category_slug": "iphone",
        "rating": "0",
        "reviews": "0",
        "badge": "New",
        "description": "The new iPhone with Dynamic Island and 48MP camera",
        "full_description": "iPhone 15 brings Dynamic Island to the standard iPhone lineup, featuring a 48MP Main camera with 2x optical-quality Telephoto. The new contoured edge design is made with color-infused back glass and aerospace-grade aluminum. Powered by the A16 Bionic chip, it delivers incredible performance for demanding workloads and features like Apple Intelligence.",
        "features": [
            "A16 Bionic chip for powerful performance",
            "Dynamic Island for alerts and Live Activities",
            "48MP Main camera with 2x Telephoto and improved Ultra Wide",
            "USB-C connector for universal charging and accessories",
            "All-day battery life with up to 20 hours video playback",
            "Emergency SOS via satellite and Crash Detection",
        ],
    },
    {
        "name": "Ipad Pro 12.9 M2 ",
        "category_slug": "ipad-pro",
        "rating": "0",
        "reviews": "0",
        "badge": "Pro",
        "description": "The ultimate iPad experience with M2 chip",
        "full_description": "The iPad Pro with M2 delivers extreme performance, all-day battery life, and a breathtaking 12.9-inch Liquid Retina XDR display. The M2 chip features an 8-core CPU and 10-core GPU, delivering up to 15% faster CPU performance and up to 35% faster GPU performance compared to the previous generation. With ProMotion, True Tone, and P3 wide color, the display offers an unmatched viewing experience.",
        "features": [
            "M2 chip with 8-core CPU and 10-core GPU",
            "12.9-inch Liquid Retina XDR display with ProMotion and True Tone",
            "12MP Wide camera and 10MP Ultra Wide camera",
            "12MP Ultra Wide front camera with Center Stage",
            "All-day battery life with up to 10 hours of web surfing",
            "Thunderbolt / USB 4 port for high-speed accessories",
        ],
    },
    {
        "name": "Ipad Air",
        "category_slug": "ipad",
        "rating": "0",
        "reviews": "0",
        "badge": "Popular",
        "description": "Powerful, colorful, and versatile",
        "full_description": "iPad Air is a powerful and versatile tablet that features the Apple M1 chip for next-level performance. The 10.9-inch Liquid Retina display makes everything look stunning. With Touch ID built into the top button, you get secure authentication and Apple Pay. The 12MP Ultra Wide front camera with Center Stage keeps you in frame during video calls.",
        "features": [
            "M1 chip with 8-core CPU and 8-core GPU",
            "10.9-inch Liquid Retina display with True Tone",
            "12MP Wide back camera",
            "12MP Ultra Wide front camera with Center Stage",
            "Available in five gorgeous colors",
            "Works with Apple Pencil (2nd generation) and Magic Keyboard",
        ],
    },
    {
        "name": "Ipad mini",
        "category_slug": "ipad",
        "rating": "0",
        "reviews": "0",
        "badge": "New",
        "description": "The full iPad experience in an ultra-portable design",
        "full_description": "iPad mini is meticulously designed to be ultra-portable while still delivering the full iPad experience. The 8.3-inch Liquid Retina display features True Tone, P3 wide color, and ultra-low reflectivity. The A15 Bionic chip delivers incredible performance with all-day battery life. With landscape stereo speakers and Touch ID in the top button, iPad mini is the perfect compact tablet.",
        "features": [
            "A15 Bionic chip with 6-core CPU and 5-core GPU",
            "8.3-inch Liquid Retina display with True Tone and P3 wide color",
            "12MP Wide back camera",
            "12MP Ultra Wide front camera with Center Stage",
            "USB-C connector for charging and accessories",
            "Works with Apple Pencil (2nd generation)",
        ],
    },
    {
        "name": "MacBook Pro 14 M3",
        "category_slug": "macbook",
        "rating": "0",
        "reviews": "0",
        "badge": "New",
        "description": "Supercharged for pros with M3 chip",
        "full_description": "The MacBook Pro 14-inch with M3 delivers exceptional performance in a portable design. The M3 chip features an 8-core CPU and 10-core GPU for faster processing and graphics performance. The 14.2-inch Liquid Retina XDR display with ProMotion technology delivers extreme dynamic range with incredible detail. With up to 18 hours of battery life, you can work or play all day long.",
        "features":  [
            "M3 chip with 8-core CPU and 10-core GPU",
            "Up to 24GB unified memory",
            "14.2-inch Liquid Retina XDR display with ProMotion",
            "Up to 2TB SSD storage",
            "Up to 18 hours of battery life",
            "Three Thunderbolt 4 ports, HDMI port, SDXC card slot, MagSafe 3 port",
        ],
    },
    {
        "name": "MacBook Air 13 M2",
        "category_slug": "macbook",
        "rating": "0",
        "reviews": "0",
        "badge": "Best Seller",
        "description": "Strikingly thin and fast with M2 chip",
        "full_description": "The MacBook Air 13-inch with M2 redefines what a thin and light laptop can do. With a stunning design that's just 11.3mm thin and 2.7 pounds, it still delivers incredible performance and up to 18 hours of battery life. The 13.6-inch Liquid Retina display supports one billion colors, and the fanless design ensures silent operation even during intensive tasks.",
        "features": [
            "M2 chip with 8-core CPU and up to 10-core GPU",
            "Up to 24GB unified memory",
            "13.6-inch Liquid Retina display with True Tone",
            "1080p FaceTime HD camera",
            "MagSafe charging port and two Thunderbolt ports",
            "Four-speaker sound system with Spatial Audio",
        ],
    },
]

class Command(BaseCommand):
    help = "Seed sample Products"

    def handle(self, *args, **kwargs):
        for pdata in PRODUCTS_DATA:
            category = Category.objects.filter(slug=pdata["category_slug"]).first()
            if not category:
                self.stdout.write(self.style.WARNING(f"Category {pdata['category_slug']} not found, skipping {pdata['name']}"))
                continue

            product, created = Product.objects.get_or_create(
                name=pdata["name"],
                category=category,
                defaults={
                    "description": pdata["description"],
                    "full_description": pdata["full_description"],
                    "features": pdata["features"],  # JSONField
                    "badge": pdata["badge"],
                    "rating": pdata["rating"],
                    "reviews": pdata["reviews"],
                }
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f"Created product {product.name}"))
            else:
                self.stdout.write(self.style.WARNING(f"Product already exists: {product.name}"))