"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/star-rating"
import { SafeImage } from "@/components/safe-image"
import { WishlistButton } from "@/components/wishlist-button"
import { useWishlist } from "@/components/wishlist-provider"
import { useCart } from "@/components/cart-provider"
import { Heart, ShoppingCart, Trash2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface WishlistItemCardProps {
  item: {
    id: number
    productId: number
    name: string
    price: number
    originalPrice?: number
    image: string
    badge?: string
    rating: number
    reviews: number
    description: string
    colors: string[]
    storage: string[]
    addedAt: string
  }
}

export function WishlistItemCard({ item }: WishlistItemCardProps) {
  const { removeItem, loading } = useWishlist()
  const { addItem: addToCart, loading: cartLoading } = useCart()

  const handleRemoveFromWishlist = async () => {
    await removeItem(item.productId)
  }

  const handleAddToCart = async () => {
    await addToCart({
      id: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
      productId: item.productId
    })
    
    toast.success("Added to cart successfully!")
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const hasDiscount = item.originalPrice && item.originalPrice > item.price
  const discountPercent = hasDiscount 
    ? Math.round(((item.originalPrice! - item.price) / item.originalPrice!) * 100)
    : 0

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 h-full flex flex-col">
      <div className="p-6 flex flex-col h-full">
        <Link href={`/products/${item.productId}`} className="block">
          <div className="relative mb-4">
            {/* Badge */}
            {item.badge && (
              <Badge className="absolute top-2 left-2 z-10 bg-red-500 hover:bg-red-600">{item.badge}</Badge>
            )}
            
            {/* Wishlist Heart Icon - Top Right */}
            <div className="absolute top-2 right-2 z-10">
              <WishlistButton 
                productId={item.productId}
                variant="icon"
                className="bg-white/80 hover:bg-white shadow-md"
              />
            </div>
            
            {/* Discount Badge */}
            {hasDiscount && (
              <Badge className="absolute top-2 left-16 z-10 bg-red-500 text-white">
                -{discountPercent}%
              </Badge>
            )}
            
            <div className="relative aspect-square w-full">
              <SafeImage
                src={item.image}
                alt={item.name}
                width={300}
                height={300}
                className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        </Link>
        
        <div className="space-y-3 flex-1 flex flex-col">
          <Link href={`/products/${item.productId}`} className="block">
            <h3 className="text-lg font-bold line-clamp-2 min-h-[3.5rem]">{item.name}</h3>
          </Link>
          <p className="text-sm text-slate-600 line-clamp-2 min-h-[2.5rem] flex-1">{item.description}</p>
          <div className="space-y-3 mt-auto">
            <div className="flex items-center gap-2">
              <StarRating rating={item.rating} size="md" />
              <span className="text-sm text-slate-600">({item.reviews})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">${item.price}</span>
              {item.originalPrice && (
                <span className="text-sm text-slate-500 line-through">${item.originalPrice}</span>
              )}
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleAddToCart} disabled={cartLoading}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
