"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useCart } from "@/components/cart-provider"
import { paymentService } from "@/lib/services/payments"

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { clearCart } = useCart()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [orderDetails, setOrderDetails] = useState<any>(null)
  const hasProcessed = useRef(false)

  useEffect(() => {
    const verifyPayment = async () => {
      // Prevent multiple executions
      if (hasProcessed.current) return
      hasProcessed.current = true

      try {
        const sessionId = searchParams.get('session_id')
        
        if (!sessionId) {
          setStatus('error')
          toast({
            variant: "destructive",
            title: "Payment Error",
            description: "No payment session found.",
          })
          return
        }

        // Verify payment with backend and create order
        const result = await paymentService.verifyPaymentAndCreateOrder(sessionId)
        
        if (result.success) {
          // Clear the cart since payment was successful and order was created
          clearCart()
          
          // Show success status
          setStatus('success')
          setOrderDetails({ orderId: result.order_id })
          
          toast({
            title: "Payment Successful!",
            description: `Order ${result.order_id} has been created and is being processed.`,
          })
        } else {
          throw new Error('Payment verification failed')
        }

      } catch (error: any) {
        console.error('Payment verification failed:', error)
        setStatus('error')
        toast({
          variant: "destructive",
          title: "Payment Verification Failed",
          description: error.message || "There was an issue verifying your payment. Please contact support.",
        })
      }
    }

    verifyPayment()
  }, [searchParams, toast]) // Removed clearCart from dependencies

  const handleContinueShopping = () => {
    router.push('/')
  }

  const handleViewOrders = () => {
    router.push('/orders')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Verifying Payment</h2>
            <p className="text-gray-600 text-center">
              Please wait while we confirm your payment...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <XCircle className="h-16 w-16 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Payment Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              There was an issue with your payment. Please try again or contact support if the problem persists.
            </p>
            <div className="space-y-2">
              <Button onClick={handleContinueShopping} className="w-full">
                Continue Shopping
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/checkout')}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-green-600">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <p className="text-lg font-semibold">Thank you for your order!</p>
            {orderDetails?.orderId && (
              <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                Order ID: {orderDetails.orderId}
              </p>
            )}
            <p className="text-gray-600">
              Your payment has been processed successfully. You will receive an email confirmation shortly.
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-800">
              Your order is now being processed and will be shipped according to your selected delivery method.
            </p>
          </div>

          <div className="space-y-2 pt-4">
            <Button onClick={handleViewOrders} className="w-full">
              View My Orders
            </Button>
            <Button 
              variant="outline" 
              onClick={handleContinueShopping}
              className="w-full"
            >
              Continue Shopping
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
