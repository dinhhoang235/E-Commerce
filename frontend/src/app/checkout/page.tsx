"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CreditCard, Truck, Shield, ArrowLeft } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"
import { userOrdersApi } from "@/lib/services/orders"
import { createAddress } from "@/lib/services/auth"

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart()
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [step, setStep] = useState(1) // 1: Shipping, 2: Payment, 3: Review
  const [isLoading, setIsLoading] = useState(true)

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

  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    nameOnCard: "",
    billingAddressSame: true,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  // Format expiry date
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`
    }
    return v
  }

  // Get placeholder text for state field based on country
  const getStatePlaceholder = (country: string) => {
    switch (country) {
      case 'United States':
        return 'e.g., California, New York'
      case 'Canada':
        return 'e.g., Ontario, Quebec'
      case 'United Kingdom':
        return 'e.g., England, Scotland'
      case 'Australia':
        return 'e.g., New South Wales, Victoria'
      case 'Vietnam':
        return 'e.g., Ho Chi Minh City, Hanoi'
      default:
        return 'Enter state or province'
    }
  }

  // Get placeholder text for ZIP/postal code field based on country
  const getZipPlaceholder = (country: string) => {
    switch (country) {
      case 'United States':
        return 'e.g., 12345 or 12345-6789'
      case 'Canada':
        return 'e.g., K1A 0A6'
      case 'United Kingdom':
        return 'e.g., SW1A 1AA'
      case 'Vietnam':
        return 'e.g., 700000'
      default:
        return 'Enter postal code'
    }
  }

  // Update shipping data when user data changes
  useEffect(() => {
    if (user) {
      setShippingData(prev => ({
        ...prev,
        firstName: user.first_name || prev.firstName,
        lastName: user.last_name || prev.lastName,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        address: user.address?.address_line1 || prev.address,
        city: user.address?.city || prev.city,
        state: user.address?.state || prev.state,
        zipCode: user.address?.zip_code || prev.zipCode,
        country: user.address?.country || prev.country,
      }))
    }
  }, [user])

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push("/products")
    } else {
      setIsLoading(false)
    }
  }, [items, router])

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/checkout")
    } else {
      setIsLoading(false)
    }
  }, [user, router])

  const shipping = 0 // Free shipping
  const tax = total * 0.08 // 8% tax
  const finalTotal = total + shipping + tax

  const validateStep = (stepNumber: number) => {
    const newErrors: Record<string, string> = {}

    if (stepNumber === 1) {
      if (!shippingData.firstName) newErrors.firstName = "First name is required"
      if (!shippingData.lastName) newErrors.lastName = "Last name is required"
      if (!shippingData.email) newErrors.email = "Email is required"
      else if (!/\S+@\S+\.\S+/.test(shippingData.email)) newErrors.email = "Please enter a valid email address"
      if (!shippingData.address) newErrors.address = "Address is required"
      if (!shippingData.city) newErrors.city = "City is required"
      if (!shippingData.state) newErrors.state = "State/Province is required"
      if (!shippingData.zipCode) newErrors.zipCode = "ZIP/Postal code is required"
      else if (shippingData.country === "United States" && !/^\d{5}(-\d{4})?$/.test(shippingData.zipCode)) {
        newErrors.zipCode = "Please enter a valid US ZIP code"
      } else if (shippingData.zipCode.length < 3) {
        newErrors.zipCode = "Please enter a valid postal code"
      }
    }

    if (stepNumber === 2) {
      // Credit card validation
      const cardNumber = paymentData.cardNumber.replace(/\s/g, '')
      if (!paymentData.cardNumber) newErrors.cardNumber = "Card number is required"
      else if (!/^\d{13,19}$/.test(cardNumber)) newErrors.cardNumber = "Please enter a valid card number"
      
      if (!paymentData.expiryDate) newErrors.expiryDate = "Expiry date is required"
      else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(paymentData.expiryDate)) {
        newErrors.expiryDate = "Please enter date in MM/YY format"
      } else {
        // Check if card is expired
        const [month, year] = paymentData.expiryDate.split('/')
        const expiry = new Date(parseInt(`20${year}`), parseInt(month) - 1)
        const now = new Date()
        if (expiry < now) {
          newErrors.expiryDate = "Card has expired"
        }
      }
      
      if (!paymentData.cvv) newErrors.cvv = "CVV is required"
      else if (!/^\d{3,4}$/.test(paymentData.cvv)) newErrors.cvv = "CVV must be 3 or 4 digits"
      
      if (!paymentData.nameOnCard) newErrors.nameOnCard = "Name on card is required"
      else if (paymentData.nameOnCard.length < 2) newErrors.nameOnCard = "Please enter a valid name"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handlePlaceOrder = async () => {
    if (!validateStep(2)) return

    // Additional validation - ensure cart is not empty
    if (items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your cart before placing an order.",
        variant: "destructive",
      })
      router.push("/products")
      return
    }

    setIsProcessing(true)

    try {
      let shippingAddressId = user?.address?.id

      // If user doesn't have an address, create one from shipping data
      if (!shippingAddressId) {
        try {
          // Map country names to codes
          const countryMapping: Record<string, string> = {
            'Vietnam': 'VN',
            'United States': 'US',
            'Canada': 'CA',
            'United Kingdom': 'GB',
            'Australia': 'AU',
            'Germany': 'DE',
            'France': 'FR',
            'Japan': 'JP',
            'South Korea': 'KR',
            'Singapore': 'SG',
            'Thailand': 'TH',
            'Malaysia': 'MY',
            'Philippines': 'PH',
            'Indonesia': 'ID',
            'China': 'CN',
            'India': 'IN',
            // Also handle if already in code format
            'VN': 'VN',
            'US': 'US',
            'CA': 'CA',
            'GB': 'GB',
            'AU': 'AU',
            'DE': 'DE',
            'FR': 'FR',
            'JP': 'JP',
            'KR': 'KR',
            'SG': 'SG',
            'TH': 'TH',
            'MY': 'MY',
            'PH': 'PH',
            'ID': 'ID',
            'CN': 'CN',
            'IN': 'IN'
          }

          const newAddress = await createAddress({
            first_name: shippingData.firstName,
            last_name: shippingData.lastName,
            phone: shippingData.phone,
            address_line1: shippingData.address,
            city: shippingData.city,
            state: shippingData.state,
            zip_code: shippingData.zipCode,
            country: countryMapping[shippingData.country] || shippingData.country,
            is_default: true
          })
          shippingAddressId = newAddress.id
        } catch (addressError) {
          console.error("Failed to create address:", addressError)
          // Continue without address ID, backend will handle it
        }
      }

      // Create order data
      const orderData = {
        shipping_method: "standard" as const,
        ...(shippingAddressId && { shipping_address_id: shippingAddressId })
      }

      // Create order from cart using real API
      const order = await userOrdersApi.createOrderFromCart(orderData)

      // Clear cart on successful order creation
      clearCart()

      toast({
        title: "Order placed successfully!",
        description: `Order #${order.id} has been created. Thank you for your purchase!`,
      })

      // Redirect to order confirmation with order ID
      router.push(`/order-confirmation?orderId=${order.id}`)
    } catch (error: any) {
      console.error("Order creation failed:", error)
      
      // Handle specific error cases
      let errorMessage = "Failed to place order. Please try again."
      
      if (error.response?.status === 400) {
        const errorData = error.response.data
        if (errorData?.error) {
          errorMessage = errorData.error
        } else if (errorData?.detail) {
          errorMessage = errorData.detail
        } else {
          errorMessage = "Invalid order data. Please check your information."
        }
      } else if (error.response?.status === 401) {
        errorMessage = "Please log in to place an order."
        router.push("/login?redirect=/checkout")
        return
      } else if (error.response?.status === 404) {
        errorMessage = "Cart is empty or products are no longer available."
      }

      toast({
        title: "Order failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
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
                  {stepNumber === 1 ? "Shipping" : stepNumber === 2 ? "Payment" : "Review"}
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

                <Button onClick={handleNext} className="w-full bg-blue-600 hover:bg-blue-700">
                  Continue to Payment
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Payment Information */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number *</Label>
                  <Input
                    id="cardNumber"
                    placeholder="1234 5678 9012 3456"
                    value={paymentData.cardNumber}
                    onChange={(e) => {
                      const formatted = formatCardNumber(e.target.value)
                      setPaymentData((prev) => ({ ...prev, cardNumber: formatted }))
                    }}
                    maxLength={19}
                    className={errors.cardNumber ? "border-red-500" : ""}
                  />
                  {errors.cardNumber && <p className="text-sm text-red-500">{errors.cardNumber}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date *</Label>
                    <Input
                      id="expiryDate"
                      placeholder="MM/YY"
                      value={paymentData.expiryDate}
                      onChange={(e) => {
                        const formatted = formatExpiryDate(e.target.value)
                        setPaymentData((prev) => ({ ...prev, expiryDate: formatted }))
                      }}
                      maxLength={5}
                      className={errors.expiryDate ? "border-red-500" : ""}
                    />
                    {errors.expiryDate && <p className="text-sm text-red-500">{errors.expiryDate}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV *</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={paymentData.cvv}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '')
                        setPaymentData((prev) => ({ ...prev, cvv: value }))
                      }}
                      maxLength={4}
                      className={errors.cvv ? "border-red-500" : ""}
                    />
                    {errors.cvv && <p className="text-sm text-red-500">{errors.cvv}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nameOnCard">Name on Card *</Label>
                  <Input
                    id="nameOnCard"
                    value={paymentData.nameOnCard}
                    onChange={(e) => setPaymentData((prev) => ({ ...prev, nameOnCard: e.target.value }))}
                    className={errors.nameOnCard ? "border-red-500" : ""}
                  />
                  {errors.nameOnCard && <p className="text-sm text-red-500">{errors.nameOnCard}</p>}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="billingAddressSame"
                    checked={paymentData.billingAddressSame}
                    onCheckedChange={(checked) =>
                      setPaymentData((prev) => ({ ...prev, billingAddressSame: checked as boolean }))
                    }
                  />
                  <Label htmlFor="billingAddressSame" className="text-sm">
                    Billing address is the same as shipping address
                  </Label>
                </div>

                <div className="flex space-x-4">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back to Shipping
                  </Button>
                  <Button onClick={handleNext} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    Review Order
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review Order */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Review Your Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Shipping Address */}
                <div>
                  <h3 className="font-medium mb-2">Shipping Address</h3>
                  <div className="text-sm text-slate-600">
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

                {/* Payment Method */}
                <div>
                  <h3 className="font-medium mb-2">Payment Method</h3>
                  <div className="text-sm text-slate-600">
                    <p>**** **** **** {paymentData.cardNumber.replace(/\s/g, '').slice(-4)}</p>
                    <p>{paymentData.nameOnCard}</p>
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
                          <p className="text-sm text-slate-600">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    Back to Payment
                  </Button>
                  <Button
                    onClick={handlePlaceOrder}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={isProcessing}
                  >
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isProcessing ? "Processing..." : "Place Order"}
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
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>${finalTotal.toFixed(2)}</span>
              </div>

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
