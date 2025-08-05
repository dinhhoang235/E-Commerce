"use client"

import { useEffect, useState } from "react"
import { ProductCard } from "@/components/product-card"
import { getNewArrivals } from "@/lib/services/products"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"

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
  price: number
  originalPrice?: number
  image?: string
  category: string | Category
  rating: number
  reviews: number
  badge?: string
}

interface NewArrivalsProps {
  className?: string
  limit?: number
  showHeader?: boolean
}

export function NewArrivals({ className = "", limit = 10, showHeader = true }: NewArrivalsProps) {
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getNewArrivals()
        // Add "NEW" badge to products
        const productsWithBadge = data.slice(0, limit).map((product: Product) => ({
          ...product,
          badge: "NEW"
        }))
        setNewArrivals(productsWithBadge)
      } catch (error) {
        console.error("Error fetching new arrivals:", error)
        setError("Failed to load new arrivals")
      } finally {
        setIsLoading(false)
      }
    }

    fetchNewArrivals()
  }, [limit])

  if (isLoading) {
    return (
      <section className={className}>
        {showHeader && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-500" />
              <h2 className="text-2xl font-bold">New Arrivals</h2>
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

  if (error || newArrivals.length === 0) {
    return null
  }

  return (
    <section className={className}>
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-bold">New Arrivals</h2>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              Latest
            </Badge>
          </div>
          <Button variant="outline" asChild>
            <a href="/products?sort=newest">View All</a>
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {newArrivals.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
