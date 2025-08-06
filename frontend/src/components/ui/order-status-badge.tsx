"use client"

import { Badge } from "@/components/ui/badge"
import { type Order } from "@/lib/services/orders"

interface OrderStatusBadgeProps {
  status: Order['status']
  className?: string
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
        return "default"
      case "processing":
      case "shipped":
        return "secondary"
      case "pending":
        return "outline"
      case "cancelled":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending"
      case "processing":
        return "Processing"
      case "shipped":
        return "Shipped"
      case "completed":
        return "Completed"
      case "cancelled":
        return "Cancelled"
      case "delivered":
        return "Delivered"
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const getStatusDescription = (status: string) => {
    switch (status) {
      case "pending":
        return "Order is waiting for confirmation"
      case "processing":
        return "Order is being prepared"
      case "shipped":
        return "Order is on its way"
      case "completed":
        return "Order has been completed"
      case "cancelled":
        return "Order has been cancelled"
      case "delivered":
        return "Order has been delivered"
      default:
        return ""
    }
  }

  return (
    <Badge 
      variant={getStatusVariant(status)} 
      className={className}
      title={getStatusDescription(status)}
    >
      {getStatusDisplay(status)}
    </Badge>
  )
}
