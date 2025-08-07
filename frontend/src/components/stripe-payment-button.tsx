"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, CreditCard } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { paymentService } from "@/lib/services/payments"

interface StripePaymentButtonProps {
  orderId: string
  amount: number
  disabled?: boolean
  children?: React.ReactNode
  className?: string
  onPaymentStart?: () => void
  onPaymentError?: (error: string) => void
}

export default function StripePaymentButton({
  orderId,
  amount,
  disabled = false,
  children,
  className = "",
  onPaymentStart,
  onPaymentError,
}: StripePaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handlePayment = async () => {
    if (!orderId) {
      const error = "No order ID provided"
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
      // Create checkout session
      const { checkout_url } = await paymentService.createCheckoutSession(orderId)
      
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
      disabled={disabled || isLoading || !orderId}
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
          {children || `Pay $${amount.toFixed(2)}`}
        </>
      )}
    </Button>
  )
}
