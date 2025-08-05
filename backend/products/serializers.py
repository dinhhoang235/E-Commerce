from rest_framework import serializers
from .models import Category, Product
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
    
class ProductSerializer(serializers.ModelSerializer, ImageHandlingMixin):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), source='category', write_only=True)
    image = serializers.SerializerMethodField()
    imageFile = serializers.ImageField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Product
        fields = '__all__'

    def get_image(self, obj):
        return self.get_image_url(obj)

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

    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'image', 'category']

    def get_image(self, obj):
        return self.get_image_url(obj) if obj.image else None

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['category'] = instance.category.name if instance.category else None
        return representation