"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { XCircle, Clock, ArrowLeft, ShoppingCart, RefreshCw } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

export default function PaymentTimeoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  const orderId = searchParams.get('orderId')
  const orderTotal = searchParams.get('total')

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
  }, [user, router])

  const handleReturnToCart = () => {
    setIsLoading(true)
    router.push('/cart')
  }

  const handleRetryCheckout = () => {
    setIsLoading(true)
    router.push('/checkout')
  }

  const handleViewOrders = () => {
    setIsLoading(true)
    router.push('/account')
  }

  const handleContinueShopping = () => {
    setIsLoading(true)
    router.push('/products')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <XCircle className="h-20 w-20 text-red-500 mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-red-600 mb-2">Payment Timeout</h1>
          <p className="text-slate-600 text-lg">
            Your payment session has expired
          </p>
        </div>

        {/* Main Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-red-700">
              <Clock className="mr-2 h-5 w-5" />
              Payment Session Expired
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Failure Alert */}
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Payment Failed:</strong> The 1-minute payment window has expired.
                {orderId && (
                  <>
                    <br />
                    <strong>Order #{orderId}</strong> has been automatically cancelled and items have been returned to stock.
                  </>
                )}
              </AlertDescription>
            </Alert>

            {/* What Happened */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-medium mb-3 text-slate-800">What happened?</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  Your order was created successfully
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  Payment was required within 1 minute to confirm the order
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  The payment window expired before completion
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  Your order has been automatically cancelled
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  All items have been returned to stock
                </li>
              </ul>
            </div>

            {/* Order Details if available */}
            {orderId && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2 text-slate-800">Order Details</h3>
                <div className="space-y-1 text-sm text-slate-600">
                  <p><strong>Order ID:</strong> #{orderId}</p>
                  {orderTotal && <p><strong>Order Total:</strong> ${orderTotal}</p>}
                  <p><strong>Status:</strong> <span className="text-red-600">Cancelled</span></p>
                  <p><strong>Reason:</strong> Payment timeout</p>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium mb-3 text-blue-800">What can you do next?</h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  Try placing your order again with faster checkout
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  Make sure you have your payment information ready
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  Complete payment within the 1-minute window
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Button 
            onClick={handleRetryCheckout}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Try Again
          </Button>
          
          <Button 
            onClick={handleReturnToCart}
            variant="outline"
            disabled={isLoading}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Return to Cart
          </Button>
        </div>

        {/* Secondary Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={handleContinueShopping}
            variant="ghost"
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Continue Shopping
          </Button>
          
          <Button 
            onClick={handleViewOrders}
            variant="ghost"
            disabled={isLoading}
          >
            View Order History
          </Button>
        </div>

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-slate-700">Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              If you're experiencing issues with checkout or have questions about the payment process, 
              we're here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
              <Button variant="outline" size="sm">
                FAQ
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
