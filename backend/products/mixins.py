from rest_framework import serializers

class ImageHandlingMixin:
    def handle_image_file(self, instance, validated_data, field_name="image", file_field_name="imageFile"):
        image_file = validated_data.pop(file_field_name, serializers.empty)

        if image_file is not serializers.empty:
            if not image_file:
                if getattr(instance, field_name):
                    getattr(instance, field_name).delete(save=False)
                setattr(instance, field_name, None)
            else:
                setattr(instance, field_name, image_file)

    def get_image_url(self, obj, field_name="image"):
        request = self.context.get("request")
        image = getattr(obj, field_name)
        if image and hasattr(image, "url"):
            return request.build_absolute_uri(image.url) if request else image.url
        return None

    def extract_image_file(self, validated_data, file_field_name="imageFile"):
        """Extract image file from validated_data to prevent model field errors"""
        return validated_data.pop(file_field_name, serializers.empty)

    def apply_image_file(self, instance, image_file, field_name="image"):
        """Apply image file to instance after creation/update"""
        if image_file is not serializers.empty:
            if image_file:
                # Delete old image if exists
                if getattr(instance, field_name):
                    getattr(instance, field_name).delete(save=False)
                setattr(instance, field_name, image_file)
            else:
                # Empty imageFile means delete existing image
                if getattr(instance, field_name):
                    getattr(instance, field_name).delete(save=False)
                setattr(instance, field_name, None)
            instance.save()
