import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CreditCard, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { paymentService } from "@/lib/services/payments"
import { type Order } from "@/lib/services/orders"

interface ContinuePaymentButtonProps {
  order: Order
  disabled?: boolean
  className?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
}

export function ContinuePaymentButton({ 
  order, 
  disabled = false, 
  className = "",
  variant = "default",
  size = "default"
}: ContinuePaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleContinuePayment = async () => {
    if (!order.can_continue_payment) {
      toast({
        title: "Payment not available",
        description: "This order cannot continue payment.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Call the continue payment API
      const paymentSession = await paymentService.continuePayment(order.id)
      
      // Show success message
      toast({
        title: "Redirecting to payment",
        description: "You will be redirected to complete your payment.",
      })

      // Redirect to Stripe Checkout
      setTimeout(() => {
        window.location.href = paymentSession.checkout_url
      }, 1000)

    } catch (error) {
      console.error("Failed to continue payment:", error)
      toast({
        title: "Payment Error", 
        description: error instanceof Error ? error.message : "Failed to continue payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Only show button if payment can be continued
  if (!order.can_continue_payment) {
    return null
  }

  return (
    <Button
      onClick={handleContinuePayment}
      disabled={disabled || isLoading}
      className={className}
      variant={variant}
      size={size}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {size === "sm" ? "Processing..." : "Processing..."}
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          {size === "sm" ? "Pay Now" : "Continue Payment"}
        </>
      )}
    </Button>
  )
}
