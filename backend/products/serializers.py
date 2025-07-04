from rest_framework import serializers
from .models import Category, Product

class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)
    parent_id = serializers.IntegerField(source='parent.id', allow_null=True, required=False)
    image = serializers.SerializerMethodField()
    image_file = serializers.ImageField(write_only=True, required=False)
    
    class Meta:
        model = Category
        fields = '__all__'
        
    def get_image(self, obj):
        request = self.context.get("request")
        if obj.image and hasattr(obj.image, 'url'):
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None
    
    def create(self, validated_data):
        image_file = validated_data.pop("image_file", None)
        instance = super().create(validated_data)
        if image_file:
            instance.image = image_file
            instance.save()
        return instance

    def update(self, instance, validated_data):
        image_file = validated_data.pop("image_file", None)

        if image_file in [None, ""]:
            instance.image.delete(save=False)
            instance.image = None

        instance = super().update(instance, validated_data)

        if image_file:
            instance.image = image_file
            instance.save()
        return instance
    
class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all(), source='category', write_only=True)
    image = serializers.SerializerMethodField()
    image_file = serializers.ImageField(write_only=True, required=False)
    class Meta:
        model = Product
        fields = '__all__'

    def get_image(self, obj):
        request = self.context.get("request")
        if obj.image and hasattr(obj.image, 'url'):
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None
    
    def create(self, validated_data):
        image_file = validated_data.pop("image_file", None)
        instance = super().create(validated_data)
        if image_file:
            instance.image = image_file
            instance.save()
        return instance

    def update(self, instance, validated_data):
        image_file = validated_data.pop('image_file', None)

        if image_file in [None, ""]:
            instance.image.delete(save=False)
            instance.image = None

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if image_file:
            instance.image = image_file

        instance.save()
        return instance