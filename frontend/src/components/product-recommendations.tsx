"use client"

import { useEffect, useState } from "react"
import { ProductCard } from "@/components/product-card"
import { getProductRecommendations } from "@/lib/services/products"

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
  image?: string
  category: string | Category
  rating: number
  reviews: number
  badge?: string
  total_stock?: number
}

interface ProductRecommendationsProps {
  productId: string | number
  className?: string
}

export function ProductRecommendations({ productId, className = "" }: ProductRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!productId) return

      try {
        setIsLoading(true)
        setError(null)
        const data = await getProductRecommendations(String(productId))
        setRecommendations(data)
      } catch (error) {
        console.error("Error fetching product recommendations:", error)
        setError("Failed to load recommendations")
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecommendations()
  }, [productId])

  if (isLoading) {
    return (
      <section className={`mt-16 ${className}`}>
        <h2 className="text-2xl font-bold mb-6">You might also like</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
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
    <section className={`mt-16 ${className}`}>
      <h2 className="text-2xl font-bold mb-6">You might also like</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {recommendations.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
