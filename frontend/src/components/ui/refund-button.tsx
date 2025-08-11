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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, RefreshCw, DollarSign } from "lucide-react"
import { paymentService, type RefundStatus, type RefundResponse } from "@/lib/services/payments"
import { type Order } from "@/lib/services/orders"
import { useToast } from "@/hooks/use-toast"

interface RefundButtonProps {
  order: Order
  onRefundProcessed?: (refundResponse: RefundResponse) => void
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function RefundButton({ 
  order, 
  onRefundProcessed, 
  variant = "outline",
  size = "sm",
  className 
}: RefundButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false)
  const [refundStatus, setRefundStatus] = useState<RefundStatus | null>(null)
  const [refundReason, setRefundReason] = useState("Customer requested refund")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  // Check if order is eligible for refund
  const checkRefundEligibility = async () => {
    try {
      setIsCheckingEligibility(true)
      const status = await paymentService.getRefundStatus(order.id)
      setRefundStatus(status)
      return status
    } catch (error: any) {
      console.error("Error checking refund eligibility:", error)
      const errorStatus: RefundStatus = {
        refund_status: 'no_payment',
        order_status: order.status,
        eligible_for_refund: false,
        message: "Unable to verify refund eligibility"
      }
      setRefundStatus(errorStatus)
      return errorStatus
    } finally {
      setIsCheckingEligibility(false)
    }
  }

  // Handle the refund process
  const handleProcessRefund = async () => {
    try {
      setIsLoading(true)
      const refundResponse = await paymentService.processFullRefund(order.id, refundReason)
      
      toast({
        title: "Refund Processed",
        description: `Refund of $${refundResponse.refunded_amount} has been processed successfully for order #${order.id}.`,
      })

      if (onRefundProcessed) {
        onRefundProcessed(refundResponse)
      }

      setIsDialogOpen(false)
      
      // Update refund status to reflect the change
      await checkRefundEligibility()
      
    } catch (error: any) {
      console.error("Error processing refund:", error)
      
      let errorMessage = "Failed to process refund. Please try again."
      
      // Handle specific error types
      if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: "Refund Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle dialog open - check eligibility when dialog opens
  const handleDialogOpen = async () => {
    setIsDialogOpen(true)
    if (!refundStatus) {
      await checkRefundEligibility()
    }
  }

  // Don't show button for orders that haven't been paid or are already refunded
  if (!order.is_paid || order.status === 'cancelled') {
    return null
  }

  // Only show for completed orders (as requested)
  if (order.status !== 'completed') {
    return null
  }

  // Don't show if already refunded
  if (refundStatus?.refund_status === 'refunded') {
    return (
      <Button 
        variant="secondary" 
        size={size} 
        className={className}
        disabled
      >
        <DollarSign className="w-4 h-4 mr-2" />
        Already Refunded
      </Button>
    )
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
          <RefreshCw className="w-4 h-4 mr-2" />
          Request Refund
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Request Refund for Order #{order.id}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              {isCheckingEligibility ? (
                <span className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Checking refund eligibility...
                </span>
              ) : refundStatus ? (
                refundStatus.eligible_for_refund ? (
                  <div className="space-y-3">
                    <p>
                      You are requesting a full refund for this completed order. 
                      The refund will be processed back to your original payment method.
                    </p>
                    
                    <div className="bg-slate-50 p-3 rounded-lg text-sm">
                      <strong>Order Details:</strong>
                      <br />
                      Total: ${refundStatus.original_amount || parseFloat(order.total).toFixed(2)}
                      <br />
                      Status: {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      <br />
                      Date: {new Date(order.date).toLocaleDateString()}
                      {refundStatus.payment_date && (
                        <>
                          <br />
                          Payment Date: {new Date(refundStatus.payment_date).toLocaleDateString()}
                        </>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="refund-reason">Reason for refund (optional)</Label>
                      <Textarea
                        id="refund-reason"
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder="Please provide a reason for the refund..."
                        className="min-h-[80px]"
                        maxLength={500}
                      />
                      <p className="text-xs text-slate-500">
                        {refundReason.length}/500 characters
                      </p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800">
                      <strong>Important:</strong> Refunds typically take 5-10 business days to appear in your account.
                    </div>
                  </div>
                ) : (
                  <div className="text-red-600">
                    <p>This order is not eligible for refund.</p>
                    {refundStatus.message && (
                      <p className="mt-2 text-sm">
                        <strong>Reason:</strong> {refundStatus.message}
                      </p>
                    )}
                  </div>
                )
              ) : (
                <p>Loading refund information...</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          {refundStatus?.eligible_for_refund && (
            <AlertDialogAction
              onClick={handleProcessRefund}
              disabled={isLoading || !refundStatus.eligible_for_refund || !refundReason.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing Refund...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Process Refund
                </>
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
