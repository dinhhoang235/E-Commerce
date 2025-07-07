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
