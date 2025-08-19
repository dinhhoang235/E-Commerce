"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShoppingCart, Star, X, Heart } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { WishlistButton } from "@/components/wishlist-button"
import { getAllProducts, getProductsByCategory } from "@/lib/services/products"
import { getAllCategories } from "@/lib/services/categories"
import { StarRating } from "@/components/star-rating"

// Define Category interface
interface Category {
  id: string | number
  name: string
  slug: string
  description?: string
  image?: string
  is_active?: boolean
  product_count?: number
  parent?: Category | null
  parent_id?: number | null
}

// Define ProductColor interface
interface ProductColor {
  id: number
  name: string
  hex_code: string
}

// Define ProductVariant interface
interface ProductVariant {
  id: number
  color: ProductColor
  storage: string
  price: string
  stock: number
  sold: number
  is_in_stock: boolean
  total_stock: number
}

// Define the Product interface to match backend structure
interface Product {
  id: string | number
  name: string
  description: string
  min_price: number
  max_price: number
  image?: string
  category: Category
  rating: number
  reviews: number
  badge?: string
  variants: ProductVariant[]
  available_colors: ProductColor[]
  available_storages: string[]
  total_stock: number
  features?: string[]
  full_description?: string
}

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const { addItem } = useCart()
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [totalProductCount, setTotalProductCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // Fetch products and categories from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch categories first
        const categoriesResponse = await getAllCategories()
        let categoriesData: Category[] = []
        if (Array.isArray(categoriesResponse)) {
          categoriesData = categoriesResponse
        } else if (categoriesResponse && Array.isArray(categoriesResponse.results)) {
          categoriesData = categoriesResponse.results
        }
        
        // Filter active categories only
        const activeCategories = categoriesData.filter((cat: Category) => cat.is_active !== false)
        setAllCategories(activeCategories)
        
        // Fetch products - use category filter if specified in URL
        const urlCategory = searchParams.get("category")
        let response
        
        if (urlCategory && urlCategory !== 'all') {
          response = await getProductsByCategory(urlCategory)
        } else {
          response = await getAllProducts()
        }
        
        // Handle paginated response structure: {count, next, previous, results}
        if (response && response.results && Array.isArray(response.results)) {
          // Extract products array from the paginated response
          setAllProducts(response.results)
          // Store the total count for display purposes
          setTotalProductCount(response.count || response.results.length)
        } else if (Array.isArray(response)) {
          // Handle case where API directly returns an array
          setAllProducts(response)
          setTotalProductCount(response.length)
        } else {
          console.error("API returned unexpected data structure:", response)
          setAllProducts([])
          setError("Data format error. Please try again later.")
        }
        setIsLoading(false)
      } catch (err) {
        console.error("Failed to fetch data:", err)
        setError("Failed to load data. Please try again later.")
        setIsLoading(false)
      }
    }

    fetchData()
  }, [searchParams]) // Re-fetch when URL parameters change

  // Initialize state from URL parameters
  useEffect(() => {
    const urlSearch = searchParams.get("search")
    const urlCategory = searchParams.get("category")

    // If there are no URL parameters, clear all filters (user clicked "All Products")
    if (!urlSearch && !urlCategory) {
      setSearchTerm("")
      setSelectedCategory("all")
      return
    }

    // Set filters from URL parameters
    if (urlSearch) {
      setSearchTerm(urlSearch)
    } else {
      setSearchTerm("") // Clear search if not in URL
    }

    if (urlCategory) {
      setSelectedCategory(urlCategory)
    } else {
      setSelectedCategory("all") // Reset to all if not in URL
    }
  }, [searchParams])

  // Filter products based on search term and sort (category filtering is now done by API)
  useEffect(() => {
    // Make sure allProducts is an array and not empty
    if (!Array.isArray(allProducts) || allProducts.length === 0) {
      setFilteredProducts([]);
      return;
    }

    try {
      // Create a fresh copy of the products array
      let filtered = [...allProducts];

      // Note: Category filtering is now handled by the API, not client-side
      // Only filter by search term here
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (product: Product) => {
            if (!product) return false;
            
            // Get category name for search
            let categoryName = "";
            if (product.category) {
              categoryName = product.category.name.toLowerCase();
            }
            
            return (
              (product.name && product.name.toLowerCase().includes(searchLower)) ||
              (product.description && product.description.toLowerCase().includes(searchLower)) ||
              categoryName.includes(searchLower)
            );
          }
        );
      }
      
      // Sort products
      filtered.sort((a: Product, b: Product) => {
        try {
          switch (sortBy) {
            case "price-low":
              return a.min_price - b.min_price
            case "price-high":
              return b.max_price - a.max_price
            case "rating":
              return b.rating - a.rating
            default:
              return a.name.localeCompare(b.name)
          }
        } catch (err) {
          console.error("Error during sort:", err);
          return 0; // Keep original order on error
        }
      });
      
      setFilteredProducts(filtered);
    } catch (err) {
      console.error("Error filtering products:", err);
      setFilteredProducts([]);
    }
  }, [allProducts, searchTerm, sortBy]) // Removed selectedCategory since it's now handled by API

  // Handle category change - fetch new products when category changes
  const handleCategoryChange = async (newCategory: string) => {
    setSelectedCategory(newCategory)
    setIsLoading(true)
    setError("")
    
    try {
      let response
      if (newCategory === 'all') {
        response = await getAllProducts()
      } else {
        response = await getProductsByCategory(newCategory)
      }
      
      // Handle response format
      if (response && response.results && Array.isArray(response.results)) {
        setAllProducts(response.results)
        setTotalProductCount(response.count || response.results.length)
      } else if (Array.isArray(response)) {
        setAllProducts(response)
        setTotalProductCount(response.length)
      } else {
        console.error("API returned unexpected data structure:", response)
        setAllProducts([])
        setError("Data format error. Please try again later.")
      }
    } catch (err) {
      console.error("Failed to fetch products for category:", err)
      setError("Failed to load products. Please try again later.")
      setAllProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToCart = (product: Product) => {
    try {
      if (!product || !product.id) {
        console.error("Invalid product data", product);
        return;
      }
      
      // Use the minimum price variant for cart
      const defaultPrice = product.min_price || 0;
      
      addItem({
        id: parseInt(String(product.id)) || 0,  // Convert to string first, then to number, fallback to 0
        productId: parseInt(String(product.id)) || 0,  // Add productId property required by cart provider
        name: product.name || "Unknown Product",
        price: defaultPrice,
        image: product.image || "/placeholder.svg",  // Provide a default image
      });
    } catch (err) {
      console.error("Error adding item to cart:", err);
    }
  }

  const clearSearch = () => {
    setSearchTerm("")
  }

  const clearCategory = () => {
    setSelectedCategory("all")
  }

  const hasActiveFilters = searchTerm || selectedCategory !== "all"

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-slate-500">Loading products...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold mb-4">
          {selectedCategory === "all"
            ? "All Products"
            : allCategories.find(cat => cat.slug === selectedCategory)?.name || "Products"}
        </h1>
        <p className="text-slate-600">
          {searchTerm ? `Search results for "${searchTerm}"` : "Discover our complete collection of Apple products"}
        </p>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-600">Active filters:</span>
            {searchTerm && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Search: {searchTerm}
                <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={clearSearch}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {selectedCategory !== "all" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Category: {selectedCategory}
                <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={clearCategory}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8 p-4 bg-slate-50 rounded-lg">
        <div className="flex-1">
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allCategories.map((category) => (
              <SelectItem key={category.id} value={category.slug}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      {!isLoading && !error && (
        <div className="mb-6">
          <p className="text-sm text-slate-600">
            Showing {filteredProducts.length} of {totalProductCount} products
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-t-blue-600 border-b-blue-600 border-l-gray-200 border-r-gray-200 rounded-full animate-spin mb-4 mx-auto"></div>
            <p className="text-slate-600">Loading products...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2 text-red-600">Oops! Something went wrong</h3>
            <p className="text-slate-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {!isLoading && !error && filteredProducts.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product: Product) => (
          <Card key={product.id} className="group hover:shadow-xl transition-all duration-300 h-full flex flex-col">
            <CardContent className="p-6 flex flex-col h-full">
              <Link href={`/products/${product.id}`} className="block">
                <div className="relative mb-4">
                  {product.badge && (
                    <Badge className="absolute top-2 left-2 z-10 bg-red-500 hover:bg-red-600">{product.badge}</Badge>
                  )}
                  <div className="absolute top-2 right-2 z-10">
                    <WishlistButton 
                      productId={typeof product.id === 'string' ? parseInt(product.id) : product.id}
                      variant="icon"
                      className="bg-white/80 hover:bg-white shadow-md"
                    />
                  </div>
                  <div className="relative aspect-square w-full">
                    <Image
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      fill
                      unoptimized={product.image?.startsWith('http')}
                      className="object-contain rounded-lg group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              </Link>
              <div className="space-y-3 flex-1 flex flex-col">
                <Link href={`/products/${product.id}`} className="block">
                  <h3 className="text-lg font-bold line-clamp-2 min-h-[3.5rem]">{product.name}</h3>
                </Link>
                <p className="text-sm text-slate-600 line-clamp-2 min-h-[2.5rem] flex-1">{product.description}</p>
                <div className="space-y-3 mt-auto">
                  <div className="flex items-center gap-2">
                    <StarRating rating={product.rating} size="md" />
                    <span className="text-sm text-slate-600">({product.reviews})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {product.min_price === product.max_price ? (
                      <span className="text-xl font-bold">${product.min_price}</span>
                    ) : (
                      <span className="text-xl font-bold">${product.min_price} - ${product.max_price}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href={`/products/${product.id}`} className="w-full">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 justify-center">
                        Buy
                      </Button>
                    </Link>
                    <WishlistButton 
                      productId={typeof product.id === 'string' ? parseInt(product.id) : product.id}
                      variant="text"
                      className="w-full justify-center"
                      showText={true}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* No Results */}
      {!isLoading && !error && filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-slate-500 mb-4">
              {searchTerm
                ? `No products match your search for "${searchTerm}"`
                : "No products found matching your criteria."}
            </p>
            {hasActiveFilters && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Try:</p>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li>• Checking your spelling</li>
                  <li>• Using different keywords</li>
                  <li>• Removing some filters</li>
                </ul>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    handleCategoryChange("all")
                  }}
                  className="mt-4"
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}