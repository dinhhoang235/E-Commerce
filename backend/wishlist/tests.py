from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from .models import Wishlist, WishlistItem
from products.models import Product, Category


class WishlistModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )
        self.product = Product.objects.create(
            name='Test Product',
            category=self.category,
            price=99.99
        )

    def test_wishlist_creation(self):
        """Test wishlist is created correctly"""
        wishlist = Wishlist.objects.create(user=self.user)
        self.assertEqual(str(wishlist), f"{self.user.username}'s Wishlist")
        self.assertEqual(wishlist.total_items, 0)

    def test_wishlist_item_creation(self):
        """Test wishlist item is created correctly"""
        wishlist = Wishlist.objects.create(user=self.user)
        wishlist_item = WishlistItem.objects.create(
            wishlist=wishlist,
            product=self.product
        )
        self.assertEqual(wishlist.total_items, 1)
        self.assertEqual(str(wishlist_item), f"{self.product.name} in {self.user.username}'s wishlist")


class WishlistAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )
        self.product = Product.objects.create(
            name='Test Product',
            category=self.category,
            price=99.99
        )
        self.client.force_authenticate(user=self.user)

    def test_get_empty_wishlist(self):
        """Test retrieving empty wishlist"""
        url = reverse('wishlist:wishlist-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_items'], 0)

    def test_add_item_to_wishlist(self):
        """Test adding item to wishlist"""
        url = reverse('wishlist:wishlist-add-item')
        data = {'product_id': self.product.id}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('message', response.data)

    def test_add_duplicate_item(self):
        """Test adding duplicate item to wishlist"""
        # Add item first time
        url = reverse('wishlist:wishlist-add-item')
        data = {'product_id': self.product.id}
        self.client.post(url, data)
        
        # Try to add same item again
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_remove_item_from_wishlist(self):
        """Test removing item from wishlist"""
        # Add item first
        wishlist = Wishlist.objects.create(user=self.user)
        WishlistItem.objects.create(wishlist=wishlist, product=self.product)
        
        # Remove item
        url = reverse('wishlist:wishlist-remove-item')
        data = {'product_id': self.product.id}
        response = self.client.delete(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_toggle_item(self):
        """Test toggling item in wishlist"""
        url = reverse('wishlist:wishlist-toggle-item')
        data = {'product_id': self.product.id}
        
        # First toggle should add item
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['action'], 'added')
        
        # Second toggle should remove item
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['action'], 'removed')

    def test_check_item_in_wishlist(self):
        """Test checking if item is in wishlist"""
        url = reverse('wishlist:wishlist-check-item')
        
        # Check item not in wishlist
        response = self.client.get(url, {'product_id': self.product.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['in_wishlist'])
        
        # Add item to wishlist
        wishlist = Wishlist.objects.create(user=self.user)
        WishlistItem.objects.create(wishlist=wishlist, product=self.product)
        
        # Check item is in wishlist
        response = self.client.get(url, {'product_id': self.product.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['in_wishlist'])

    def test_clear_wishlist(self):
        """Test clearing all items from wishlist"""
        # Add some items first
        wishlist = Wishlist.objects.create(user=self.user)
        WishlistItem.objects.create(wishlist=wishlist, product=self.product)
        
        url = reverse('wishlist:wishlist-clear')
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('items removed', response.data['message'])

    def test_wishlist_count(self):
        """Test getting wishlist count"""
        url = reverse('wishlist:wishlist-count')
        
        # Empty wishlist
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)
        
        # Add item
        wishlist = Wishlist.objects.create(user=self.user)
        WishlistItem.objects.create(wishlist=wishlist, product=self.product)
        
        # Check count
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
