"use client"

import { useEffect, useState } from "react"
import { ProductCard } from "@/components/product-card"
import { getPersonalizedRecommendations } from "@/lib/services/products"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, RefreshCw } from "lucide-react"

// Define Category interface
interface Category {
  id: string | number
  name: string
  slug: string
  description?: string
  image?: string
  is_active?: boolean
}

// Define the Product interface
interface Product {
  id: string | number
  name: string
  description: string
  min_price: number
  max_price: number
  originalPrice?: number
  image?: string
  category: string | Category
  rating: number
  reviews: number
  badge?: string
}

interface PersonalizedRecommendationsProps {
  className?: string
  categoryIds?: string[]
  limit?: number
  showHeader?: boolean
  title?: string
}

export function PersonalizedRecommendations({ 
  className = "", 
  categoryIds = [], 
  limit = 10, 
  showHeader = true,
  title = "Recommended for You"
}: PersonalizedRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendations = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getPersonalizedRecommendations(categoryIds)
      setRecommendations(data.slice(0, limit))
    } catch (error) {
      console.error("Error fetching personalized recommendations:", error)
      setError("Failed to load recommendations")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
  }, [categoryIds, limit])

  const handleRefresh = () => {
    fetchRecommendations()
  }

  if (isLoading) {
    return (
      <section className={className}>
        {showHeader && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-pink-500" />
              <h2 className="text-2xl font-bold">{title}</h2>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 aspect-square rounded-lg mb-3"></div>
              <div className="bg-gray-200 h-4 rounded mb-2"></div>
              <div className="bg-gray-200 h-3 rounded mb-2"></div>
              <div className="bg-gray-200 h-4 w-20 rounded"></div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error || recommendations.length === 0) {
    return null
  }

  return (
    <section className={className}>
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-pink-500" />
            <h2 className="text-2xl font-bold">{title}</h2>
            <Badge variant="secondary" className="bg-pink-100 text-pink-700">
              Just for you
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" asChild>
              <a href="/products">View All</a>
            </Button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {recommendations.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
