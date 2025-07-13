import api from "../api"

export interface CartItem {
  id: number
  product: {
    id: number
    name: string
    price: number
    image: string
    colors: string[]
    storage: string[]
  }
  quantity: number
  color?: string
  storage?: string
  total_price: number
  created_at: string
}

export interface Cart {
  id: number
  items: CartItem[]
  total_items: number
  total_price: number
  created_at: string
  updated_at: string
}

export interface AddToCartData {
  product_id: number
  quantity?: number
  color?: string
  storage?: string
}

export interface UpdateCartItemData {
  item_id: number
  quantity: number
}

export interface PromoCodeData {
  code: string
}

export interface PromoCodeResult {
  valid: boolean
  discount_amount?: number
  discount_percentage?: number
  message: string
}

class CartService {
  // Get user's cart
  async getCart(): Promise<Cart> {
    try {
      const response = await api.get('/cart/')
      return response.data
    } catch (error) {
      console.error("Error fetching cart:", error)
      throw error
    }
  }

  // Add item to cart
  async addItem(data: AddToCartData): Promise<{ message: string; item: CartItem }> {
    try {
      console.log('Cart service sending data:', data) // Debug log
      const response = await api.post('/cart/add_item/', data)
      return response.data
    } catch (error: any) {
      console.error("Error adding item to cart:", error)
      
      // Provide more specific error messages
      if (error.response?.status === 400) {
        const errorDetail = error.response.data?.error || error.response.data?.product_id?.[0] || error.response.data?.quantity?.[0] || 'Invalid request data'
        throw new Error(errorDetail)
      } else if (error.response?.status === 401) {
        throw new Error('Please log in to add items to cart')
      } else if (error.response?.status === 404) {
        throw new Error('Product not found')
      }
      
      throw error
    }
  }

  // Update cart item quantity
  async updateItem(data: UpdateCartItemData): Promise<{ message: string; item: CartItem }> {
    try {
      const response = await api.put('/cart/update_item/', data)
      return response.data
    } catch (error) {
      console.error("Error updating cart item:", error)
      throw error
    }
  }

  // Remove item from cart
  async removeItem(itemId: number): Promise<{ message: string }> {
    try {
      const response = await api.delete('/cart/remove_item/', {
        data: { item_id: itemId }
      })
      return response.data
    } catch (error) {
      console.error("Error removing item from cart:", error)
      throw error
    }
  }

  // Clear cart
  async clearCart(): Promise<{ message: string }> {
    try {
      const response = await api.delete('/cart/clear/')
      return response.data
    } catch (error) {
      console.error("Error clearing cart:", error)
      throw error
    }
  }

  // Get cart items count
  async getCartCount(): Promise<{ count: number }> {
    try {
      const response = await api.get('/cart/count/')
      return response.data
    } catch (error) {
      console.error("Error fetching cart count:", error)
      throw error
    }
  }

  // Get cart summary
  async getCartSummary(): Promise<{ total_items: number; total_price: number }> {
    try {
      const response = await api.get('/cart/summary/')
      return response.data
    } catch (error) {
      console.error("Error fetching cart summary:", error)
      throw error
    }
  }

  // Apply promo code (placeholder for future backend implementation)
  async applyPromoCode(data: PromoCodeData): Promise<PromoCodeResult> {
    try {
      // For now, return mock data until backend endpoint is implemented
      const mockPromoCodes: Record<string, PromoCodeResult> = {
        'APPLE10': {
          valid: true,
          discount_percentage: 10,
          message: 'Promo code applied successfully! 10% discount applied.'
        },
        'SAVE20': {
          valid: true,
          discount_amount: 20,
          message: 'Promo code applied successfully! $20 discount applied.'
        }
      }

      const result = mockPromoCodes[data.code.toUpperCase()]
      if (result) {
        return result
      }

      return {
        valid: false,
        message: 'Invalid promo code'
      }

      // TODO: Replace with actual API call when backend is ready
      // const response = await api.post('/cart/apply_promo/', data)
      // return response.data
    } catch (error) {
      console.error("Error applying promo code:", error)
      throw error
    }
  }
}

export const cartService = new CartService()
