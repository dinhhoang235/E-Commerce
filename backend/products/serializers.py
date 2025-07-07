from rest_framework import serializers
from .models import Category, Product
from .mixins import ImageHandlingMixin

class CategorySerializer(serializers.ModelSerializer, ImageHandlingMixin):
    product_count = serializers.IntegerField(read_only=True)
    parent_id = serializers.IntegerField(source='parent.id', allow_null=True, required=False)
    image = serializers.SerializerMethodField()
    imageFile = serializers.ImageField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Category
        fields = '__all__'

    def get_image(self, obj):
        return self.get_image_url(obj)

    def create(self, validated_data):
        instance = super().create(validated_data)
        self.handle_image_file(instance, validated_data)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        self.handle_image_file(instance, validated_data)
        instance = super().update(instance, validated_data)
        instance.save()
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
        # Handle image file before creating the instance
        image_file = validated_data.pop('imageFile', None)
        
        # Create the instance without the imageFile field
        instance = super().create(validated_data)
        
        # Handle the image file after creation
        if image_file is not None:
            if image_file:
                instance.image = image_file
            else:
                # Empty imageFile means delete existing image
                if instance.image:
                    instance.image.delete(save=False)
                instance.image = None
            instance.save()
        
        return instance

    def update(self, instance, validated_data):
        # Handle image file before updating
        image_file = validated_data.pop('imageFile', None)
        
        # Update the instance without the imageFile field
        instance = super().update(instance, validated_data)
        
        # Handle the image file after update
        if image_file is not None:
            if image_file:
                # Delete old image if exists
                if instance.image:
                    instance.image.delete(save=False)
                instance.image = image_file
            else:
                # Empty imageFile means delete existing image
                if instance.image:
                    instance.image.delete(save=False)
                instance.image = None
            instance.save()
        
        return instance