import api from "@/lib/api"

// Types based on the backend models and serializers
export interface OrderItem {
  id: number
  product: number
  product_name: string
  product_price: string
  quantity: number
  price: string
}

export interface ShippingInfo {
  address: string
  method: string
}

export interface Order {
  id: string
  customer: string
  email: string
  products: string[]
  total: string
  status: "pending" | "processing" | "shipped" | "completed" | "cancelled"
  date: string
  shipping: ShippingInfo
  items?: OrderItem[]
}

export interface OrderCreateData {
  shipping_address_id?: number
  shipping_method?: "standard" | "express" | "overnight"
  items?: Array<{
    product_id: number
    quantity: number
  }>
}

export interface OrderStats {
  total_orders: number
  pending_orders: number
  processing_orders: number
  shipped_orders: number
  completed_orders: number
  total_revenue: number
  recent_orders_30_days?: number
  recent_revenue_30_days?: number
  status_breakdown?: Array<{
    status: string
    count: number
  }>
  average_order_value?: number
}

export interface OrderHistoryResponse {
  orders: Order[]
  total: number
  page: number
  page_size: number
  has_next: boolean
}

export interface AdminOrderFilters {
  status?: string
  customer?: string
}

// Admin API Functions
export const adminOrdersApi = {
  // Get all orders for admin panel
  async getOrders(filters?: AdminOrderFilters): Promise<Order[]> {
    try {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.customer) params.append('customer', filters.customer)
      
      const url = `/orders/admin/${params.toString() ? `?${params.toString()}` : ''}`
      console.log('Making request to:', url) // Debug log
      
      const response = await api.get(url)
      console.log('Raw API response:', response) // Debug log
      
      // Check if response.data is an array
      if (Array.isArray(response.data)) {
        return response.data
      } else if (response.data && Array.isArray(response.data.results)) {
        // Handle paginated response
        return response.data.results
      } else {
        console.error('API returned unexpected format:', response.data)
        return []
      }
    } catch (error) {
      console.error("Error fetching admin orders:", error)
      throw error
    }
  },

  // Get specific order details for admin
  async getOrderById(orderId: string): Promise<Order> {
    try {
      const response = await api.get(`/orders/admin/${orderId}/`)
      return response.data
    } catch (error) {
      console.error("Error fetching order details:", error)
      throw error
    }
  },

  // Update order status (admin only)
  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    try {
      const response = await api.patch(`/orders/admin/${orderId}/`, { status })
      return response.data
    } catch (error) {
      console.error("Error updating order status:", error)
      throw error
    }
  },

  // Get order statistics for admin dashboard
  async getOrderStats(): Promise<OrderStats> {
    try {
      const response = await api.get('/orders/admin/stats/')
      return response.data
    } catch (error) {
      console.error("Error fetching order stats:", error)
      throw error
    }
  }
}

// User API Functions
export const userOrdersApi = {
  // Get user's orders
  async getMyOrders(): Promise<Order[]> {
    try {
      const response = await api.get('/orders/')
      return response.data
    } catch (error) {
      console.error("Error fetching user orders:", error)
      throw error
    }
  },

  // Get user's order history with pagination
  async getOrderHistory(page: number = 1, pageSize: number = 10): Promise<OrderHistoryResponse> {
    try {
      const response = await api.get(`/orders/history/?page=${page}&page_size=${pageSize}`)
      return response.data
    } catch (error) {
      console.error("Error fetching order history:", error)
      throw error
    }
  },

  // Get specific order details for user
  async getOrderById(orderId: string): Promise<Order> {
    try {
      const response = await api.get(`/orders/${orderId}/`)
      return response.data
    } catch (error) {
      console.error("Error fetching order details:", error)
      throw error
    }
  },

  // Create new order
  async createOrder(orderData: OrderCreateData): Promise<Order> {
    try {
      const response = await api.post('/orders/', orderData)
      return response.data
    } catch (error) {
      console.error("Error creating order:", error)
      throw error
    }
  },

  // Create order from cart
  async createOrderFromCart(orderData?: Partial<OrderCreateData>): Promise<Order> {
    try {
      const response = await api.post('/orders/create-from-cart/', orderData || {})
      return response.data
    } catch (error) {
      console.error("Error creating order from cart:", error)
      throw error
    }
  },

  // Update order status (user can only cancel pending orders)
  async updateOrderStatus(orderId: string, status: 'cancelled'): Promise<Order> {
    try {
      const response = await api.patch(`/orders/${orderId}/status/`, { status })
      return response.data
    } catch (error) {
      console.error("Error updating order status:", error)
      throw error
    }
  },

  // Cancel pending order
  async cancelOrder(orderId: string): Promise<Order> {
    return this.updateOrderStatus(orderId, 'cancelled')
  },

  // Get user's order statistics
  async getMyOrderStats(): Promise<Partial<OrderStats>> {
    try {
      const response = await api.get('/orders/stats/')
      return response.data
    } catch (error) {
      console.error("Error fetching user order stats:", error)
      throw error
    }
  }
}

// Legacy/Combined API Functions for backward compatibility
export const ordersApi = {
  ...adminOrdersApi,
  ...userOrdersApi,

  // Helper function to determine if user is admin
  isAdmin: (): boolean => {
    if (typeof window === 'undefined') return false
    const adminUser = localStorage.getItem('adminUser')
    return !!adminUser
  }
}

// Default export for easier importing
export default {
  admin: adminOrdersApi,
  user: userOrdersApi,
  combined: ordersApi
}

