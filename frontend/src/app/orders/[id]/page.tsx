"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Package, MapPin, Loader2, AlertCircle } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { userOrdersApi, type Order } from "@/lib/services/orders"
import { useToast } from "@/hooks/use-toast"
import { CancelOrderButton } from "@/components/ui/cancel-order-button"
import { OrderStatusBadge } from "@/components/ui/order-status-badge"

export default function OrderDetailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const orderId = params.id as string

  // Handle order cancellation
  const handleOrderCancelled = (cancelledOrder: Order) => {
    setOrder(cancelledOrder)
    toast({
      title: "Order Updated",
      description: "Order status has been updated.",
    })
  }

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const fetchOrder = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const orderData = await userOrdersApi.getOrderById(orderId)
        setOrder(orderData)
      } catch (error: any) {
        console.error("Error fetching order:", error)
        setError(error.response?.status === 404 ? "Order not found" : "Failed to load order details")
        toast({
          title: "Error",
          description: "Failed to load order details. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (orderId) {
      fetchOrder()
    }
  }, [user, router, orderId, toast])

  if (!user) {
    return null
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading order details...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
          </Button>
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-medium mb-2">{error || "Order not found"}</h2>
              <p className="text-slate-600 mb-6">
                The order you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button asChild>
                <Link href="/orders">Back to Orders</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
        </Button>

        <div className="mb-6">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-3xl font-bold">Order #{order.id}</h1>
            <OrderStatusBadge status={order.status} className="text-sm" />
          </div>
          <p className="text-slate-600">
            Placed on {new Date(order.date).toLocaleDateString()} at{" "}
            {new Date(order.date).toLocaleTimeString()}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="mr-2 h-5 w-5" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 pb-4 border-b last:border-b-0">
                        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Package className="w-8 h-8 text-slate-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{item.product_name}</h4>
                          <p className="text-sm text-slate-600">
                            Quantity: {item.quantity} × ${parseFloat(item.price).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-600">No item details available</p>
                      {order.products && order.products.length > 0 && (
                        <p className="text-sm text-slate-500 mt-2">
                          This order contains {order.products.length} product(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            {order.shipping && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="mr-2 h-5 w-5" />
                    Shipping Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Shipping Address</p>
                      <p className="text-sm">{order.shipping.address || "No address available"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Shipping Method</p>
                      <p className="text-sm">{order.shipping.method || "Standard"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Customer</span>
                    <span>{order.customer}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Email</span>
                    <span className="text-right break-all">{order.email}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${parseFloat(order.total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>$0.00</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${parseFloat(order.total).toFixed(2)}</span>
                </div>

                {/* Order Actions */}
                <div className="pt-4">
                  <CancelOrderButton 
                    order={order}
                    onOrderCancelled={handleOrderCancelled}
                    variant="destructive"
                    size="default"
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
