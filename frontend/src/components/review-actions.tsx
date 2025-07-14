"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Star, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { updateReview, deleteReview, Review } from "@/lib/services/reviews"

interface ReviewActionsProps {
  review: Review
  currentUserId?: number | null
  onReviewUpdated?: () => void
  onReviewDeleted?: () => void
}

export function ReviewActions({ review, currentUserId, onReviewUpdated, onReviewDeleted }: ReviewActionsProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [rating, setRating] = useState(review.rating)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [title, setTitle] = useState(review.title)
  const [comment, setComment] = useState(review.comment)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  // Only show actions if the current user owns this review
  // Convert both values to numbers for proper comparison
  const reviewUserId = typeof review.user === 'number' ? review.user : parseInt(String(review.user))
  const currentUserIdNum = typeof currentUserId === 'number' ? currentUserId : parseInt(String(currentUserId || 0))
  const canModify = currentUserId && currentUserIdNum === reviewUserId && currentUserIdNum > 0

  console.log('Review Actions Debug:', {
    currentUserId,
    currentUserIdNum,
    reviewUserId,
    reviewUserName: review.user_name,
    canModify,
    rawReviewUser: review.user
  }) // Debug log

  if (!canModify) {
    // Show why user cannot modify this review (for debugging in development)
    if (process.env.NODE_ENV === 'development') {
      const reason = !currentUserId 
        ? 'Not logged in' 
        : currentUserIdNum !== reviewUserId 
          ? `Different user (current: ${currentUserIdNum}, review: ${reviewUserId})` 
          : 'Unknown reason';
      
      return (
        <span className="text-xs text-slate-400" title={`Cannot modify: ${reason}`}>
          {/* Hidden debug info */}
        </span>
      );
    }
    
    // Don't render any actions if user can't modify this review
    return null
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!title.trim() || !comment.trim() || rating === 0) {
      setError("Please fill in all fields and provide a rating.")
      return
    }

    if (!currentUserId) {
      setError("You must be logged in to update a review.")
      return
    }

    try {
      setIsUpdating(true)
      
      console.log('Updating review:', review.id, 'with data:', {
        rating,
        title: title.trim(),
        comment: comment.trim(),
      }); // Debug log

      await updateReview(review.id, {
        rating,
        title: title.trim(),
        comment: comment.trim(),
      })
      
      setEditOpen(false)
      setError("") // Clear any previous errors
      
      if (onReviewUpdated) {
        onReviewUpdated()
      }
    } catch (err: any) {
      setError(err.message || "Failed to update review. Please try again.")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!currentUserId) {
      setError("You must be logged in to delete a review.")
      return
    }

    try {
      setIsDeleting(true)
      setError("") // Clear any previous errors
      
      await deleteReview(review.id)
      
      setDeleteOpen(false)
      
      if (onReviewDeleted) {
        onReviewDeleted()
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete review. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const renderStars = () => {
    return [...Array(5)].map((_, index) => {
      const starValue = index + 1
      return (
        <button
          key={index}
          type="button"
          className="focus:outline-none"
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
          onClick={() => setRating(starValue)}
        >
          <Star
            className={`w-6 h-6 cursor-pointer transition-colors ${
              starValue <= (hoveredRating || rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300 hover:text-yellow-400"
            }`}
          />
        </button>
      )
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => {
            setEditOpen(true)
            setError("") // Clear any previous errors
            // Reset form to current values
            setRating(review.rating)
            setTitle(review.title)
            setComment(review.comment)
          }}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Review
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => {
              setDeleteOpen(true)
              setError("") // Clear any previous errors
            }}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Review
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
            <DialogDescription>
              Update your review for this product
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex items-center space-x-1">
                {renderStars()}
              </div>
              {rating > 0 && (
                <p className="text-sm text-gray-600">
                  {rating} star{rating !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-title">Review Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summarize your review in a few words"
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-comment">Review</Label>
              <Textarea
                id="edit-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell others about your experience with this product"
                rows={4}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Updating..." : "Update Review"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
