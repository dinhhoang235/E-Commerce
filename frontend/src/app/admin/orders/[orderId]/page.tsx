"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Package, User, MapPin, CreditCard, Truck, Calendar, DollarSign } from "lucide-react"
import { adminOrdersApi, type Order } from "@/lib/services/orders"
import { useToast } from "@/hooks/use-toast"
import { PaymentStatusBadge } from "@/components/ui/payment-status-badge"

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails()
    }
  }, [orderId])

  const fetchOrderDetails = async () => {
    try {
      setLoading(true)
      const orderData = await adminOrdersApi.getOrderById(orderId)
      setOrder(orderData)
    } catch (error) {
      console.error("Error fetching order details:", error)
      toast({
        title: "Error",
        description: "Failed to fetch order details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary"
      case "processing":
        return "default"
      case "shipped":
        return "default"
      case "completed":
        return "default"
      case "cancelled":
        return "destructive"
      case "refunded":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Package className="h-3 w-3" />
      case "processing":
        return <Package className="h-3 w-3" />
      case "shipped":
        return <Truck className="h-3 w-3" />
      case "completed":
        return <Package className="h-3 w-3" />
      case "cancelled":
        return <Package className="h-3 w-3" />
      case "refunded":
        return <Package className="h-3 w-3" />
      default:
        return <Package className="h-3 w-3" />
    }
  }

  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return
    
    try {
      setUpdating(true)
      await adminOrdersApi.updateOrderStatus(order.id, newStatus as Order['status'])
      
      // Update local state
      setOrder({ ...order, status: newStatus as Order['status'] })
      
      toast({
        title: "Success",
        description: `Order ${order.id} status updated to ${newStatus}`,
      })
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Loading Order...</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-slate-600">Loading order details...</div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order Not Found</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-slate-600">Order {orderId} not found.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Order {order.id}</h1>
          <p className="text-slate-600">Order details and management</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={getStatusColor(order.status)} className="flex items-center gap-2">
            {getStatusIcon(order.status)}
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
          <PaymentStatusBadge 
            status={order.payment_status || 'no_payment'} 
            isPaid={order.is_paid}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-600">Order ID</p>
                <p className="text-base font-mono">{order.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Order Date</p>
                <p className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(order.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Amount</p>
                <p className="text-base font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  ${parseFloat(order.total).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Status</p>
                <Select 
                  value={order.status} 
                  onValueChange={updateOrderStatus}
                  disabled={updating}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-600">Customer Name</p>
              <p className="text-base">{order.customer}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Email</p>
              <p className="text-base">{order.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Shipping Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-600">Shipping Address</p>
              <p className="text-base">{order.shipping?.address || 'No address provided'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Shipping Method</p>
              <p className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" />
                {order.shipping?.method || 'Standard'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-600">Payment Status</p>
              <div className="mt-2">
                <PaymentStatusBadge 
                  status={order.payment_status || 'no_payment'} 
                  isPaid={order.is_paid}
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Payment Amount</p>
              <p className="text-base font-semibold">${parseFloat(order.total).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          {order.items && order.items.length > 0 ? (
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={item.id || index} className="flex items-start justify-between p-6 border rounded-lg bg-gray-50">
                  <div className="flex items-start space-x-6">
                    <div className="flex-shrink-0">
                      {item.product_variant_image ? (
                        <img 
                          src={item.product_variant_image}
                          alt={item.product_variant_name}
                          className="w-20 h-20 object-cover rounded-lg border shadow-sm"
                          onError={(e) => {
                            console.log('Image failed to load:', item.product_variant_image)
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            target.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      <div className={`w-20 h-20 bg-gray-200 rounded-lg border flex items-center justify-center ${item.product_variant_image ? 'hidden' : ''}`}>
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{item.product_variant_name}</h4>
                      <div className="space-y-1">
                        {item.product_variant_color && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-500">Color:</span>
                            <span className="text-sm text-gray-700 bg-white px-2 py-1 rounded border">
                              {item.product_variant_color}
                            </span>
                          </div>
                        )}
                        {item.product_variant_storage && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-500">Storage:</span>
                            <span className="text-sm text-gray-700 bg-white px-2 py-1 rounded border">
                              {item.product_variant_storage}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-500">Quantity:</span>
                          <span className="text-sm font-semibold text-gray-900 bg-blue-100 px-2 py-1 rounded">
                            {item.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-gray-900">${parseFloat(item.price).toFixed(2)}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      ${parseFloat(item.product_variant_price).toFixed(2)} each
                    </p>
                  </div>
                </div>
              ))}
              <Separator className="my-6" />
              <div className="flex justify-between items-center pt-4 bg-gray-50 p-4 rounded-lg">
                <span className="text-xl font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-blue-600">${parseFloat(order.total).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {order.products.map((product, index) => (
                <div key={index} className="p-6 border rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg border flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{product}</p>
                      <p className="text-sm text-gray-500">Product details not available</p>
                    </div>
                  </div>
                </div>
              ))}
              <Separator className="my-6" />
              <div className="flex justify-between items-center pt-4 bg-gray-50 p-4 rounded-lg">
                <span className="text-xl font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-blue-600">${parseFloat(order.total).toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
