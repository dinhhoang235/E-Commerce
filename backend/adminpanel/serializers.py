from rest_framework import serializers
from .models import StoreSettings

class StoreSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreSettings
        fields = [
            'store_name',
            'store_description', 
            'store_email',
            'store_phone',
            'currency',
            'timezone',
            'email_notifications',
            'order_notifications',
            'inventory_alerts',
            'maintenance_mode',
            'allow_guest_checkout',
            'require_email_verification',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def validate_store_email(self, value):
        """Validate store email format"""
        if not value:
            raise serializers.ValidationError("Store email is required.")
        return value
    
    def validate_store_name(self, value):
        """Validate store name"""
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError("Store name must be at least 2 characters long.")
        return value.strip()
    
    def validate_store_phone(self, value):
        """Basic phone validation"""
        if value and len(value.strip()) < 10:
            raise serializers.ValidationError("Please enter a valid phone number.")
        return value
