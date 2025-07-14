from rest_framework import viewsets, filters
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Case, When, IntegerField, Value, CharField
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer
from .permissions import IsAdminOrReadOnly

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]  # Remove SearchFilter for custom implementation
    filterset_fields = ['category', 'category__name']
    ordering_fields = ['name', 'price', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', '').strip()
        
        if not search:
            return queryset
        
        # Search only in product name
        # Split results into two groups: starts with vs contains
        
        # Products that start with the search term (highest priority)
        starts_with_qs = queryset.filter(name__istartswith=search)
        
        # Products that contain but don't start with the search term (lower priority)
        contains_qs = queryset.filter(
            name__icontains=search
        ).exclude(name__istartswith=search)
        
        # Combine querysets with proper ordering
        # First all products that start with search term, then all that contain it
        starts_with_annotated = starts_with_qs.annotate(
            search_rank=Value(1, output_field=IntegerField())
        )
        contains_annotated = contains_qs.annotate(
            search_rank=Value(2, output_field=IntegerField())
        )
        
        # Union and order by rank, then name
        combined_qs = starts_with_annotated.union(contains_annotated).order_by('search_rank', 'name')
        
        return combined_qs
    
    def list(self, request, *args, **kwargs):
        # Get the filtered queryset (including search logic)
        queryset = self.get_queryset()
        
        # Apply additional filters from DjangoFilterBackend
        queryset = self.filter_queryset(queryset)
        
        # Apply limit after filtering if provided
        limit = request.query_params.get('limit')
        if limit:
            try:
                limit = int(limit)
                queryset = queryset[:limit]
            except (ValueError, TypeError):
                pass
        
        # Use the default pagination if no limit is specified
        if not limit:
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)