"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { cartService, type Cart, type CartItem as APICartItem, type AddToCartData, findProductVariantId } from "@/lib/services/cart"
import { useAuth } from "@/components/auth-provider"

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  image: string
  itemId: number // API cart item ID
  color?: string
  storage?: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity" | "itemId"> & { productId: number; color?: string; storage?: string }) => Promise<void>
  removeItem: (itemId: number) => Promise<void>
  updateQuantity: (itemId: number, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  total: number
  loading: boolean
  error: string | null
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

// Helper function to convert API cart item to local cart item format
const convertAPICartItem = (apiItem: APICartItem): CartItem => {
  const variant = apiItem.product_variant
  const product = variant.product
  const price = typeof variant.price === 'string' ? parseFloat(variant.price) : variant.price
  
  return {
    id: product.id,
    itemId: apiItem.id,
    name: product.name,
    price: isNaN(price) ? 0 : price,
    quantity: apiItem.quantity,
    image: product.image || '',
    color: variant.color?.name,
    storage: variant.storage,
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Load cart when user changes
  useEffect(() => {
    if (user) {
      refreshCart()
    } else {
      setItems([])
    }
  }, [user])

  const refreshCart = useCallback(async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)
      const cart = await cartService.getCart()
      const convertedItems = cart.items.map(convertAPICartItem)
      setItems(convertedItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart')
      console.error('Error loading cart:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const addItem = async (newItem: Omit<CartItem, "quantity" | "itemId"> & { productId: number; color?: string; storage?: string }) => {
    if (!user) {
      setError("Please login to add items to cart")
      return
    }

    // Validate required fields
    if (!newItem.productId || newItem.productId <= 0) {
      setError("Invalid product ID")
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      // Find the product variant ID based on product, color, and storage
      const variantId = await findProductVariantId(newItem.productId, newItem.color, newItem.storage)
      
      if (!variantId) {
        setError(`Product variant not found for ${newItem.name} with color: ${newItem.color || 'none'} and storage: ${newItem.storage || 'none'}. Please select a valid color and storage option.`)
        return
      }
      
      const addData: AddToCartData = {
        product_variant_id: variantId,
        quantity: 1,
      }
      
      await cartService.addItem(addData)
      await refreshCart() // Refresh cart to get updated data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item to cart'
      setError(errorMessage)
      console.error('Error adding item to cart:', err)
    } finally {
      setLoading(false)
    }
  }

  const removeItem = async (itemId: number) => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)
      await cartService.removeItem(itemId)
      await refreshCart() // Refresh cart to get updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item from cart')
      console.error('Error removing item from cart:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId: number, quantity: number) => {
    if (!user) return
    
    if (quantity <= 0) {
      await removeItem(itemId)
      return
    }

    try {
      setLoading(true)
      setError(null)
      await cartService.updateItem({ item_id: itemId, quantity })
      await refreshCart() // Refresh cart to get updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item quantity')
      console.error('Error updating item quantity:', err)
    } finally {
      setLoading(false)
    }
  }

  const clearCart = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)
      await cartService.clearCart()
      setItems([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cart')
      console.error('Error clearing cart:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const total = items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        loading,
        error,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
