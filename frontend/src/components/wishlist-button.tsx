"use client"

import { useState } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useWishlist } from "@/components/wishlist-provider"

interface WishlistButtonProps {
  productId: number
  variant?: "default" | "icon" | "text"
  size?: "sm" | "md" | "lg"
  className?: string
  showText?: boolean
}

export function WishlistButton({ 
  productId, 
  variant = "default", 
  size = "md", 
  className,
  showText = true
}: WishlistButtonProps) {
  const { isInWishlist, toggleItem, loading } = useWishlist()
  const [isToggling, setIsToggling] = useState(false)
  
  const inWishlist = isInWishlist(productId)

  const handleToggle = async () => {
    setIsToggling(true)
    await toggleItem(productId)
    setIsToggling(false)
  }

  const isLoading = loading || isToggling

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          "transition-colors",
          inWishlist && "text-red-500 hover:text-red-600",
          className
        )}
      >
        <Heart 
          className={cn(
            "h-5 w-5 transition-colors",
            inWishlist && "fill-current"
          )} 
        />
      </Button>
    )
  }

  if (variant === "text") {
    return (
      <Button
        variant="ghost"
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          "text-sm transition-colors",
          inWishlist && "text-red-500 hover:text-red-600",
          className
        )}
      >
        <Heart 
          className={cn(
            "mr-2 h-4 w-4 transition-colors",
            inWishlist && "fill-current"
          )} 
        />
        {inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
      </Button>
    )
  }

  // Default variant
  const sizeClasses = {
    sm: "h-8 text-xs",
    md: "h-10 text-sm",
    lg: "h-12 text-base"
  }

  return (
    <Button
      variant={inWishlist ? "outline" : "outline"}
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        "transition-all duration-200",
        sizeClasses[size],
        inWishlist && "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300",
        className
      )}
    >
      <Heart 
        className={cn(
          "h-4 w-4 transition-colors",
          showText && "mr-2",
          inWishlist && "fill-current"
        )} 
      />
      {showText && (inWishlist ? "Remove from Wishlist" : "Add to Wishlist")}
    </Button>
  )
}
