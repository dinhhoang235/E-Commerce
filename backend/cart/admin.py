from django.contrib import admin
from .models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ('total_price',)


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_items', 'total_price', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('total_items', 'total_price', 'created_at', 'updated_at')
    inlines = [CartItemInline]

    def has_add_permission(self, request):
        return False


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('cart', 'product_variant', 'quantity', 'total_price', 'created_at')
    list_filter = ('created_at', 'updated_at', 'product_variant__color__name', 'product_variant__storage')
    search_fields = ('cart__user__username', 'product_variant__product__name')
    readonly_fields = ('total_price', 'created_at', 'updated_at')
    list_select_related = ('cart__user', 'product_variant__product', 'product_variant__color')

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'cart__user', 
            'product_variant__product', 
            'product_variant__color'
        )
