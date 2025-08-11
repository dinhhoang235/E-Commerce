"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from "lucide-react"
import { paymentService, type RefundStatus } from "@/lib/services/payments"
import { type Order } from "@/lib/services/orders"

interface RefundStatusCardProps {
  order: Order
  className?: string
}

export function RefundStatusCard({ order, className }: RefundStatusCardProps) {
  const [refundStatus, setRefundStatus] = useState<RefundStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRefundStatus = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const status = await paymentService.getRefundStatus(order.id)
        setRefundStatus(status)
      } catch (error: any) {
        console.error("Error fetching refund status:", error)
        setError("Failed to load refund status")
      } finally {
        setIsLoading(false)
      }
    }

    // Only fetch if order is paid (to avoid unnecessary API calls)
    if (order.is_paid) {
      fetchRefundStatus()
    } else {
      setIsLoading(false)
    }
  }, [order.id, order.is_paid])

  // Don't show for unpaid orders
  if (!order.is_paid) {
    return null
  }

  // Don't show if still loading and no data
  if (isLoading && !refundStatus) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center text-sm text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Checking refund status...
          </div>
        </CardContent>
      </Card>
    )
  }

  // Don't show if error or no refund status
  if (error || !refundStatus) {
    return null
  }

  // Only show if order has been refunded
  if (refundStatus.refund_status !== 'refunded') {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <RefreshCw className="mr-2 h-5 w-5" />
          Refund Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Refund Status</span>
          <Badge className="bg-blue-100 text-blue-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Refunded
          </Badge>
        </div>

        {refundStatus.refunded_amount && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Refunded Amount</span>
            <span className="text-sm font-bold text-blue-600">
              ${refundStatus.refunded_amount}
            </span>
          </div>
        )}

        {refundStatus.refund_date && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Refund Date</span>
            <span className="text-sm">
              {new Date(refundStatus.refund_date).toLocaleDateString()}
            </span>
          </div>
        )}

        {refundStatus.original_amount && refundStatus.refunded_amount && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Original Amount</span>
            <span className="text-sm">
              ${refundStatus.original_amount}
            </span>
          </div>
        )}

        <div className="pt-2 border-t">
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Refund Processing</p>
                <p className="mt-1">
                  Your refund has been processed and will typically appear in your account within 5-10 business days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
