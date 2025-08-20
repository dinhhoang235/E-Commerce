"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Truck, Shield } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { useAuth } from "@/components/auth-provider"
import { cartService } from "@/lib/services/cart"

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart, loading, error } = useCart()
  const { user } = useAuth()
  const router = useRouter()
  const [promoCode, setPromoCode] = useState("")
  const [promoError, setPromoError] = useState("")
  const [discount, setDiscount] = useState(0)
  const [promoLoading, setPromoLoading] = useState(false)

  const shipping = 0 // Free shipping
  const tax = total * 0.08 // 8% tax
  const discountedTotal = total - discount
  const finalTotal = discountedTotal + shipping + tax

  const handleQuantityChange = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return
    await updateQuantity(itemId, newQuantity)
  }

  const handleRemoveItem = async (itemId: number) => {
    await removeItem(itemId)
  }

  const handleApplyPromo = async () => {
    if (!promoCode) {
      setPromoError("Please enter a promo code")
      return
    }

    try {
      setPromoLoading(true)
      setPromoError("")
      
      const result = await cartService.applyPromoCode({ code: promoCode })
      
      if (result.valid) {
        setPromoError(result.message)
        
        // Calculate discount
        let discountAmount = 0
        if (result.discount_percentage) {
          discountAmount = total * (result.discount_percentage / 100)
        } else if (result.discount_amount) {
          discountAmount = result.discount_amount
        }
        
        setDiscount(discountAmount)
      } else {
        setPromoError(result.message)
        setDiscount(0)
      }
    } catch (err) {
      setPromoError("Failed to apply promo code")
      setDiscount(0)
    } finally {
      setPromoLoading(false)
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Loading your cart...</h1>
        </div>
      </div>
    )
  }

  if (items.length === 0 && !loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-slate-600 mb-8">Looks like you haven't added anything to your cart yet.</p>
          <Button asChild>
            <Link href="/products">Start Shopping</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Continue Shopping
        </Button>
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
        <p className="text-slate-600">
          {items.length} item{items.length !== 1 ? "s" : ""} in your cart
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Cart Items
                {loading && <span className="ml-2 text-sm text-slate-500">(Updating...)</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {items.map((item) => (
                <div
                  key={item.itemId}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b last:border-0 last:pb-0"
                >
                  <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                    <img
                      src={item.image || "/placeholder.jpg"}
                      alt={item.name}
                      width={100}
                      height={100}
                      className="object-contain w-full h-full"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.jpg";
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Link href={`/products/${item.id}`} className="font-medium hover:text-blue-600 transition-colors">
                      {item.name}
                    </Link>
                    <p className="text-slate-600 text-sm mt-1">Unit Price: ${typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}</p>
                    {item.color && (
                      <p className="text-slate-600 text-sm">Color: {item.color}</p>
                    )}
                    {item.storage && (
                      <p className="text-slate-600 text-sm">Storage: {item.storage}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleQuantityChange(item.itemId, item.quantity - 1)}
                      disabled={item.quantity <= 1 || loading}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleQuantityChange(item.itemId, item.quantity + 1)}
                      disabled={loading}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-medium">${typeof item.price === 'number' ? (item.price * item.quantity).toFixed(2) : '0.00'}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemoveItem(item.itemId)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={clearCart} disabled={loading}>
                Clear Cart
              </Button>
              <Button asChild>
                <Link href="/products">Add More Items</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Promo Code */}
          <Card>
            <CardHeader>
              <CardTitle>Promo Code</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  disabled={promoLoading}
                />
                <Button onClick={handleApplyPromo} disabled={promoLoading}>
                  {promoLoading ? "Applying..." : "Apply"}
                </Button>
              </div>
              {promoError && (
                <p
                  className={`mt-2 text-sm ${promoError.includes("successfully") ? "text-green-600" : "text-red-500"}`}
                >
                  {promoError}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-green-600">Free</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${finalTotal.toFixed(2)}</span>
              </div>

              <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-4" size="lg" asChild>
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>

              {!user && (
                <p className="text-sm text-slate-600 text-center">
                  <Link href="/login?redirect=/checkout" className="text-blue-600 hover:underline">
                    Sign in
                  </Link>{" "}
                  to use saved shipping and payment details
                </p>
              )}

              {/* Benefits */}
              <div className="space-y-3 pt-4">
                <div className="flex items-start gap-3">
                  <Truck className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Free Shipping</h4>
                    <p className="text-xs text-slate-600">On all orders over $99</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">Secure Checkout</h4>
                    <p className="text-xs text-slate-600">Safe & protected payment processing</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
