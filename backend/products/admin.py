from django.contrib import admin
from .models import Category, Product, ProductVariant, ProductColor

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'parent', 'is_active', 'sort_order')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category','rating', 'reviews')
    search_fields = ('name',)

@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('product', 'color', 'storage', 'price', 'stock', 'is_in_stock')

@admin.register(ProductColor)
class ProductColorAdmin(admin.ModelAdmin):
    list_display = ('name', 'hex_code')