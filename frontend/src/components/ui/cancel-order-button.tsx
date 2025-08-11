"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, X } from "lucide-react"
import { userOrdersApi, type Order } from "@/lib/services/orders"
import { useToast } from "@/hooks/use-toast"

interface CancelOrderButtonProps {
  order: Order
  onOrderCancelled?: (cancelledOrder: Order) => void
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function CancelOrderButton({ 
  order, 
  onOrderCancelled, 
  variant = "destructive",
  size = "sm",
  className 
}: CancelOrderButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [canCancel, setCanCancel] = useState<boolean | null>(null)
  const [cancelReason, setCancelReason] = useState<string>("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  // Check if order can be cancelled
  const checkCancelability = async () => {
    try {
      const result = await userOrdersApi.canCancelOrder(order.id)
      setCanCancel(result.can_cancel)
      setCancelReason(result.reason || "")
      return result.can_cancel
    } catch (error) {
      console.error("Error checking order cancellability:", error)
      setCanCancel(false)
      setCancelReason("Unable to verify cancellation eligibility")
      return false
    }
  }

  // Handle the cancellation process
  const handleCancelOrder = async () => {
    try {
      setIsLoading(true)
      const cancelledOrder = await userOrdersApi.cancelOrder(order.id)
      
      toast({
        title: "Order Cancelled",
        description: `Order #${order.id} has been successfully cancelled.`,
      })

      if (onOrderCancelled) {
        onOrderCancelled(cancelledOrder)
      }

      setIsDialogOpen(false)
    } catch (error: any) {
      console.error("Error cancelling order:", error)
      
      let errorMessage = "Failed to cancel order. Please try again."
      
      // Handle specific error types
      if (error.message) {
        errorMessage = error.message
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      
      toast({
        title: "Cancellation Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle dialog open - check cancellability when dialog opens
  const handleDialogOpen = async () => {
    setIsDialogOpen(true)
    if (canCancel === null) {
      await checkCancelability()
    }
  }

  // Don't show button for already cancelled orders or if order is completed/delivered/refunded
  if (order.status === 'cancelled' || order.status === 'completed' || order.status === 'delivered' || order.status === 'refunded') {
    return null
  }

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          onClick={handleDialogOpen}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel Order
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Order #{order.id}</AlertDialogTitle>
          <AlertDialogDescription>
            {canCancel === null ? (
              <span className="flex items-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Checking if order can be cancelled...
              </span>
            ) : canCancel ? (
              <>
                Are you sure you want to cancel this order? This action cannot be undone.
                <br /><br />
                <strong>Order Details:</strong>
                <br />
                Total: ${parseFloat(order.total).toFixed(2)}
                <br />
                Status: {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                <br />
                Date: {new Date(order.date).toLocaleDateString()}
              </>
            ) : (
              <span className="text-red-600">
                This order cannot be cancelled.
                {cancelReason && (
                  <>
                    <br />
                    <strong>Reason:</strong> {cancelReason}
                  </>
                )}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Keep Order
          </AlertDialogCancel>
          {canCancel && (
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={isLoading || !canCancel}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Cancelling...
                </>
              ) : (
                "Cancel Order"
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
