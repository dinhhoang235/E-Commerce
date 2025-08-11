import api from "@/lib/api"

// Types based on the backend models and serializers
export interface OrderItem {
  id: number
  product: number
  product_name: string
  product_price: string
  product_image?: string
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
  status: "pending" | "processing" | "shipped" | "completed" | "cancelled" | "delivered"
  date: string
  shipping: ShippingInfo
  items?: OrderItem[]
  is_paid?: boolean
  payment_status?: "pending" | "success" | "failed" | "refunded" | "canceled" | "cancelled" | "no_payment"
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
      
      // Handle both direct array and paginated response
      if (Array.isArray(response.data)) {
        return response.data
      } else if (response.data && Array.isArray(response.data.results)) {
        return response.data.results
      } else {
        console.log("Unexpected API response format:", response.data)
        return []
      }
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
    try {
      // Use the string-based endpoint: <str:order_id>/cancel/
      const response = await api.post(`/orders/${orderId}/cancel/`)
      
      // The function view returns a simple response, so fetch the updated order
      const updatedOrder = await this.getOrderById(orderId)
      return updatedOrder
    } catch (error: any) {
      console.error("Error cancelling order:", error)
      // Provide more specific error messages
      if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Cannot cancel this order')
      } else if (error.response?.status === 404) {
        throw new Error('Order not found')
      }
      throw error
    }
  },

  // Check if order can be cancelled - using a simplified approach
  async canCancelOrder(orderId: string): Promise<{ can_cancel: boolean; reason?: string }> {
    try {
      // Since the can-cancel endpoint expects int but we have strings,
      // let's fetch the order and check status client-side
      const order = await this.getOrderById(orderId)
      const canCancel = order.status === 'pending' || order.status === 'processing'
      
      return {
        can_cancel: canCancel,
        reason: canCancel 
          ? 'Order can be cancelled' 
          : `Cannot cancel order with status: ${order.status}`
      }
    } catch (error: any) {
      console.error("Error checking if order can be cancelled:", error)
      if (error.response?.status === 404) {
        return { can_cancel: false, reason: 'Order not found' }
      }
      return { can_cancel: false, reason: 'Unable to verify cancellation eligibility' }
    }
  },

  // Check payment status and automatically cancel if expired
  async checkPaymentStatus(orderId: string): Promise<{ expired: boolean; status: string; is_paid?: boolean; payment_deadline?: string; message?: string }> {
    try {
      const response = await api.get(`/orders/${orderId}/check-payment/`)
      return response.data
    } catch (error: any) {
      console.error("Error checking payment status:", error)
      throw error
    }
  },

  // Get cancellation details/status - simplified implementation
  async getOrderCancellation(orderId: string): Promise<any> {
    try {
      // Since the cancellation endpoint expects int but we have strings,
      // let's just return the order details
      const order = await this.getOrderById(orderId)
      return {
        order_id: order.id,
        current_status: order.status,
        is_cancelled: order.status === 'cancelled'
      }
    } catch (error) {
      console.error("Error fetching order cancellation details:", error)
      throw error
    }
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

