"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { wishlistService, type Wishlist, type WishlistItem as APIWishlistItem } from "@/lib/services/wishlist"
import { useAuth } from "@/components/auth-provider"
import { toast } from "sonner"

interface WishlistItem {
  id: number
  productId: number
  name: string
  price: number
  originalPrice?: number
  image: string
  badge?: string
  rating: number
  reviews: number
  description: string
  colors: string[]
  storage: string[]
  addedAt: string
}

interface WishlistContextType {
  items: WishlistItem[]
  addItem: (productId: number) => Promise<boolean>
  removeItem: (productId: number) => Promise<boolean>
  toggleItem: (productId: number) => Promise<boolean>
  isInWishlist: (productId: number) => boolean
  checkWishlistItem: (productId: number) => Promise<boolean>
  clearWishlist: () => Promise<void>
  total: number
  loading: boolean
  error: string | null
  refreshWishlist: () => Promise<void>
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

// Helper function to convert API wishlist item to local wishlist item format
const convertAPIWishlistItem = (apiItem: APIWishlistItem): WishlistItem => {
  const price = typeof apiItem.product.price === 'string' ? parseFloat(apiItem.product.price) : apiItem.product.price
  const originalPrice = apiItem.product.original_price 
    ? (typeof apiItem.product.original_price === 'string' ? parseFloat(apiItem.product.original_price) : apiItem.product.original_price)
    : undefined
  
  return {
    id: apiItem.id,
    productId: apiItem.product.id,
    name: apiItem.product.name,
    price: isNaN(price) ? 0 : price,
    originalPrice: originalPrice && !isNaN(originalPrice) ? originalPrice : undefined,
    image: apiItem.product.image,
    badge: apiItem.product.badge,
    rating: apiItem.product.rating,
    reviews: apiItem.product.reviews,
    description: apiItem.product.description,
    colors: apiItem.product.colors || [],
    storage: apiItem.product.storage || [],
    addedAt: apiItem.added_at,
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Fetch wishlist data
  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setItems([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const wishlist = await wishlistService.getWishlist()
      const convertedItems = wishlist.items.map(convertAPIWishlistItem)
      setItems(convertedItems)
    } catch (error) {
      console.error('Error fetching wishlist:', error)
      setError('Failed to load wishlist')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user])

  // Refresh wishlist
  const refreshWishlist = useCallback(async () => {
    await fetchWishlist()
  }, [fetchWishlist])

  // Load wishlist when user changes
  useEffect(() => {
    if (user) {
      fetchWishlist()
    } else {
      setItems([])
    }
  }, [user, fetchWishlist])

  // Add item to wishlist
  const addItem = async (productId: number): Promise<boolean> => {
    if (!user) {
      toast.error("Please log in to add items to your wishlist")
      return false
    }

    setLoading(true)
    setError(null)
    try {
      const response = await wishlistService.addToWishlist({ product_id: productId })
      toast.success(response.message)
      await fetchWishlist() // Refresh wishlist
      return true
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || "Failed to add item to wishlist"
      toast.error(message)
      setError(message)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Remove item from wishlist
  const removeItem = async (productId: number): Promise<boolean> => {
    if (!user) {
      toast.error("Please log in to manage your wishlist")
      return false
    }

    setLoading(true)
    setError(null)
    try {
      const response = await wishlistService.removeFromWishlist(productId)
      toast.success(response.message)
      await fetchWishlist() // Refresh wishlist
      return true
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to remove item from wishlist"
      toast.error(message)
      setError(message)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Toggle item in wishlist
  const toggleItem = async (productId: number): Promise<boolean> => {
    if (!user) {
      toast.error("Please log in to manage your wishlist")
      return false
    }

    setLoading(true)
    setError(null)
    try {
      const response = await wishlistService.toggleWishlistItem({ product_id: productId })
      const message = response.action === 'added' ? "Added to wishlist" : "Removed from wishlist"
      toast.success(message)
      await fetchWishlist() // Refresh wishlist
      return true
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to update wishlist"
      toast.error(message)
      setError(message)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Check if item is in wishlist (local check)
  const isInWishlist = (productId: number): boolean => {
    return items.some(item => item.productId === productId)
  }

  // Check if item is in wishlist (API call)
  const checkWishlistItem = async (productId: number): Promise<boolean> => {
    if (!user) return false
    
    try {
      const response = await wishlistService.checkWishlistItem(productId)
      return response.in_wishlist
    } catch (error) {
      console.error('Error checking wishlist item:', error)
      return false
    }
  }

  // Clear wishlist
  const clearWishlist = async () => {
    if (!user) {
      toast.error("Please log in to manage your wishlist")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await wishlistService.clearWishlist()
      toast.success(response.message)
      setItems([])
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to clear wishlist"
      toast.error(message)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const total = items.length

  return (
    <WishlistContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        toggleItem,
        isInWishlist,
        checkWishlistItem,
        clearWishlist,
        total,
        loading,
        error,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider")
  }
  return context
}
