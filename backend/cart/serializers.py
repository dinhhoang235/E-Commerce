from rest_framework import serializers
from .models import Cart, CartItem
from products.serializers import ProductVariantSerializer
from products.models import ProductVariant


class CartItemSerializer(serializers.ModelSerializer):
    product_variant = ProductVariantSerializer(read_only=True)
    product_variant_id = serializers.IntegerField(write_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = ['id', 'product_variant', 'product_variant_id', 'quantity', 'total_price', 'created_at']

    def to_representation(self, instance):
        # Get the standard representation
        representation = super().to_representation(instance)
        # Pass request context to nested ProductVariantSerializer
        if self.context.get('request'):
            variant_serializer = ProductVariantSerializer(instance.product_variant, context=self.context)
            representation['product_variant'] = variant_serializer.data
        return representation

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value

    def validate(self, data):
        # Get product variant to validate stock availability
        try:
            product_variant = ProductVariant.objects.get(id=data['product_variant_id'])
        except ProductVariant.DoesNotExist:
            raise serializers.ValidationError("Product variant does not exist")

        # Validate stock availability
        if not product_variant.check_stock_availability(data['quantity']):
            raise serializers.ValidationError(
                f"Insufficient stock for {product_variant}. "
                f"Available: {product_variant.stock}, Requested: {data['quantity']}"
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
    product_variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(default=1)

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value

    def validate_product_variant_id(self, value):
        try:
            ProductVariant.objects.get(id=value)
        except ProductVariant.DoesNotExist:
            raise serializers.ValidationError("Product variant does not exist")
        return value


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField()

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        return value
