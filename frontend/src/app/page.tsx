"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Star, Truck, Shield, Headphones, Loader2 } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { getAllProducts } from "@/lib/services/products"
import { getAllCategories } from "@/lib/services/categories"

// Define interfaces for API data
interface Category {
  id: string | number
  name: string
  slug: string
  description?: string
  image?: string
  product_count?: number
  is_active?: boolean
}

interface Product {
  id: string | number
  name: string
  description?: string
  price: number
  original_price?: number
  image?: string
  category: string | Category
  rating: number
  reviews: number
  badge?: string
}

export default function HomePage() {
  const { addItem } = useCart()
  const [categories, setCategories] = useState<Category[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch categories and products in parallel
        const [categoriesResponse, productsResponse] = await Promise.all([
          getAllCategories(),
          getAllProducts()
        ])

        console.log("Categories API Response:", categoriesResponse)
        console.log("Products API Response:", productsResponse)

        // Handle categories data
        let categoriesData: Category[] = []
        if (Array.isArray(categoriesResponse)) {
          categoriesData = categoriesResponse
        } else if (categoriesResponse && Array.isArray(categoriesResponse.results)) {
          categoriesData = categoriesResponse.results
        }

        // Filter active categories and limit to 3 for homepage
        const activeCategories = categoriesData
          .filter((cat: Category) => cat.is_active !== false)
          .slice(0, 3)
        
        setCategories(activeCategories)

        // Handle products data
        let productsData: Product[] = []
        if (Array.isArray(productsResponse)) {
          productsData = productsResponse
        } else if (productsResponse && Array.isArray(productsResponse.results)) {
          productsData = productsResponse.results
        }

        // Get featured products (limit to 3 for homepage)
        const featured = productsData
          .filter((product: Product) => product.badge || product.rating >= 4.5)
          .slice(0, 3)
        
        setFeaturedProducts(featured)

      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load data. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleAddToCart = (product: Product) => {
    try {
      addItem({
        id: parseInt(String(product.id)),
        productId: parseInt(String(product.id)),
        name: product.name,
        price: product.price,
        image: product.image || "/placeholder.svg",
      })
    } catch (err) {
      console.error("Error adding item to cart:", err)
    }
  }

  const formatImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return "/placeholder.svg"
    if (imageUrl.startsWith("http")) return imageUrl
    return `http://localhost:8000${imageUrl}`
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-slate-600">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-6">
                <Badge variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700 text-sm px-4 py-2">
                  {featuredProducts.length > 0 && featuredProducts[0].badge ? featuredProducts[0].badge : "New Arrivals"}
                </Badge>
                <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                  {featuredProducts.length > 0 ? (
                    <>
                      Discover the
                      <span className="text-blue-400 block lg:inline"> {featuredProducts[0].name}</span>
                    </>
                  ) : (
                    <>
                      The Future of
                      <span className="text-blue-400 block lg:inline"> Technology</span>
                    </>
                  )}
                </h1>
                <p className="text-xl text-slate-300 leading-relaxed max-w-lg">
                  {featuredProducts.length > 0 && featuredProducts[0].description ? 
                    featuredProducts[0].description :
                    "Discover the latest iPhone, iPad, and MacBook models. Experience innovation at its finest with cutting-edge technology and elegant design."
                  }
                </p>
                {featuredProducts.length > 0 && (
                  <div className="flex items-center gap-4 text-lg">
                    <span className="text-3xl font-bold text-blue-400">${featuredProducts[0].price}</span>
                    {featuredProducts[0].original_price && featuredProducts[0].original_price > featuredProducts[0].price && (
                      <span className="text-xl text-slate-500 line-through">${featuredProducts[0].original_price}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/products">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-4 w-full sm:w-auto">
                    Shop Now
                  </Button>
                </Link>
                {featuredProducts.length > 0 && (
                  <Link href={`/products/${featuredProducts[0].id}`}>
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-lg px-8 py-4 bg-transparent text-white border-white hover:bg-white hover:text-slate-900 w-full sm:w-auto"
                    >
                      View Product
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-3xl blur-3xl"></div>
                <img
                  src={
                    featuredProducts.length > 0 
                      ? formatImageUrl(featuredProducts[0].image)
                      : categories.length > 0 
                      ? formatImageUrl(categories[0].image)
                      : "/placeholder.svg?height=500&width=500"
                  }
                  alt={featuredProducts.length > 0 ? featuredProducts[0].name : "Latest Technology"}
                  className="relative z-10 w-[400px] h-[400px] lg:w-[500px] lg:h-[500px] object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Shop by Category
            </h2>
            <p className="text-slate-600 text-xl max-w-2xl mx-auto">
              Find the perfect Apple device for your needs
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {categories.map((category) => (
                <Link key={category.id} href={`/products?category=${category.slug}`}>
                  <Card className="group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-8 text-center">
                      <div className="mb-8 relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
                        <img
                          src={formatImageUrl(category.image)}
                          alt={category.name}
                          className="relative z-10 mx-auto w-[180px] h-[180px] object-contain group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <h3 className="text-2xl font-bold mb-3 text-slate-900">{category.name}</h3>
                      <p className="text-slate-600 font-medium">
                        {category.product_count ? `${category.product_count} products` : 'Browse products'}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Featured Products
            </h2>
            <p className="text-slate-600 text-xl max-w-2xl mx-auto">
              Our most popular and newest devices
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {featuredProducts.map((product) => (
                <Card key={product.id} className="group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border-0 shadow-lg overflow-hidden">
                  <CardContent className="p-0">
                    <div className="relative mb-6 bg-gradient-to-br from-gray-50 to-gray-100">
                      {product.badge && (
                        <Badge className="absolute top-4 left-4 z-10 bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1">
                          {product.badge}
                        </Badge>
                      )}
                      <Link href={`/products/${product.id}`}>
                        <img
                          src={formatImageUrl(product.image)}
                          alt={product.name}
                          className="w-full h-72 object-contain group-hover:scale-105 transition-transform duration-500 p-6"
                        />
                      </Link>
                    </div>
                    <div className="px-6 pb-6 space-y-4">
                      <Link href={`/products/${product.id}`}>
                        <h3 className="text-xl font-bold hover:text-blue-600 transition-colors leading-tight">
                          {product.name}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-slate-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-slate-600 font-medium">({product.reviews || 0})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-slate-900">${product.price}</span>
                        {product.original_price && product.original_price > product.price && (
                          <span className="text-lg text-slate-500 line-through">${product.original_price}</span>
                        )}
                      </div>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02]"
                        onClick={() => handleAddToCart(product)}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {!isLoading && featuredProducts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-600 text-lg mb-6">No featured products available at the moment.</p>
              <Link href="/products">
                <Button className="bg-blue-600 hover:bg-blue-700 px-8 py-3">Browse All Products</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Free Shipping</h3>
              <p className="text-slate-600">Free shipping on orders over $99</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Warranty</h3>
              <p className="text-slate-600">1-year warranty on all products</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">24/7 Support</h3>
              <p className="text-slate-600">Round-the-clock customer support</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
