import api from "../api"

export interface WishlistItem {
  id: number
  product: {
    id: number
    name: string
    price: number
    image: string
    original_price?: number
    badge?: string
    rating: number
    reviews: number
    description: string
    colors: string[]
    storage: string[]
  }
  added_at: string
}

export interface Wishlist {
  id: number
  items: WishlistItem[]
  total_items: number
  created_at: string
  updated_at: string
}

export interface AddToWishlistData {
  product_id: number
}

export interface WishlistResponse {
  message: string
  item?: WishlistItem
  action?: 'added' | 'removed'
}

export interface WishlistCheckResponse {
  in_wishlist: boolean
}

export interface WishlistCountResponse {
  count: number
}

class WishlistService {
  // Get user's wishlist
  async getWishlist(): Promise<Wishlist> {
    const response = await api.get('/wishlist/')
    return response.data
  }

  // Add item to wishlist
  async addToWishlist(data: AddToWishlistData): Promise<WishlistResponse> {
    const response = await api.post('/wishlist/add_item/', data)
    return response.data
  }

  // Remove item from wishlist
  async removeFromWishlist(productId: number): Promise<WishlistResponse> {
    const response = await api.delete('/wishlist/remove_item/', {
      data: { product_id: productId }
    })
    return response.data
  }

  // Toggle item in wishlist (add if not present, remove if present)
  async toggleWishlistItem(data: AddToWishlistData): Promise<WishlistResponse> {
    const response = await api.post('/wishlist/toggle_item/', data)
    return response.data
  }

  // Check if item is in wishlist
  async checkWishlistItem(productId: number): Promise<WishlistCheckResponse> {
    const response = await api.get(`/wishlist/check_item/?product_id=${productId}`)
    return response.data
  }

  // Get wishlist items count
  async getWishlistCount(): Promise<WishlistCountResponse> {
    const response = await api.get('/wishlist/count/')
    return response.data
  }

  // Clear all items from wishlist
  async clearWishlist(): Promise<WishlistResponse> {
    const response = await api.delete('/wishlist/clear/')
    return response.data
  }
}

export const wishlistService = new WishlistService()
