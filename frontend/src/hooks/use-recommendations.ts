"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  getProductRecommendations, 
  getTopSellers, 
  getNewArrivals, 
  getPersonalizedRecommendations 
} from "@/lib/services/products"

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

export function useProductRecommendations(productId?: string | number) {
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendations = useCallback(async () => {
    if (!productId) return

    try {
      setIsLoading(true)
      setError(null)
      const data = await getProductRecommendations(String(productId))
      setRecommendations(data)
    } catch (err) {
      console.error("Error fetching product recommendations:", err)
      setError("Failed to load recommendations")
    } finally {
      setIsLoading(false)
    }
  }, [productId])

  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  return { recommendations, isLoading, error, refetch: fetchRecommendations }
}

export function useTopSellers() {
  const [topSellers, setTopSellers] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTopSellers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getTopSellers()
      setTopSellers(data)
    } catch (err) {
      console.error("Error fetching top sellers:", err)
      setError("Failed to load top sellers")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTopSellers()
  }, [fetchTopSellers])

  return { topSellers, isLoading, error, refetch: fetchTopSellers }
}

export function useNewArrivals() {
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNewArrivals = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getNewArrivals()
      setNewArrivals(data)
    } catch (err) {
      console.error("Error fetching new arrivals:", err)
      setError("Failed to load new arrivals")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNewArrivals()
  }, [fetchNewArrivals])

  return { newArrivals, isLoading, error, refetch: fetchNewArrivals }
}

export function usePersonalizedRecommendations(categoryIds: string[] = []) {
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPersonalizedRecommendations = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getPersonalizedRecommendations(categoryIds)
      setRecommendations(data)
    } catch (err) {
      console.error("Error fetching personalized recommendations:", err)
      setError("Failed to load personalized recommendations")
    } finally {
      setIsLoading(false)
    }
  }, [categoryIds])

  useEffect(() => {
    fetchPersonalizedRecommendations()
  }, [fetchPersonalizedRecommendations])

  return { 
    recommendations, 
    isLoading, 
    error, 
    refetch: fetchPersonalizedRecommendations 
  }
}

// Combined hook for all recommendation types
export function useRecommendations() {
  const topSellers = useTopSellers()
  const newArrivals = useNewArrivals()

  return {
    topSellers,
    newArrivals,
    // Helper function to get personalized recommendations
    getPersonalized: (categoryIds: string[]) => usePersonalizedRecommendations(categoryIds),
    // Helper function to get product recommendations
    getProductRecommendations: (productId: string | number) => useProductRecommendations(productId)
  }
}
