"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, XCircle, AlertCircle, CreditCard } from "lucide-react"

interface PaymentStatusBadgeProps {
  status: string
  isPaid?: boolean
  className?: string
}

export function PaymentStatusBadge({ status, isPaid, className }: PaymentStatusBadgeProps) {
  const getStatusConfig = () => {
    // First check for refunded status, regardless of isPaid
    if (status === "refunded") {
      return {
        variant: "default" as const,
        className: "bg-blue-100 text-blue-800",
        icon: AlertCircle,
        text: "Refunded"
      }
    }
    
    // Then check if paid (but not refunded)
    if (isPaid) {
      return {
        variant: "default" as const,
        className: "bg-green-100 text-green-800",
        icon: CheckCircle,
        text: "Paid"
      }
    }
    
    switch (status) {
      case "success":
        return {
          variant: "default" as const,
          className: "bg-green-100 text-green-800",
          icon: CheckCircle,
          text: "Paid"
        }
      case "pending":
        return {
          variant: "default" as const,
          className: "bg-yellow-100 text-yellow-800",
          icon: Clock,
          text: "Payment Pending"
        }
      case "failed":
        return {
          variant: "default" as const,
          className: "bg-red-100 text-red-800",
          icon: XCircle,
          text: "Payment Failed"
        }
      case "canceled":
      case "cancelled":
        return {
          variant: "default" as const,
          className: "bg-gray-100 text-gray-800",
          icon: XCircle,
          text: "Payment Cancelled"
        }
      case "no_payment":
        return {
          variant: "default" as const,
          className: "bg-gray-100 text-gray-800",
          icon: AlertCircle,
          text: "No Payment"
        }
      default:
        return {
          variant: "outline" as const,
          className: "bg-gray-100 text-gray-800",
          icon: CreditCard,
          text: "Unknown"
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className}`}
    >
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </Badge>
  )
}
