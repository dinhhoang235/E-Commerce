"use client"

import { useState, useEffect } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getProductReviews, Review } from "@/lib/services/reviews"
import { ReviewActions } from "@/components/review-actions"
import { StarRating } from "@/components/star-rating"
import { useAuth } from "@/components/auth-provider"

interface ReviewListProps {
  productId: number
  refreshTrigger?: number
}

export function ReviewList({ productId, refreshTrigger }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showAll, setShowAll] = useState(false)
  const { user, isAuthenticated } = useAuth()

  const currentUserId = user?.id || null

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true)
        setError("")
        const data = await getProductReviews(productId)
        // Ensure data is always an array
        setReviews(Array.isArray(data) ? data : [])
      } catch (err: any) {
        console.error("Error fetching reviews:", err)
        setError("Failed to load reviews")
        setReviews([]) // Set empty array on error
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [productId, refreshTrigger])

  const fetchReviews = async () => {
    try {
      setError("")
      const data = await getProductReviews(productId)
      setReviews(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error("Error fetching reviews:", err)
      setError("Failed to load reviews")
      setReviews([])
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getDisplayName = (review: Review) => {
    if (review.user_first_name && review.user_last_name) {
      return `${review.user_first_name} ${review.user_last_name.charAt(0)}.`
    } else if (review.user_first_name) {
      return review.user_first_name
    } else if (review.user_name) {
      return review.user_name
    }
    return "Anonymous"
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-5 bg-slate-200 rounded w-1/3"></div>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="w-4 h-4 bg-slate-200 rounded"></div>
                ))}
              </div>
            </div>
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="h-16 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">{error}</p>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">No reviews yet. Be the first to review this product!</p>
      </div>
    )
  }

  // Ensure reviews is an array before using slice
  const reviewsArray = Array.isArray(reviews) ? reviews : []
  const displayedReviews = showAll ? reviewsArray : reviewsArray.slice(0, 3)

  return (
    <div className="space-y-6">
      {displayedReviews.map((review, index) => (
        <div key={review.id}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold">{review.title}</h4>
              <div className="flex items-center gap-2">
                <StarRating rating={review.rating} size="sm" />
                <ReviewActions 
                  review={review}
                  currentUserId={currentUserId}
                  onReviewUpdated={() => fetchReviews()}
                  onReviewDeleted={() => fetchReviews()}
                />
              </div>
            </div>
            <p className="text-sm text-slate-600">
              By {getDisplayName(review)} on {formatDate(review.created_at)}
              {review.is_verified_purchase && (
                <span className="ml-2 text-xs text-green-600 font-medium">
                  Verified Purchase
                </span>
              )}
              {/* Debug info - remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <span className="ml-2 text-xs text-blue-500">
                  (Review User ID: {review.user}, Current User ID: {currentUserId})
                </span>
              )}
            </p>
            <p className="text-slate-700">{review.comment}</p>
          </div>
          {index < displayedReviews.length - 1 && <Separator className="mt-6" />}
        </div>
      ))}

      {reviews.length > 3 && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show Less" : `Load More Reviews (${reviewsArray.length - 3} more)`}
          </Button>
        </div>
      )}
    </div>
  )
}
