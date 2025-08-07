"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle, ArrowLeft } from "lucide-react"

export default function PaymentCancelPage() {
  const router = useRouter()

  const handleReturnToCheckout = () => {
    router.push('/checkout')
  }

  const handleContinueShopping = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <XCircle className="h-16 w-16 text-orange-500" />
          </div>
          <CardTitle className="text-orange-600">Payment Cancelled</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="space-y-2">
            <p className="text-lg font-semibold">Payment was cancelled</p>
            <p className="text-gray-600">
              Your payment was cancelled and no charges were made to your account. Your cart items are still saved.
            </p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-orange-800">
              If you experienced any issues during checkout, please try again or contact our support team.
            </p>
          </div>

          <div className="space-y-2 pt-4">
            <Button 
              onClick={handleReturnToCheckout} 
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Checkout
            </Button>
            <Button 
              variant="outline" 
              onClick={handleContinueShopping}
              className="w-full"
            >
              Continue Shopping
            </Button>
          </div>

          <div className="text-sm text-gray-500 pt-2">
            <p>Need help? <span className="text-blue-600 cursor-pointer hover:underline">Contact Support</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
