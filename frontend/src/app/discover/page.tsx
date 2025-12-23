"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { TopSellers } from "@/components/top-sellers"
import { NewArrivals } from "@/components/new-arrivals"
import { PersonalizedRecommendations } from "@/components/personalized-recommendations"
import { ProductCard } from "@/components/product-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAllProducts } from "@/lib/services/products"
import { getAllCategories } from "@/lib/services/categories"

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

export default function ProductsWithRecommendations() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [productsResponse, categoriesResponse] = await Promise.all([
          getAllProducts(),
          getAllCategories()
        ])
        
        let productsArray: Product[] = []
        if (productsResponse && productsResponse.results && Array.isArray(productsResponse.results)) {
          productsArray = productsResponse.results
        } else if (Array.isArray(productsResponse)) {
          productsArray = productsResponse
        }
        
        let categoriesArray: Category[] = []
        if (categoriesResponse && categoriesResponse.results && Array.isArray(categoriesResponse.results)) {
          categoriesArray = categoriesResponse.results
        } else if (Array.isArray(categoriesResponse)) {
          categoriesArray = categoriesResponse
        }

        setProducts(productsArray)
        setCategories(categoriesArray)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Discover Products</h1>
        <p className="text-gray-600">
          Explore our curated collections and personalized recommendations
        </p>
      </div>

      {/* Category Filters */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Filter by Categories</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategories.includes(String(category.id)) ? "default" : "outline"}
              size="sm"
              onClick={() => handleCategoryToggle(String(category.id))}
            >
              {category.name}
            </Button>
          ))}
          {selectedCategories.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategories([])}
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Product Recommendations Tabs */}
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="all">All Products</TabsTrigger>
          <TabsTrigger value="top-sellers">Top Sellers</TabsTrigger>
          <TabsTrigger value="new-arrivals">New Arrivals</TabsTrigger>
          <TabsTrigger value="personalized">For You</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <div className="space-y-12">
            {/* Show personalized first if categories are selected */}
            {selectedCategories.length > 0 && (
              <PersonalizedRecommendations 
                categoryIds={selectedCategories}
                title={`Recommended in ${selectedCategories.length} ${selectedCategories.length === 1 ? 'category' : 'categories'}`}
                limit={12}
              />
            )}
            
            {/* Top Sellers */}
            <TopSellers limit={8} />
            
            {/* New Arrivals */}
            <NewArrivals limit={8} />
            
            {/* All Products Grid */}
            <section>
              <h2 className="text-2xl font-bold mb-6">All Products</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          </div>
        </TabsContent>
        
        <TabsContent value="top-sellers">
          <TopSellers limit={20} showHeader={false} />
        </TabsContent>
        
        <TabsContent value="new-arrivals">
          <NewArrivals limit={20} showHeader={false} />
        </TabsContent>
        
        <TabsContent value="personalized">
          <div className="space-y-12">
            <PersonalizedRecommendations 
              categoryIds={selectedCategories}
              title="Personalized for You"
              limit={20}
              showHeader={false}
            />
            {selectedCategories.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  Select categories above to get personalized recommendations
                </p>
                <Button onClick={() => setActiveTab("all")}>
                  Browse All Products
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
