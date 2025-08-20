import api from "../api"

// Helper function to find product variant ID based on product, color, and storage
export async function findProductVariantId(productId: number, color?: string, storage?: string): Promise<number | null> {
  try {
    // Filter by product_id to get only variants for this product
    const response = await api.get(`/product-variants/?product_id=${productId}`)
    const variants = response.data.results || response.data
    
    // Find the variant that matches the criteria
    const variant = variants.find((v: any) => {
      const colorMatch = !color || (v.color && v.color.name === color)
      const storageMatch = !storage || v.storage === storage
      
      return colorMatch && storageMatch
    })
    
    return variant ? variant.id : null
  } catch (error) {
    console.error('Error finding product variant:', error)
    return null
  }
}

export interface CartItem {
  id: number
  product_variant: {
    id: number
    product: {
      id: number
      name: string
      price: number
      image: string
      colors?: string[]
      storage?: string[]
    }
    color: {
      id: number
      name: string
      hex_code?: string
    }
    storage?: string
    price: number
    stock: number
    is_in_stock: boolean
  }
  quantity: number
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
  product_variant_id: number
  quantity?: number
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
      const response = await api.post('/cart/add_item/', data)
      return response.data
    } catch (error: any) {
      console.error("Error adding item to cart:", error)
      
      // Provide more specific error messages
      if (error.response?.status === 400) {
        const errorDetail = error.response.data?.error || error.response.data?.product_variant_id?.[0] || error.response.data?.quantity?.[0] || 'Invalid request data'
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
