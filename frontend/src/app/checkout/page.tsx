"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Truck, Shield, ArrowLeft, CreditCard } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import DirectPaymentButton from "@/components/direct-payment-button"
import { userOrdersApi } from "@/lib/services/orders"

export default function CheckoutPage() {
  const { items, total } = useCart()
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState(1) // 1: Shipping, 2: Review, 3: Payment
  const [isLoading, setIsLoading] = useState(true)
  const [pendingOrder, setPendingOrder] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState<number>(60) // 1 minute in seconds

  const [shippingData, setShippingData] = useState({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address?.address_line1 || "",
    city: user?.address?.city || "",
    state: user?.address?.state || "",
    zipCode: user?.address?.zip_code || "",
    country: user?.address?.country || "Vietnam",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Tax-inclusive pricing: displayed prices already include tax
  const subtotal = total
  const finalTotal = total // Prices are already tax-inclusive

  useEffect(() => {
    if (user !== undefined) {
      setIsLoading(false)
    }
  }, [user])

  // Countdown timer effect for payment step
  useEffect(() => {
    let timer: NodeJS.Timeout
    
    if (step === 3 && pendingOrder && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up - call cancel API directly and redirect to payment timeout page
            handleTimeoutCancel()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [step, pendingOrder, timeLeft, toast, router, finalTotal])

  // Handle timeout cancellation - call cancel API when countdown reaches zero
  const handleTimeoutCancel = async () => {
    try {
      if (pendingOrder?.id) {
        // Call cancel API directly
        await userOrdersApi.cancelOrder(pendingOrder.id)
        console.log(`Order ${pendingOrder.id} cancelled due to timeout`)
      }
    } catch (error) {
      console.error('Error cancelling order on timeout:', error)
    } finally {
      // Always redirect to timeout page regardless of API success/failure
      toast({
        variant: "destructive",
        title: "Payment Timeout",
        description: "Payment time has expired. Your order has been cancelled.",
      })
      const params = new URLSearchParams()
      if (pendingOrder?.id) params.set('orderId', pendingOrder.id)
      if (finalTotal) params.set('total', finalTotal.toFixed(2))
      router.push(`/payment-timeout?${params.toString()}`)
    }
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Calculate progress percentage (0-100)
  const getProgressPercentage = () => {
    return (timeLeft / 60) * 100
  }

  // Helper functions for formatting
  const getStatePlaceholder = (country: string) => {
    switch (country) {
      case "US":
        return "State"
      case "CA":
        return "Province"
      case "GB":
        return "County"
      default:
        return "State/Province"
    }
  }

  const getZipPlaceholder = (country: string) => {
    switch (country) {
      case "US":
        return "12345"
      case "CA":
        return "K1A 0A6"
      case "GB":
        return "SW1A 1AA"
      default:
        return "Postal Code"
    }
  }

  const validateStep = (stepNumber: number) => {
    const newErrors: Record<string, string> = {}

    if (stepNumber === 1) {
      // Validate shipping information
      if (!shippingData.firstName.trim()) newErrors.firstName = "First name is required"
      if (!shippingData.lastName.trim()) newErrors.lastName = "Last name is required"
      if (!shippingData.email.trim()) newErrors.email = "Email is required"
      else if (!/\S+@\S+\.\S+/.test(shippingData.email)) newErrors.email = "Email is invalid"
      if (!shippingData.address.trim()) newErrors.address = "Address is required"
      if (!shippingData.city.trim()) newErrors.city = "City is required"
      if (!shippingData.state.trim()) newErrors.state = "State/Province is required"
      if (!shippingData.zipCode.trim()) newErrors.zipCode = "ZIP/Postal code is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handleCreatePendingOrder = async () => {
    try {
      setIsProcessing(true)
      
      // Create order in pending state from cart
      const orderData = {
        shipping_address: {
          first_name: shippingData.firstName,
          last_name: shippingData.lastName,
          email: shippingData.email,
          phone: shippingData.phone,
          address_line1: shippingData.address,
          city: shippingData.city,
          state: shippingData.state,
          zip_code: shippingData.zipCode,
          country: shippingData.country,
        },
        shipping_method: "standard" as const,
      }

      const order = await userOrdersApi.createOrderFromCart(orderData)
      setPendingOrder(order)
      setTimeLeft(60) // Reset timer to 1 minute
      setStep(3) // Move to payment step
      
      toast({
        title: "Order Created",
        description: `Order #${order.id} has been created. Please complete payment within 1 minute.`,
      })
    } catch (error: any) {
      console.error("Error creating order:", error)
      toast({
        variant: "destructive",
        title: "Order Creation Failed",
        description: error.message || "Failed to create order. Please try again.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePaymentStart = () => {
    setIsProcessing(true)
    console.log("Payment started - order will be created after successful payment")
  }

  const handlePaymentError = (error: string) => {
    setIsProcessing(false)
    toast({
      variant: "destructive",
      title: "Payment Error",
      description: error,
    })
  }

  if (!user || items.length === 0 || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading checkout...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-3xl font-bold">Checkout</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center space-x-4 mb-8">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {stepNumber}
                </div>
                <span className={`ml-2 text-sm ${step >= stepNumber ? "text-blue-600" : "text-slate-600"}`}>
                  {stepNumber === 1 ? "Shipping" : stepNumber === 2 ? "Review" : "Payment"}
                </span>
                {stepNumber < 3 && <div className="w-8 h-px bg-slate-200 mx-4" />}
              </div>
            ))}
          </div>

          {/* Step 1: Shipping Information */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Truck className="mr-2 h-5 w-5" />
                  Shipping Information
                </CardTitle>
                {user?.address && (
                  <p className="text-sm text-slate-600">
                    We've pre-filled your saved address. You can edit it below if needed.
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={shippingData.firstName}
                      onChange={(e) => setShippingData((prev) => ({ ...prev, firstName: e.target.value }))}
                      className={errors.firstName ? "border-red-500" : ""}
                    />
                    {errors.firstName && <p className="text-sm text-red-500">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={shippingData.lastName}
                      onChange={(e) => setShippingData((prev) => ({ ...prev, lastName: e.target.value }))}
                      className={errors.lastName ? "border-red-500" : ""}
                    />
                    {errors.lastName && <p className="text-sm text-red-500">{errors.lastName}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={shippingData.email}
                    onChange={(e) => setShippingData((prev) => ({ ...prev, email: e.target.value }))}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={shippingData.phone}
                    onChange={(e) => setShippingData((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={shippingData.address}
                    onChange={(e) => setShippingData((prev) => ({ ...prev, address: e.target.value }))}
                    className={errors.address ? "border-red-500" : ""}
                  />
                  {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={shippingData.city}
                      onChange={(e) => setShippingData((prev) => ({ ...prev, city: e.target.value }))}
                      className={errors.city ? "border-red-500" : ""}
                    />
                    {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province *</Label>
                    <Input
                      id="state"
                      placeholder={getStatePlaceholder(shippingData.country)}
                      value={shippingData.state}
                      onChange={(e) => setShippingData((prev) => ({ ...prev, state: e.target.value }))}
                      className={errors.state ? "border-red-500" : ""}
                    />
                    {errors.state && <p className="text-sm text-red-500">{errors.state}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP/Postal Code *</Label>
                    <Input
                      id="zipCode"
                      placeholder={getZipPlaceholder(shippingData.country)}
                      value={shippingData.zipCode}
                      onChange={(e) => setShippingData((prev) => ({ ...prev, zipCode: e.target.value }))}
                      className={errors.zipCode ? "border-red-500" : ""}
                    />
                    {errors.zipCode && <p className="text-sm text-red-500">{errors.zipCode}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={shippingData.country}
                      onValueChange={(value) => setShippingData((prev) => ({ ...prev, country: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VN">Vietnam</SelectItem>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="GB">United Kingdom</SelectItem>
                        <SelectItem value="AU">Australia</SelectItem>
                        <SelectItem value="SG">Singapore</SelectItem>
                        <SelectItem value="JP">Japan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={handleNext} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isProcessing}
                >
                  Continue to Review
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Review Order */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Review Order
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Please review your order details before proceeding to payment.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Shipping Address */}
                <div>
                  <h3 className="font-medium mb-2">Shipping Address</h3>
                  <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                    <p>
                      {shippingData.firstName} {shippingData.lastName}
                    </p>
                    <p>{shippingData.address}</p>
                    <p>
                      {shippingData.city}, {shippingData.state} {shippingData.zipCode}
                    </p>
                    <p>{shippingData.country}</p>
                  </div>
                </div>

                <Separator />

                {/* Order Items */}
                <div>
                  <h3 className="font-medium mb-4">Order Items</h3>
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            width={64}
                            height={64}
                            className="object-contain"
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          {item.color && (
                            <p className="text-sm text-slate-600">Color: {item.color}</p>
                          )}
                          {item.storage && (
                            <p className="text-sm text-slate-600">Storage: {item.storage}</p>
                          )}
                          <p className="text-sm text-slate-600">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Order Summary */}
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal (inc. tax)</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className="text-green-600">Free</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span>${finalTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Prices include applicable taxes</p>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(1)} 
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    Back to Shipping
                  </Button>
                  <Button 
                    onClick={handleCreatePendingOrder} 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Creating Order..." : "Proceed to Payment"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Payment */}
          {step === 3 && pendingOrder && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Payment
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      timeLeft > 60 ? 'bg-green-500' : timeLeft > 30 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className={`text-sm font-mono ${
                      timeLeft > 60 ? 'text-green-600' : timeLeft > 30 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Your order #{pendingOrder.id} has been created. Complete payment within the remaining time to confirm your order.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className={`border p-4 rounded-lg ${
                  timeLeft > 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        timeLeft > 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <span className={`font-medium ${
                        timeLeft > 60 ? 'text-yellow-800' : 'text-red-800'
                      }`}>
                        {timeLeft > 60 ? 'Payment Required' : 'Payment Expiring Soon!'}
                      </span>
                    </div>
                    <span className={`font-mono text-lg font-bold ${
                      timeLeft > 60 ? 'text-yellow-900' : 'text-red-900'
                    }`}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={timeLeft > 60 ? 'text-yellow-700' : 'text-red-700'}>
                        Time Remaining
                      </span>
                      <span className={timeLeft > 60 ? 'text-yellow-700' : 'text-red-700'}>
                        {Math.round(getProgressPercentage())}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 ${
                          timeLeft > 60 ? 'bg-yellow-500' : timeLeft > 30 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${getProgressPercentage()}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <p className={`text-sm ${
                    timeLeft > 60 ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {timeLeft > 60 
                      ? 'Please complete your payment within the time limit. After this time, your order will be automatically cancelled.'
                      : 'Hurry! Your payment time is about to expire. Complete payment now to secure your order.'
                    }
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Secure Payment with Stripe</span>
                  </div>
                  <p className="text-sm text-blue-800">
                    Your payment will be processed securely. The shipping address above will be used for delivery.
                  </p>
                </div>

                <DirectPaymentButton
                  shippingAddress={shippingData}
                  shippingMethod="standard"
                  onPaymentStart={handlePaymentStart}
                  onPaymentError={handlePaymentError}
                  className="w-full"
                  disabled={isProcessing || timeLeft <= 0}
                >
                  {isProcessing ? "Processing..." : timeLeft <= 0 ? "Payment Expired" : `Pay $${finalTotal.toFixed(2)}`}
                </DirectPaymentButton>

                {timeLeft <= 0 && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="font-medium text-red-800">Payment Expired</span>
                    </div>
                    <p className="text-sm text-red-700 mb-3">
                      The payment time limit has expired. Your order has been automatically cancelled and items have been returned to stock.
                    </p>
                    <Button 
                      onClick={() => {
                        const params = new URLSearchParams()
                        if (pendingOrder?.id) params.set('orderId', pendingOrder.id)
                        if (finalTotal) params.set('total', finalTotal.toFixed(2))
                        router.push(`/payment-timeout?${params.toString()}`)
                      }} 
                      variant="outline" 
                      className="w-full"
                    >
                      View Details
                    </Button>
                  </div>
                )}

                <div className="flex space-x-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(2)} 
                    className="flex-1"
                    disabled={isProcessing || timeLeft <= 0}
                  >
                    Back to Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Order Summary</span>
                {step === 3 && pendingOrder && (
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      timeLeft > 60 ? 'bg-green-500' : timeLeft > 30 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className={`text-xs font-mono ${
                      timeLeft > 60 ? 'text-green-600' : timeLeft > 30 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment Timer Alert */}
              {step === 3 && pendingOrder && (
                <div className={`p-3 rounded-lg border ${
                  timeLeft > 60 ? 'bg-green-50 border-green-200' : 
                  timeLeft > 30 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${
                      timeLeft > 60 ? 'text-green-800' : 
                      timeLeft > 30 ? 'text-yellow-800' : 'text-red-800'
                    }`}>
                      Payment Time
                    </span>
                    <span className={`text-sm font-mono font-bold ${
                      timeLeft > 60 ? 'text-green-900' : 
                      timeLeft > 30 ? 'text-yellow-900' : 'text-red-900'
                    }`}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                  
                  {/* Mini Progress Bar */}
                  <div className="mb-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-1000 ${
                          timeLeft > 60 ? 'bg-green-500' : 
                          timeLeft > 30 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${getProgressPercentage()}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <p className={`text-xs ${
                    timeLeft > 60 ? 'text-green-700' : 
                    timeLeft > 30 ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {timeLeft > 60 ? 'Complete payment soon' : 
                     timeLeft > 30 ? 'Payment expiring soon!' : 'Payment about to expire!'}
                  </p>
                </div>
              )}

              {/* Order Items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {item.name} × {item.quantity}
                      </span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    {(item.color || item.storage) && (
                      <div className="text-xs text-slate-500 ml-2">
                        {item.color && <span>Color: {item.color}</span>}
                        {item.color && item.storage && <span> • </span>}
                        {item.storage && <span>Storage: {item.storage}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal (inc. tax)</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>${finalTotal.toFixed(2)}</span>
              </div>
              
              <p className="text-xs text-slate-500 text-center">Prices include applicable taxes</p>

              {/* Security Badge */}
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Your payment information is secure and encrypted.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
