import api from "@/lib/api"

export interface PaymentSession {
  checkout_url: string
  session_id: string
}

export interface PaymentStatus {
  status: 'pending' | 'success' | 'failed' | 'no_payment'
  order_status: string
  is_paid: boolean
  amount?: string
  created_at?: string
}

export interface PaymentError {
  error: string
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
   */
  async createCheckoutSessionFromCart(
    cartItems: CartItem[],
    shippingAddress: ShippingAddress,
    shippingMethod: string = 'standard'
  ): Promise<PaymentSession> {
    try {
      const response = await api.post('/payments/create-checkout-session-from-cart/', {
        cart_items: cartItems,
        shipping_address: shippingAddress,
        shipping_method: shippingMethod
      })
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
}

export const paymentService = new PaymentService()
export default paymentService
