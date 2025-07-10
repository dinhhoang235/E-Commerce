"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, ShoppingCart } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { getAllProducts } from "@/lib/services/products"

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

interface RelatedProductsProps {
  currentProductId: string | number
  category: string
}

export function RelatedProducts({ currentProductId, category }: RelatedProductsProps) {
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { addItem } = useCart()

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        setIsLoading(true)
        const response = await getAllProducts()
        
        let productsArray: Product[] = [];
        
        // Handle paginated response structure
        if (response && response.results && Array.isArray(response.results)) {
          productsArray = response.results;
        } else if (Array.isArray(response)) {
          productsArray = response;
        } else {
          console.error("Unexpected API response format:", response);
          setIsLoading(false);
          return;
        }

        // Get products in the same category, excluding the current product
        const related = productsArray
          .filter(
            (product: Product) => {
              // Convert both to strings to ensure consistent comparison
              const productId = String(product.id);
              const currentId = String(currentProductId);
              const productCategory = typeof product.category === 'object' ? product.category.slug : product.category;
              
              return productId !== currentId && 
                   (category === 'all' || productCategory === category);
            }
          )
          .slice(0, 4) // Limit to 4 products

        setRelatedProducts(related)
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching related products:", error)
        setIsLoading(false)
      }
    }

    fetchRelatedProducts()
  }, [currentProductId, category])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (relatedProducts.length === 0) {
    return null
  }

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold mb-6">Related Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedProducts.map((product) => (
          <Card key={product.id} className="group hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4">
              <Link href={`/products/${product.id}`}>
                <div className="relative mb-3 aspect-square bg-slate-100 rounded-lg overflow-hidden">
                  {product.badge && (
                    <Badge className="absolute top-2 left-2 z-10 bg-red-500 hover:bg-red-600">{product.badge}</Badge>
                  )}
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    unoptimized={product.image?.startsWith('http')}
                    className="object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </Link>
              <div className="space-y-2">
                <Link href={`/products/${product.id}`} className="block">
                  <h3 className="font-medium line-clamp-2">{product.name}</h3>
                </Link>
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-600">({product.reviews})</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="font-bold">${product.price}</span>
                    {product.originalPrice && (
                      <span className="text-xs text-slate-500 line-through">${product.originalPrice}</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-1 h-8 w-8"
                    onClick={() =>
                      addItem({
                        id: parseInt(String(product.id)) || 0,
                        name: product.name,
                        price: product.price,
                        image: product.image || "/placeholder.svg",
                      })
                    }
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
