"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from "lucide-react"
import { paymentService, PaymentStatus } from "@/lib/services/payments"
import { useToast } from "@/hooks/use-toast"

interface PaymentStatusCardProps {
  orderId: string
  autoRefresh?: boolean
  refreshInterval?: number
  onStatusChange?: (status: PaymentStatus) => void
}

export default function PaymentStatusCard({
  orderId,
  autoRefresh = false,
  refreshInterval = 5000,
  onStatusChange,
}: PaymentStatusCardProps) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchPaymentStatus = async () => {
    try {
      setError(null)
      const paymentStatus = await paymentService.getPaymentStatus(orderId)
      setStatus(paymentStatus)
      onStatusChange?.(paymentStatus)
    } catch (err: any) {
      console.error('Error fetching payment status:', err)
      setError(err.message || 'Failed to fetch payment status')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPaymentStatus()

    let interval: NodeJS.Timeout | null = null
    if (autoRefresh && status?.status === 'pending') {
      interval = setInterval(fetchPaymentStatus, refreshInterval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [orderId, autoRefresh, refreshInterval, status?.status])

  const getStatusIcon = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />
      case 'refunded':
        return <RefreshCw className="h-5 w-5 text-blue-600" />
      case 'canceled':
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'refunded':
        return 'bg-blue-100 text-blue-800'
      case 'canceled':
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'success':
        return 'Payment Successful'
      case 'failed':
        return 'Payment Failed'
      case 'pending':
        return 'Payment Pending'
      case 'refunded':
        return 'Payment Refunded'
      case 'canceled':
      case 'cancelled':
        return 'Payment Cancelled'
      case 'no_payment':
        return 'No Payment'
      default:
        return 'Unknown Status'
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    fetchPaymentStatus()
  }

  if (isLoading && !status) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading payment status...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center">
            <XCircle className="h-5 w-5 mr-2" />
            Error Loading Payment Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="text-center p-6">
          <p className="text-gray-600">No payment information available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            {getStatusIcon(status.status)}
            <span className="ml-2">Payment Status</span>
          </span>
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Payment Status:</span>
          <Badge className={getStatusColor(status.status)}>
            {getStatusText(status.status)}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-medium">Order Status:</span>
          <Badge variant="outline">
            {status.order_status.charAt(0).toUpperCase() + status.order_status.slice(1)}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-medium">Paid:</span>
          <Badge className={status.is_paid ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
            {status.is_paid ? 'Yes' : 'No'}
          </Badge>
        </div>

        {status.amount && (
          <div className="flex items-center justify-between">
            <span className="font-medium">Amount:</span>
            <span className="font-semibold">${status.amount}</span>
          </div>
        )}

        {status.created_at && (
          <div className="flex items-center justify-between">
            <span className="font-medium">Created:</span>
            <span className="text-sm text-gray-600">
              {new Date(status.created_at).toLocaleString()}
            </span>
          </div>
        )}

        {status.status === 'pending' && autoRefresh && (
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <Clock className="h-4 w-4 inline mr-1" />
            Checking payment status automatically...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
