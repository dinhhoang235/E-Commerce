from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from orders.models import Order, OrderItem
from products.models import Product
from users.models import Account
from .models import StoreSettings
from .serializers import StoreSettingsSerializer

class AdminLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email_or_username = request.data.get("email")
        password = request.data.get("password")

        if not email_or_username or not password:
            return Response(
                {"detail": "Email/username and password are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Nếu là email, tìm username tương ứng
        try:
            user_obj = User.objects.get(email=email_or_username)
            username = user_obj.username
        except User.DoesNotExist:
            username = email_or_username  # có thể là username luôn

        user = authenticate(username=username, password=password)

        if user and user.is_staff:
            return Response({
                "id": user.id,
                "email": user.email,
                "name": user.get_full_name() or user.username,
                "role": "admin" if user.is_superuser else "manager",
            })

        return Response({"detail": "Invalid credentials or insufficient permissions"}, status=status.HTTP_401_UNAUTHORIZED)


class SalesAnalyticsView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Get sales data for different time periods"""
        now = timezone.now()
        today = now.date()
        yesterday = today - timedelta(days=1)
        week_start = today - timedelta(days=today.weekday())
        last_week_start = week_start - timedelta(weeks=1)
        month_start = today.replace(day=1)
        last_month_end = month_start - timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)
        
        def get_period_data(start_date, end_date=None):
            if end_date is None:
                end_date = start_date + timedelta(days=1)
            
            orders = Order.objects.filter(
                date__date__gte=start_date,
                date__date__lt=end_date,
                status__in=['completed', 'shipped']
            )
            
            revenue = orders.aggregate(total=Sum('total'))['total'] or Decimal('0')
            order_count = orders.count()
            
            return {
                'revenue': float(revenue),
                'orders': order_count
            }
        
        def calculate_change(current, previous):
            if previous == 0:
                return "+100%" if current > 0 else "0%"
            change = ((current - previous) / previous) * 100
            return f"{'+' if change >= 0 else ''}{change:.0f}%"
        
        # Get data for each period
        today_data = get_period_data(today)
        yesterday_data = get_period_data(yesterday)
        
        this_week_data = get_period_data(week_start, today + timedelta(days=1))
        last_week_data = get_period_data(last_week_start, week_start)
        
        this_month_data = get_period_data(month_start, today + timedelta(days=1))
        last_month_data = get_period_data(last_month_start, month_start)
        
        sales_data = [
            {
                "period": "Today",
                "revenue": today_data['revenue'],
                "orders": today_data['orders'],
                "change": calculate_change(today_data['revenue'], yesterday_data['revenue'])
            },
            {
                "period": "Yesterday", 
                "revenue": yesterday_data['revenue'],
                "orders": yesterday_data['orders'],
                "change": calculate_change(yesterday_data['revenue'], 0)  # You can implement 2 days ago comparison
            },
            {
                "period": "This Week",
                "revenue": this_week_data['revenue'],
                "orders": this_week_data['orders'], 
                "change": calculate_change(this_week_data['revenue'], last_week_data['revenue'])
            },
            {
                "period": "Last Week",
                "revenue": last_week_data['revenue'],
                "orders": last_week_data['orders'],
                "change": calculate_change(last_week_data['revenue'], 0)  # You can implement 2 weeks ago comparison
            },
            {
                "period": "This Month",
                "revenue": this_month_data['revenue'],
                "orders": this_month_data['orders'],
                "change": calculate_change(this_month_data['revenue'], last_month_data['revenue'])
            },
            {
                "period": "Last Month",
                "revenue": last_month_data['revenue'],
                "orders": last_month_data['orders'],
                "change": calculate_change(last_month_data['revenue'], 0)  # You can implement 2 months ago comparison
            }
        ]
        
        return Response(sales_data)


class TopProductsView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Get top performing products"""
        from django.db.models import F
        
        # Get products with their sales data
        top_products = Product.objects.annotate(
            total_sales=Count('orderitem', filter=Q(orderitem__order__status__in=['completed', 'shipped'])),
            total_revenue=Sum(F('orderitem__price') * F('orderitem__quantity'), filter=Q(orderitem__order__status__in=['completed', 'shipped'])),
            total_views=Count('id')  # You can implement actual view tracking
        ).filter(
            total_sales__gt=0
        ).order_by('-total_revenue')[:5]
        
        products_data = []
        for product in top_products:
            products_data.append({
                "name": product.name,
                "sales": product.total_sales or 0,
                "revenue": float(product.total_revenue or 0),
                "views": product.total_views * 10  # Mock multiplier for views
            })
        
        return Response(products_data)


class CustomerMetricsView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Get customer metrics"""
        now = timezone.now()
        today = now.date()
        last_month = today - timedelta(days=30)
        two_months_ago = today - timedelta(days=60)
        
        # New customers (registered in last 30 days)
        new_customers_current = User.objects.filter(
            date_joined__date__gte=last_month
        ).count()
        
        new_customers_previous = User.objects.filter(
            date_joined__date__gte=two_months_ago,
            date_joined__date__lt=last_month
        ).count()
        
        # Returning customers (users with more than 1 order)
        returning_customers_current = User.objects.annotate(
            order_count=Count('orders', filter=Q(orders__status__in=['completed', 'shipped']))
        ).filter(order_count__gt=1).count()
        
        # Customer retention (mock calculation)
        total_customers = User.objects.count()
        retention_rate = (returning_customers_current / total_customers * 100) if total_customers > 0 else 0
        
        # Average order value
        avg_order_value = Order.objects.filter(
            status__in=['completed', 'shipped'],
            date__date__gte=last_month
        ).aggregate(avg=Avg('total'))['avg'] or Decimal('0')
        
        prev_avg_order_value = Order.objects.filter(
            status__in=['completed', 'shipped'],
            date__date__gte=two_months_ago,
            date__date__lt=last_month
        ).aggregate(avg=Avg('total'))['avg'] or Decimal('0')
        
        def calculate_change(current, previous):
            if previous == 0:
                return "+100%" if current > 0 else "0%"
            change = ((current - previous) / previous) * 100
            return f"{'+' if change >= 0 else ''}{change:.0f}%"
        
        customer_metrics = [
            {
                "metric": "New Customers",
                "value": new_customers_current,
                "change": calculate_change(new_customers_current, new_customers_previous),
                "trend": "up" if new_customers_current >= new_customers_previous else "down"
            },
            {
                "metric": "Returning Customers", 
                "value": returning_customers_current,
                "change": "+8%",  # You can implement proper calculation
                "trend": "up"
            },
            {
                "metric": "Customer Retention",
                "value": f"{retention_rate:.0f}%",
                "change": "+3%",  # You can implement proper calculation
                "trend": "up"
            },
            {
                "metric": "Avg. Order Value",
                "value": f"${float(avg_order_value):.0f}",
                "change": calculate_change(float(avg_order_value), float(prev_avg_order_value)),
                "trend": "up" if avg_order_value >= prev_avg_order_value else "down"
            }
        ]
        
        return Response(customer_metrics)


class TrafficSourcesView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Get traffic sources data (mock data as tracking requires frontend implementation)"""
        # This would typically come from analytics tools like Google Analytics
        # For now, returning mock data in the correct format
        traffic_sources = [
            {"source": "Direct", "visitors": 4520, "percentage": 45},
            {"source": "Google Search", "visitors": 3210, "percentage": 32},
            {"source": "Social Media", "visitors": 1340, "percentage": 13},
            {"source": "Email", "visitors": 890, "percentage": 9},
            {"source": "Referrals", "visitors": 240, "percentage": 2},
        ]
        
        return Response(traffic_sources)


class ConversionRateView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Calculate conversion rate based on orders vs total visitors/sessions"""
        now = timezone.now()
        today = now.date()
        yesterday = today - timedelta(days=1)
        
        # Get today's completed orders
        today_orders = Order.objects.filter(
            date__date=today,
            status__in=['completed', 'shipped']
        ).count()
        
        # Get yesterday's completed orders
        yesterday_orders = Order.objects.filter(
            date__date=yesterday,
            status__in=['completed', 'shipped']
        ).count()
        
        # Mock session/visitor data (you can replace this with real analytics data)
        # In a real implementation, you'd track page views, sessions, or unique visitors
        today_sessions = today_orders * 30 if today_orders > 0 else 100  # Assuming 30 sessions per order on average
        yesterday_sessions = yesterday_orders * 30 if yesterday_orders > 0 else 95
        
        # Calculate conversion rates
        today_conversion = (today_orders / today_sessions * 100) if today_sessions > 0 else 0
        yesterday_conversion = (yesterday_orders / yesterday_sessions * 100) if yesterday_sessions > 0 else 0
        
        # Calculate change
        def calculate_change(current, previous):
            if previous == 0:
                return "+100%" if current > 0 else "0%"
            change = ((current - previous) / previous) * 100
            return f"{'+' if change >= 0 else ''}{change:.1f}%"
        
        change = calculate_change(today_conversion, yesterday_conversion)
        trend = "up" if today_conversion >= yesterday_conversion else "down"
        
        return Response({
            "rate": f"{today_conversion:.1f}%",
            "change": change,
            "trend": trend,
            "today_orders": today_orders,
            "today_sessions": today_sessions,
            "yesterday_orders": yesterday_orders,
            "yesterday_sessions": yesterday_sessions
        })


class AnalyticsDashboardView(APIView):
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        """Get all analytics data in one request"""
        sales_view = SalesAnalyticsView()
        products_view = TopProductsView()
        customers_view = CustomerMetricsView() 
        traffic_view = TrafficSourcesView()
        conversion_view = ConversionRateView()
        
        return Response({
            "salesData": sales_view.get(request).data,
            "topProducts": products_view.get(request).data,
            "customerMetrics": customers_view.get(request).data,
            "trafficSources": traffic_view.get(request).data,
            "conversionRate": conversion_view.get(request).data
        })


class StoreSettingsView(APIView):
    """
    API view to retrieve and update store settings
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    
    def get(self, request):
        """Get current store settings"""
        try:
            settings = StoreSettings.get_settings()
            serializer = StoreSettingsSerializer(settings)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": "Failed to retrieve settings", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def put(self, request):
        """Update store settings"""
        try:
            settings = StoreSettings.get_settings()
            serializer = StoreSettingsSerializer(settings, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(
                    {
                        "message": "Settings updated successfully",
                        "data": serializer.data
                    },
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {
                        "error": "Validation failed",
                        "details": serializer.errors
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {"error": "Failed to update settings", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class StoreSettingsPartialView(APIView):
    """
    API view for partial settings updates (specific sections)
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    
    def patch(self, request, section=None):
        """Update specific section of settings"""
        try:
            settings = StoreSettings.get_settings()
            
            # Define which fields belong to which sections
            section_fields = {
                'general': ['store_name', 'store_description', 'store_email', 'store_phone', 'currency', 'timezone'],
                'notifications': ['email_notifications', 'order_notifications', 'inventory_alerts'],
                'security': ['maintenance_mode', 'allow_guest_checkout', 'require_email_verification']
            }
            
            if section and section in section_fields:
                # Filter request data to only include fields for this section
                filtered_data = {k: v for k, v in request.data.items() if k in section_fields[section]}
                serializer = StoreSettingsSerializer(settings, data=filtered_data, partial=True)
            else:
                # Update all provided fields
                serializer = StoreSettingsSerializer(settings, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(
                    {
                        "message": f"Settings {'section ' + section if section else ''} updated successfully",
                        "data": serializer.data
                    },
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {
                        "error": "Validation failed",
                        "details": serializer.errors
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {"error": "Failed to update settings", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
