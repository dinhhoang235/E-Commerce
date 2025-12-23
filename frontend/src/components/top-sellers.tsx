"use client"

import { useEffect, useState } from "react"
import { ProductCard } from "@/components/product-card"
import { getTopSellers } from "@/lib/services/products"
import { Button } from "@/components/ui/button"
import { TrendingUp } from "lucide-react"

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

interface TopSellersProps {
  className?: string
  limit?: number
  showHeader?: boolean
}

export function TopSellers({ className = "", limit = 10, showHeader = true }: TopSellersProps) {
  const [topSellers, setTopSellers] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTopSellers = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getTopSellers()
        setTopSellers(data.slice(0, limit))
      } catch (error) {
        console.error("Error fetching top sellers:", error)
        setError("Failed to load top sellers")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTopSellers()
  }, [limit])

  if (isLoading) {
    return (
      <section className={className}>
        {showHeader && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-orange-500" />
              <h2 className="text-2xl font-bold">Top Sellers</h2>
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

  if (error || topSellers.length === 0) {
    return null
  }

  return (
    <section className={className}>
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-orange-500" />
            <h2 className="text-2xl font-bold">Top Sellers</h2>
          </div>
          <Button variant="outline" asChild>
            <a href="/products?sort=top_sellers">View All</a>
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {topSellers.map((product, index) => (
          <div key={product.id} className="relative">
            {index < 3 && (
              <div className="absolute -top-2 -left-2 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {index + 1}
              </div>
            )}
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
