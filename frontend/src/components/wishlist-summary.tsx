"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, ShoppingBag } from "lucide-react"
import { useWishlist } from "@/components/wishlist-provider"
import { SafeImage } from "@/components/safe-image"
import Link from "next/link"

export function WishlistSummary() {
  const { items, total } = useWishlist()

  // Show only first 3 items
  const displayItems = items.slice(0, 3)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Heart className="h-5 w-5 mr-2 text-red-500 fill-current" />
          Wishlist
        </CardTitle>
        <Link href="/wishlist">
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-center py-8">
            <Heart className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Your wishlist is empty</p>
            <Link href="/products">
              <Button size="sm">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Browse Products
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {total} {total === 1 ? 'item' : 'items'} in your wishlist
            </p>
            
            {/* Display first 3 items */}
            <div className="space-y-3">
              {displayItems.map((item) => (
                <Link key={item.id} href={`/products/${item.productId}`}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="relative w-12 h-12 rounded-md overflow-hidden">
                      <SafeImage
                        src={item.image}
                        alt={item.name}
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${item.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {total > 3 && (
              <div className="text-center pt-2">
                <Link href="/wishlist">
                  <Button variant="outline" size="sm" className="w-full">
                    View {total - 3} more {total - 3 === 1 ? 'item' : 'items'}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
