"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Package, Truck, ArrowLeft, Download, Loader2 } from "lucide-react"
import { userOrdersApi, type Order } from "@/lib/services/orders"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

export default function OrderConfirmationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  const orderId = searchParams.get('orderId')

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!orderId) {
      router.push("/account")
      return
    }

    fetchOrderDetails()
  }, [user, orderId, router])

  const fetchOrderDetails = async () => {
    if (!orderId) return

    try {
      const orderData = await userOrdersApi.getOrderById(orderId)
      setOrder(orderData)
    } catch (error) {
      console.error("Error fetching order details:", error)
      toast({
        title: "Error",
        description: "Failed to load order details. Redirecting to your account.",
        variant: "destructive",
      })
      router.push("/account")
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'shipped': return 'bg-purple-100 text-purple-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstimatedDelivery = (orderDate: string, status: string) => {
    const orderDateTime = new Date(orderDate)
    let daysToAdd = 7 // Default 7 days
    
    switch (status) {
      case 'shipped':
        daysToAdd = 3
        break
      case 'processing':
        daysToAdd = 5
        break
      case 'completed':
        return 'Delivered'
      case 'cancelled':
        return 'Cancelled'
    }
    
    const deliveryDate = new Date(orderDateTime.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    return deliveryDate.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p>Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Order Not Found</h1>
          <p className="text-slate-600 mb-6">The order you're looking for could not be found.</p>
          <Button onClick={() => router.push("/account")}>
            View Your Orders
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-green-600 mb-2">Order Confirmed!</h1>
          <p className="text-slate-600 text-lg">
            Thank you for your purchase. Your order has been successfully placed.
          </p>
        </div>

        {/* Order Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Order Details</span>
              <Badge className={getStatusColor(order.status)}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium">Order Number</p>
                <p className="text-slate-600 font-mono">{order.id}</p>
              </div>
              <div>
                <p className="font-medium">Order Date</p>
                <p className="text-slate-600">{new Date(order.date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="font-medium">Total Amount</p>
                <p className="text-slate-600 font-semibold">${parseFloat(order.total).toFixed(2)}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Shipping Address</h3>
                <div className="text-sm text-slate-600">
                  <p>{order.customer}</p>
                  <p>{order.shipping.address}</p>
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Shipping Method</h3>
                <div className="text-sm text-slate-600">
                  <p>{order.shipping.method}</p>
                  <p className="text-green-600">Free shipping</p>
                  <p className="font-medium">
                    Estimated Delivery: {getEstimatedDelivery(order.date, order.status)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 py-3 border-b last:border-b-0">
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Package className="h-8 w-8 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{item.product_name}</h4>
                    <p className="text-sm text-slate-600">Quantity: {item.quantity}</p>
                    <p className="text-sm text-slate-600">Unit Price: ${parseFloat(item.product_price).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${parseFloat(item.price).toFixed(2)}</p>
                  </div>
                </div>
              )) || order.products.map((product, index) => (
                <div key={index} className="flex items-center space-x-4 py-3 border-b last:border-b-0">
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Package className="h-8 w-8 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{product}</h4>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Truck className="mr-2 h-5 w-5" />
              What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Order Confirmation</p>
                <p className="text-sm text-slate-600">You'll receive a confirmation email shortly with your order details.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className={`h-5 w-5 rounded-full mt-0.5 ${
                order.status === 'processing' || order.status === 'shipped' || order.status === 'completed' 
                  ? 'bg-green-600' 
                  : 'border-2 border-slate-300'
              }`}>
                {(order.status === 'processing' || order.status === 'shipped' || order.status === 'completed') && 
                  <CheckCircle className="h-5 w-5 text-white" />
                }
              </div>
              <div>
                <p className="font-medium">Processing</p>
                <p className="text-sm text-slate-600">We'll prepare your order for shipment within 1-2 business days.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className={`h-5 w-5 rounded-full mt-0.5 ${
                order.status === 'shipped' || order.status === 'completed' 
                  ? 'bg-green-600' 
                  : 'border-2 border-slate-300'
              }`}>
                {(order.status === 'shipped' || order.status === 'completed') && 
                  <CheckCircle className="h-5 w-5 text-white" />
                }
              </div>
              <div>
                <p className="font-medium">Shipping Notification</p>
                <p className="text-sm text-slate-600">You'll receive tracking information once your order ships.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" onClick={() => router.push("/products")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Continue Shopping
          </Button>
          <Button onClick={() => router.push("/account")}>
            View Order History
          </Button>
        </div>
      </div>
    </div>
  )
}
