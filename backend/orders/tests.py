from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from products.models import Product, Category, InsufficientStockError
from users.models import Address
from .models import Order, OrderItem
from .utils import OrderManager
from decimal import Decimal


class StockManagementTestCase(TestCase):
    def setUp(self):
        """Set up test data"""
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test category
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )
        
        # Create test products
        self.product1 = Product.objects.create(
            name='Test Product 1',
            category=self.category,
            price=Decimal('99.99'),
            stock=10,
            is_in_stock=True
        )
        
        self.product2 = Product.objects.create(
            name='Test Product 2',
            category=self.category,
            price=Decimal('149.99'),
            stock=5,
            is_in_stock=True
        )
        
        # Create test address
        self.address = Address.objects.create(
            user=self.user,
            street='123 Test St',
            city='Test City',
            state='TS',
            zip_code='12345',
            country='Test Country'
        )

    def test_stock_reduction_on_order_creation(self):
        """Test that stock is reduced when an order is created"""
        initial_stock = self.product1.stock
        
        # Create order with OrderManager
        items_data = [
            {'product_id': self.product1.id, 'quantity': 3}
        ]
        
        order = OrderManager.create_order(
            user=self.user,
            items_data=items_data,
            shipping_address=self.address
        )
        
        # Refresh product from database
        self.product1.refresh_from_db()
        
        # Check stock was reduced
        self.assertEqual(self.product1.stock, initial_stock - 3)
        self.assertEqual(self.product1.sold, 3)
        self.assertTrue(self.product1.is_in_stock)

    def test_insufficient_stock_error(self):
        """Test that InsufficientStockError is raised when stock is insufficient"""
        items_data = [
            {'product_id': self.product1.id, 'quantity': 15}  # More than available stock (10)
        ]
        
        with self.assertRaises(InsufficientStockError):
            OrderManager.create_order(
                user=self.user,
                items_data=items_data,
                shipping_address=self.address
            )
        
        # Check stock wasn't changed
        self.product1.refresh_from_db()
        self.assertEqual(self.product1.stock, 10)
        self.assertEqual(self.product1.sold, 0)

    def test_stock_restoration_on_order_cancellation(self):
        """Test that stock is restored when an order is cancelled"""
        # Create order
        items_data = [
            {'product_id': self.product1.id, 'quantity': 3}
        ]
        
        order = OrderManager.create_order(
            user=self.user,
            items_data=items_data,
            shipping_address=self.address
        )
        
        # Check initial stock reduction
        self.product1.refresh_from_db()
        self.assertEqual(self.product1.stock, 7)
        self.assertEqual(self.product1.sold, 3)
        
        # Cancel order
        OrderManager.cancel_order(order)
        
        # Check stock restoration
        self.product1.refresh_from_db()
        self.assertEqual(self.product1.stock, 10)
        self.assertEqual(self.product1.sold, 0)
        
        # Check order status
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')

    def test_order_item_quantity_update(self):
        """Test updating order item quantity with stock validation"""
        # Create order
        items_data = [
            {'product_id': self.product1.id, 'quantity': 2}
        ]
        
        order = OrderManager.create_order(
            user=self.user,
            items_data=items_data,
            shipping_address=self.address
        )
        
        order_item = order.items.first()
        
        # Update quantity (increase)
        OrderManager.update_order_quantity(order_item, 5)
        
        # Check stock
        self.product1.refresh_from_db()
        self.assertEqual(self.product1.stock, 5)  # 10 - 5
        self.assertEqual(self.product1.sold, 5)
        
        # Update quantity (decrease)
        OrderManager.update_order_quantity(order_item, 3)
        
        # Check stock
        self.product1.refresh_from_db()
        self.assertEqual(self.product1.stock, 7)  # 10 - 3
        self.assertEqual(self.product1.sold, 3)

    def test_stock_status_update(self):
        """Test that is_in_stock is updated correctly"""
        # Reduce stock to 0
        self.product1.reduce_stock(10)
        
        self.product1.refresh_from_db()
        self.assertEqual(self.product1.stock, 0)
        self.assertFalse(self.product1.is_in_stock)
        
        # Increase stock
        self.product1.increase_stock(5)
        
        self.product1.refresh_from_db()
        self.assertEqual(self.product1.stock, 5)
        self.assertTrue(self.product1.is_in_stock)

    def test_multiple_products_order(self):
        """Test order with multiple products"""
        items_data = [
            {'product_id': self.product1.id, 'quantity': 2},
            {'product_id': self.product2.id, 'quantity': 1}
        ]
        
        order = OrderManager.create_order(
            user=self.user,
            items_data=items_data,
            shipping_address=self.address
        )
        
        # Check both products' stock
        self.product1.refresh_from_db()
        self.product2.refresh_from_db()
        
        self.assertEqual(self.product1.stock, 8)  # 10 - 2
        self.assertEqual(self.product2.stock, 4)  # 5 - 1
        
        # Check order total
        expected_total = (self.product1.price * 2) + (self.product2.price * 1)
        self.assertEqual(order.total, expected_total)

    def test_order_item_validation(self):
        """Test OrderItem model validation"""
        order = Order.objects.create(
            id='TEST-001',
            user=self.user,
            total=Decimal('99.99')
        )
        
        # Test valid order item
        order_item = OrderItem(
            order=order,
            product=self.product1,
            quantity=5,
            price=self.product1.price
        )
        
        # Should not raise validation error
        order_item.full_clean()
        
        # Test invalid order item (insufficient stock)
        order_item_invalid = OrderItem(
            order=order,
            product=self.product1,
            quantity=15,  # More than available
            price=self.product1.price
        )
        
        with self.assertRaises(ValidationError):
            order_item_invalid.full_clean()

    def test_low_stock_detection(self):
        """Test low stock detection utility"""
        # Set product1 stock to 5 (below threshold of 10)
        self.product1.stock = 5
        self.product1.save()
        
        low_stock_products = OrderManager.get_low_stock_products(threshold=10)
        self.assertIn(self.product1, low_stock_products)
        self.assertNotIn(self.product2, low_stock_products)  # stock is 5, same as threshold
        
        # Test out of stock detection
        self.product1.stock = 0
        self.product1.is_in_stock = False
        self.product1.save()
        
        out_of_stock_products = OrderManager.get_out_of_stock_products()
        self.assertIn(self.product1, out_of_stock_products)
        self.assertNotIn(self.product2, out_of_stock_products)
