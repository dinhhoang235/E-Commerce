"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, CreditCard } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCart } from "@/components/cart-provider"
import { paymentService, CartItem, ShippingAddress } from "@/lib/services/payments"

interface DirectPaymentButtonProps {
  shippingAddress: ShippingAddress
  shippingMethod?: string
  disabled?: boolean
  children?: React.ReactNode
  className?: string
  total?: number // Optional override for total amount
  onPaymentStart?: () => void
  onPaymentError?: (error: string) => void
}

export default function DirectPaymentButton({
  shippingAddress,
  shippingMethod = 'standard',
  disabled = false,
  children,
  className = "",
  total: overrideTotal,
  onPaymentStart,
  onPaymentError,
}: DirectPaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { items, total } = useCart()
  
  // Use override total if provided, otherwise use cart total
  const finalTotal = overrideTotal !== undefined ? overrideTotal : total

  const handlePayment = async () => {
    if (!items || items.length === 0) {
      const error = "Cart is empty"
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: error,
      })
      onPaymentError?.(error)
      return
    }

    setIsLoading(true)
    onPaymentStart?.()

    try {
      // Convert cart items to the format expected by the API
      const cartItems: CartItem[] = items.map(item => {
        // Create a meaningful description from available data
        let description = `Product ID: ${item.id}`
        if (item.color) description += `, Color: ${item.color}`
        if (item.storage) description += `, Storage: ${item.storage}`
        
        return {
          product_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price.toString(),
          description: description
        }
      })

      // Create checkout session from cart - Stripe will handle tax calculation
      const { checkout_url } = await paymentService.createCheckoutSessionFromCart(
        cartItems,
        shippingAddress,
        shippingMethod
      )
      
      // Redirect to Stripe checkout
      paymentService.redirectToCheckout(checkout_url)
    } catch (error: any) {
      console.error('Payment initiation failed:', error)
      const errorMessage = error.message || 'Failed to initiate payment'
      
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: errorMessage,
      })
      
      onPaymentError?.(errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isLoading || !items || items.length === 0}
      className={`relative ${className}`}
      size="lg"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4 mr-2" />
          {children || `Pay $${finalTotal.toFixed(2)}`}
        </>
      )}
    </Button>
  )
}
