from rest_framework import serializers
from .models import Category, Product, ProductColor, ProductVariant
from .mixins import ImageHandlingMixin

class CategorySerializer(serializers.ModelSerializer, ImageHandlingMixin):
    product_count = serializers.IntegerField(read_only=True)
    parent_id = serializers.IntegerField(write_only=True, allow_null=True, required=False)
    image = serializers.SerializerMethodField()
    imageFile = serializers.ImageField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Category
        fields = '__all__'

    def get_image(self, obj):
        return self.get_image_url(obj)

    def to_representation(self, instance):
        # Get the standard representation
        representation = super().to_representation(instance)
        # Add parent_id to the representation
        representation['parent_id'] = instance.parent.id if instance.parent else None
        return representation

    def create(self, validated_data):
        # Extract image file first to avoid model field errors
        image_file = self.extract_image_file(validated_data)
        
        # Handle parent_id separately
        parent_id = validated_data.pop('parent_id', None)
        if parent_id is not None:
            try:
                parent = Category.objects.get(id=parent_id)
                validated_data['parent'] = parent
            except Category.DoesNotExist:
                raise serializers.ValidationError({'parent_id': 'Invalid parent category ID.'})
        
        # Create instance without imageFile
        instance = super().create(validated_data)
        
        # Apply image file after creation
        self.apply_image_file(instance, image_file)
        
        return instance

    def update(self, instance, validated_data):
        # Extract image file first to avoid model field errors
        image_file = self.extract_image_file(validated_data)
        
        # Handle parent_id separately
        parent_id = validated_data.pop('parent_id', None)
        if parent_id is not None:
            try:
                parent = Category.objects.get(id=parent_id)
                validated_data['parent'] = parent
            except Category.DoesNotExist:
                raise serializers.ValidationError({'parent_id': 'Invalid parent category ID.'})
        
        # Update instance without imageFile
        instance = super().update(instance, validated_data)
        
        # Apply image file after update
        self.apply_image_file(instance, image_file)
        
        return instance


class ProductColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductColor
        fields = '__all__'


class ProductVariantSerializer(serializers.ModelSerializer):
    color = ProductColorSerializer(read_only=True)
    color_id = serializers.PrimaryKeyRelatedField(queryset=ProductColor.objects.all(), source='color', write_only=True)
    total_stock = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductVariant
        fields = '__all__'
    
    def get_total_stock(self, obj):
        return obj.stock

    def validate(self, data):
        # Check for duplicate variant when creating
        if not self.instance:  # Creating new variant
            product = data.get('product')
            color = data.get('color')
            storage = data.get('storage')
            
            if ProductVariant.objects.filter(product=product, color=color, storage=storage).exists():
                raise serializers.ValidationError("A variant with this combination already exists.")
        
        return data


class ProductSerializer(serializers.ModelSerializer, ImageHandlingMixin):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), source='category', write_only=True)
    image = serializers.SerializerMethodField()
    imageFile = serializers.ImageField(write_only=True, required=False, allow_null=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    min_price = serializers.SerializerMethodField()
    max_price = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()
    available_colors = serializers.SerializerMethodField()
    available_storages = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_image(self, obj):
        return self.get_image_url(obj)
    
    def get_min_price(self, obj):
        """Get minimum price from all variants"""
        if obj.variants.exists():
            return obj.variants.order_by('price').first().price
        return None
    
    def get_max_price(self, obj):
        """Get maximum price from all variants"""
        if obj.variants.exists():
            return obj.variants.order_by('-price').first().price
        return None
    
    def get_total_stock(self, obj):
        """Get total stock from all variants"""
        return sum(variant.stock for variant in obj.variants.all())
    
    def get_available_colors(self, obj):
        """Get all available colors for this product"""
        colors = obj.variants.select_related('color').values_list('color__id', 'color__name', 'color__hex_code').distinct()
        return [{'id': color[0], 'name': color[1], 'hex_code': color[2]} for color in colors]
    
    def get_available_storages(self, obj):
        """Get all available storage options for this product"""
        storages = obj.variants.values_list('storage', flat=True).distinct()
        return [storage for storage in storages if storage]

    def create(self, validated_data):
        # Extract image file first to avoid model field errors
        image_file = self.extract_image_file(validated_data)
        
        # Create instance without imageFile
        instance = super().create(validated_data)
        
        # Apply image file after creation
        self.apply_image_file(instance, image_file)
        
        return instance

    def update(self, instance, validated_data):
        # Extract image file first to avoid model field errors
        image_file = self.extract_image_file(validated_data)
        
        # Update instance without imageFile
        instance = super().update(instance, validated_data)
        
        # Apply image file after update
        self.apply_image_file(instance, image_file)
        
        return instance


class ProductRecommendationSerializer(serializers.ModelSerializer, ImageHandlingMixin):
    category = CategorySerializer(read_only=True)
    image = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()
    max_price = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'min_price', 'max_price', 'image', 'category', 'total_stock', 'rating', 'reviews']

    def get_image(self, obj):
        return self.get_image_url(obj) if obj.image else None
    
    def get_min_price(self, obj):
        """Get minimum price from all variants"""
        if obj.variants.exists():
            return obj.variants.order_by('price').first().price
        return None
    
    def get_max_price(self, obj):
        """Get maximum price from all variants"""
        if obj.variants.exists():
            return obj.variants.order_by('-price').first().price
        return None
    
    def get_total_stock(self, obj):
        """Get total stock from all variants"""
        return sum(variant.stock for variant in obj.variants.all())

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['category'] = instance.category.name if instance.category else None
        return representation