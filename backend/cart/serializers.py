from rest_framework import serializers
from .models import Cart, CartItem
from products.serializers import ProductSerializer


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_id', 'quantity', 'color', 'storage', 'total_price', 'created_at']

    def to_representation(self, instance):
        # Get the standard representation
        representation = super().to_representation(instance)
        # Pass request context to nested ProductSerializer
        if self.context.get('request'):
            product_serializer = ProductSerializer(instance.product, context=self.context)
            representation['product'] = product_serializer.data
        return representation

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value

    def validate(self, data):
        # Get product to validate color and storage
        try:
            from products.models import Product
            product = Product.objects.get(id=data['product_id'])
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product does not exist")

        # Validate color if provided
        if 'color' in data and data['color']:
            if data['color'] not in product.colors:
                raise serializers.ValidationError(
                    f"Color '{data['color']}' is not available for this product"
                )

        # Validate storage if provided
        if 'storage' in data and data['storage']:
            if data['storage'] not in product.storage:
                raise serializers.ValidationError(
                    f"Storage '{data['storage']}' is not available for this product"
                )

        return data


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_items', 'total_price', 'created_at', 'updated_at']


class AddToCartSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(default=1)
    color = serializers.CharField(required=False, allow_blank=True)
    storage = serializers.CharField(required=False, allow_blank=True)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value

    def validate_product_id(self, value):
        from products.models import Product
        try:
            Product.objects.get(id=value)
        except Product.DoesNotExist:
            raise serializers.ValidationError("Product does not exist")
        return value


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField()

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value
