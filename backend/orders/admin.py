from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['product_variant', 'quantity', 'price']
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'total', 'status', 'date', 'shipping_method']
    list_filter = ['status', 'shipping_method', 'date']
    search_fields = ['id', 'user__username', 'user__email', 'user__first_name', 'user__last_name']
    readonly_fields = ['id', 'user', 'total', 'date']
    inlines = [OrderItemInline]
    
    fieldsets = (
        ('Order Information', {
            'fields': ('id', 'user', 'date', 'total')
        }),
        ('Shipping', {
            'fields': ('shipping_address', 'shipping_method')
        }),
        ('Status', {
            'fields': ('status',)
        }),
    )
    
    def has_add_permission(self, request):
        return False  # Prevent manual order creation through admin
    
    def has_delete_permission(self, request, obj=None):
        return False  # Prevent order deletion
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing an existing object
            return self.readonly_fields + ['shipping_address']
        return self.readonly_fields


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'product_variant', 'quantity', 'price']
    list_filter = ['order__status', 'order__date']
    search_fields = ['order__id', 'product_variant__product__name']
    readonly_fields = ['order', 'product_variant', 'quantity', 'price']
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
