"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Eye, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { userOrdersApi, type Order } from "@/lib/services/orders"
import { useToast } from "@/hooks/use-toast"
import { CancelOrderButton } from "@/components/ui/cancel-order-button"
import { OrderStatusBadge } from "@/components/ui/order-status-badge"

export default function OrdersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Handle order cancellation
  const handleOrderCancelled = (cancelledOrder: Order) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === cancelledOrder.id ? cancelledOrder : order
      )
    )
  }

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    const fetchOrders = async () => {
      try {
        setIsLoading(true)
        const userOrders = await userOrdersApi.getMyOrders()
        setOrders(userOrders)
      } catch (error) {
        console.error("Error fetching orders:", error)
        toast({
          title: "Error",
          description: "Failed to load your orders. Please try again.",
          variant: "destructive",
        })
        setOrders([]) // Set empty array on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [user, router, toast])

  if (!user) {
    return null
  }

  // Helper function to count items in an order
  const getItemCount = (order: Order) => {
    if (order.items && Array.isArray(order.items)) {
      return order.items.reduce((total, item) => total + item.quantity, 0)
    }
    // Fallback to products array length if items not available
    return order.products?.length || 0
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="container mx-auto px-4 py-8 flex-1">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Order History</h1>
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading your orders...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Order History</h1>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h2 className="text-xl font-medium mb-2">No orders yet</h2>
                <p className="text-slate-600 mb-6">Start shopping to see your orders here</p>
                <Button asChild>
                  <Link href="/products">Browse Products</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                        <p className="text-sm text-slate-600">
                          Placed on {new Date(order.date).toLocaleDateString()}
                        </p>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-slate-600">
                          {getItemCount(order)} item{getItemCount(order) !== 1 ? "s" : ""}
                        </p>
                        <p className="font-bold">${parseFloat(order.total).toFixed(2)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/orders/${order.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </Button>
                        <CancelOrderButton 
                          order={order}
                          onOrderCancelled={handleOrderCancelled}
                          variant="outline"
                          size="sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
