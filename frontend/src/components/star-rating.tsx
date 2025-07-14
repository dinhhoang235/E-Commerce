import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: "sm" | "md" | "lg"
  showValue?: boolean
  className?: string
}

export function StarRating({ 
  rating, 
  maxRating = 5, 
  size = "md", 
  showValue = false,
  className 
}: StarRatingProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4", 
    lg: "w-5 h-5"
  }

  const renderStars = () => {
    const stars = []
    
    for (let i = 1; i <= maxRating; i++) {
      const filled = rating >= i
      const halfFilled = rating >= i - 0.5 && rating < i
      
      stars.push(
        <div key={i} className="relative">
          <Star
            className={cn(
              sizeClasses[size],
              "text-slate-300"
            )}
          />
          {/* Full star */}
          {filled && (
            <Star
              className={cn(
                sizeClasses[size],
                "absolute top-0 left-0 fill-yellow-400 text-yellow-400"
              )}
            />
          )}
          {/* Half star */}
          {halfFilled && (
            <div className="absolute top-0 left-0 overflow-hidden" style={{ width: '50%' }}>
              <Star
                className={cn(
                  sizeClasses[size],
                  "fill-yellow-400 text-yellow-400"
                )}
              />
            </div>
          )}
        </div>
      )
    }
    
    return stars
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {renderStars()}
      </div>
      {showValue && (
        <span className="text-sm text-slate-600 ml-1">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}
