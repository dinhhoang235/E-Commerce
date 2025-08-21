import api from "@/lib/api"

export interface PaymentSession {
  checkout_url: string
  session_id: string
  order_id?: string
}

export interface PaymentStatus {
  status: 'pending' | 'success' | 'failed' | 'refunded' | 'canceled' | 'cancelled' | 'no_payment'
  order_status: string
  is_paid: boolean
  amount?: string
  created_at?: string
}

export interface RefundStatus {
  refund_status: 'not_refunded' | 'refunded' | 'no_payment'
  order_status: string
  is_paid?: boolean
  eligible_for_refund?: boolean
  refunded_amount?: string
  refund_date?: string
  original_amount?: string
  payment_date?: string
  refund_transaction_id?: number
  message?: string
}

export interface RefundResponse {
  success: boolean
  message: string
  order_id: string
  refund_id: string
  refunded_amount: string
  order_status: string
  transaction_id: number
}

export interface PaymentError {
  error: string
}

export interface PaymentTransaction {
  id: number
  order_id: number
  stripe_checkout_id: string
  stripe_payment_intent: string | null
  amount: string
  status: 'pending' | 'success' | 'failed' | 'refunded' | 'canceled' | 'cancelled'
  created_at: string
  order?: {
    id: number
    user: {
      first_name: string
      last_name: string
      email: string
    }
  }
}

export interface PaymentStats {
  total_transactions: number
  total_amount: number
  successful_transactions: number
  pending_transactions: number
  failed_transactions: number
  refunded_transactions: number
}

export interface CartItem {
  product_id: number
  name: string
  quantity: number
  price: string
  description?: string
}

export interface ShippingAddress {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
}

class PaymentService {
  /**
   * Create a Stripe checkout session for an order
   */
  async createCheckoutSession(orderId: string): Promise<PaymentSession> {
    try {
      const response = await api.post('/payments/create-checkout-session/', {
        order_id: orderId
      })
      return response.data
    } catch (error: any) {
      console.error('Error creating checkout session:', error)
      throw new Error(
        error.response?.data?.error || 
        'Failed to create payment session'
      )
    }
  }

  /**
   * Create a Stripe checkout session directly from cart items
   * Order will be created after successful payment
   * Stripe Tax will automatically calculate taxes based on location
   */
  async createCheckoutSessionFromCart(
    cartItems: CartItem[],
    shippingAddress: ShippingAddress,
    shippingMethod: string = 'standard'
  ): Promise<PaymentSession> {
    try {
      const requestData = {
        cart_items: cartItems,
        shipping_address: shippingAddress,
        shipping_method: shippingMethod
      }
      
      const response = await api.post('/payments/create-checkout-session-from-cart/', requestData)
      return response.data
    } catch (error: any) {
      console.error('Error creating checkout session from cart:', error)
      throw new Error(
        error.response?.data?.error || 
        'Failed to create payment session'
      )
    }
  }

  /**
   * Continue payment for an existing pending order
   */
  async continuePayment(orderId: string): Promise<PaymentSession> {
    try {
      const response = await api.post('/payments/continue-payment/', {
        order_id: orderId
      })
      return response.data
    } catch (error: any) {
      console.error('Error continuing payment:', error)
      throw new Error(
        error.response?.data?.error || 
        'Failed to continue payment'
      )
    }
  }

  /**
   * Get payment status for an order
   */
  async getPaymentStatus(orderId: string): Promise<PaymentStatus> {
    try {
      const response = await api.get(`/payments/status/${orderId}/`)
      return response.data
    } catch (error: any) {
      console.error('Error getting payment status:', error)
      throw new Error(
        error.response?.data?.error || 
        'Failed to get payment status'
      )
    }
  }

  /**
   * Process a full refund for an order
   */
  async processFullRefund(orderId: string, reason: string = 'Customer requested refund'): Promise<RefundResponse> {
    try {
      const response = await api.post('/payments/refund/', {
        order_id: orderId,
        reason: reason
      })
      return response.data
    } catch (error: any) {
      console.error('Error processing refund:', error)
      throw new Error(
        error.response?.data?.error || 
        'Failed to process refund'
      )
    }
  }

  /**
   * Get refund status for an order
   */
  async getRefundStatus(orderId: string): Promise<RefundStatus> {
    try {
      const response = await api.get(`/payments/refund-status/${orderId}/`)
      return response.data
    } catch (error: any) {
      console.error('Error getting refund status:', error)
      throw new Error(
        error.response?.data?.error || 
        'Failed to get refund status'
      )
    }
  }

  /**
   * Verify payment and create order (for development when webhooks aren't available)
   */
  async verifyPaymentAndCreateOrder(sessionId: string): Promise<{ success: boolean; order_id: string; message: string }> {
    try {
      const response = await api.post('/payments/verify-payment/', {
        session_id: sessionId
      })
      return response.data
    } catch (error: any) {
      console.error('Error verifying payment:', error)
      throw new Error(
        error.response?.data?.error || 
        'Failed to verify payment'
      )
    }
  }

  /**
   * Redirect to Stripe checkout
   */
  redirectToCheckout(checkoutUrl: string): void {
    window.location.href = checkoutUrl
  }

  /**
   * Extract session ID from URL parameters
   */
  getSessionIdFromUrl(): string | null {
    if (typeof window === 'undefined') return null
    
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('session_id')
  }

  // Admin methods
  /**
   * Get all payment transactions (admin only)
   */
  async getAdminPaymentTransactions(): Promise<PaymentTransaction[]> {
    try {
      const response = await api.get('/admin/payments/')
      return response.data
    } catch (error: any) {
      console.error('Error fetching payment transactions:', error)
      throw new Error(
        error.response?.data?.error || 
        'Failed to fetch payment transactions'
      )
    }
  }

  /**
   * Get payment statistics (admin only)
   */
  async getAdminPaymentStats(): Promise<PaymentStats> {
    try {
      const response = await api.get('/admin/payments/stats/')
      return response.data
    } catch (error: any) {
      console.error('Error fetching payment stats:', error)
      throw new Error(
        error.response?.data?.error || 
        'Failed to fetch payment stats'
      )
    }
  }
}

export const paymentService = new PaymentService()
export default paymentService
