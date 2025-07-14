"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ShoppingCart, Heart, Share2, ChevronLeft, Star, Check, Shield, Truck } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { ProductGallery } from "@/components/product-gallery"
import { ProductSpecs } from "@/components/product-specs"
import { RelatedProducts } from "@/components/related-products"
import { getAllProducts } from "@/lib/services/products"
import { WriteReviewDialog } from "@/components/write-review-dialog"
import { ReviewList } from "@/components/review-list"
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
  colors?: string[]
  storage?: string[]
  features?: string[]
  specs?: Record<string, string>
}

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const { addItem } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedColor, setSelectedColor] = useState<string>("")
  const [selectedStorage, setSelectedStorage] = useState<string>("")
  const [quantity, setQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const [reviewRefreshTrigger, setReviewRefreshTrigger] = useState(0)

  const refreshProductData = async () => {
    try {
      const productId = params.id as string
      const response = await getAllProducts()
      
      let productsArray: Product[] = [];
      
      if (response && response.results && Array.isArray(response.results)) {
        productsArray = response.results;
      } else if (Array.isArray(response)) {
        productsArray = response;
      }
      
      const foundProduct = productsArray.find((p: Product) => String(p.id) === String(productId))
      if (foundProduct) {
        setProduct(foundProduct)
      }
    } catch (err) {
      console.error("Error refreshing product data:", err)
    }
  }

  const handleReviewChange = () => {
    setReviewRefreshTrigger(prev => prev + 1)
    // Also refresh product data to get updated rating and review count
    refreshProductData()
  }

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        const productId = params.id as string
        const response = await getAllProducts()
        
        let productsArray: Product[] = [];
        
        // Handle paginated response structure
        if (response && response.results && Array.isArray(response.results)) {
          productsArray = response.results;
        } else if (Array.isArray(response)) {
          productsArray = response;
        } else {
          console.error("Unexpected API response format:", response);
          setError("Failed to load product data. Please try again later.");
          setLoading(false);
          return;
        }
        
        // Compare as strings to ensure consistent matching regardless of ID format
        const foundProduct = productsArray.find((p: Product) => String(p.id) === String(productId))

        if (foundProduct) {
          setProduct(foundProduct)
          // Set default selections
          if (foundProduct.colors && foundProduct.colors.length > 0) {
            setSelectedColor(foundProduct.colors[0])
          }
          if (foundProduct.storage && foundProduct.storage.length > 0) {
            setSelectedStorage(foundProduct.storage[0])
          }
          setLoading(false)
        } else {
          setError("Product not found")
          setLoading(false)
        }
      } catch (err) {
        console.error("Error fetching product:", err)
        setError("Failed to load product. Please try again later.")
        setLoading(false)
      }
    }

    fetchProduct()
  }, [params.id])

  const handleAddToCart = async () => {
    if (!product) return

    try {
      setAddingToCart(true)
      await addItem({
        id: Number(product.id),
        productId: Number(product.id),
        name: product.name,
        price: product.price,
        image: product.image || '',
        color: selectedColor,
        storage: selectedStorage,
      })
      // Optional: Show success message or redirect
      alert('Item added to cart successfully!')
    } catch (error) {
      console.error('Failed to add item to cart:', error)
      alert('Failed to add item to cart. Please try again.')
    } finally {
      setAddingToCart(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-pulse space-y-8 w-full max-w-4xl">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="h-96 bg-slate-200 rounded"></div>
            <div className="space-y-4">
              <div className="h-8 bg-slate-200 rounded w-3/4"></div>
              <div className="h-6 bg-slate-200 rounded w-1/4"></div>
              <div className="h-4 bg-slate-200 rounded w-full"></div>
              <div className="h-4 bg-slate-200 rounded w-full"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="mb-8">{error}</p>
        <Button onClick={() => router.push("/products")}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Products
        </Button>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <p className="mb-8">Sorry, we couldn't find the product you're looking for.</p>
        <Button onClick={() => router.push("/products")}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Products
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:text-blue-600">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-blue-600">
          Products
        </Link>
        <span className="mx-2">/</span>
        {product.category && (
          <>
            <Link 
              href={`/products?category=${typeof product.category === 'object' ? product.category.slug : product.category}`} 
              className="hover:text-blue-600 capitalize"
            >
              {typeof product.category === 'object' ? product.category.name : product.category}
            </Link>
            <span className="mx-2">/</span>
          </>
        )}
        <span className="text-slate-900 font-medium">{product.name}</span>
      </div>

      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ChevronLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Product Gallery */}
        <ProductGallery product={product} />

        {/* Product Info */}
        <div className="space-y-6">
          {/* Title and Badges */}
          <div>
            {product.badge && <Badge className="mb-2 bg-red-500 hover:bg-red-600">{product.badge}</Badge>}
            <h1 className="text-3xl font-bold">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mt-2">
              <StarRating rating={product.rating} size="md" />
              <span className="text-sm text-slate-600">
                {product.rating} ({product.reviews} reviews)
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold">${product.price}</span>
            {product.originalPrice && (
              <span className="text-xl text-slate-500 line-through">${product.originalPrice}</span>
            )}
            {product.originalPrice && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Save ${product.originalPrice - product.price}
              </Badge>
            )}
          </div>

          {/* Short Description */}
          <p className="text-slate-600">{product.description}</p>

          <Separator />

          {/* Color Options */}
          {product.colors && product.colors.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Color</h3>
              <div className="flex flex-wrap gap-3">
                {product.colors.map((color: string) => (
                  <Button
                    key={color}
                    variant="outline"
                    className={`rounded-full w-12 h-12 p-0 border-2 ${
                      selectedColor === color ? "border-blue-600" : "border-slate-200"
                    }`}
                    style={{ backgroundColor: color.toLowerCase() }}
                    onClick={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && <Check className="h-4 w-4 text-white" />}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Storage Options */}
          {product.storage && product.storage.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Storage</h3>
              <div className="flex flex-wrap gap-3">
                {product.storage.map((size: string) => (
                  <Button
                    key={size}
                    variant={selectedStorage === size ? "default" : "outline"}
                    className={selectedStorage === size ? "bg-blue-600 hover:bg-blue-700" : ""}
                    onClick={() => setSelectedStorage(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-3">
            <h3 className="font-medium">Quantity</h3>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                -
              </Button>
              <span className="w-12 text-center">{quantity}</span>
              <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)}>
                +
              </Button>
            </div>
          </div>

          {/* Add to Cart and Wishlist */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 flex-1" onClick={handleAddToCart} disabled={addingToCart}>
              {addingToCart ? "Adding to Cart..." : <><ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart</>}
            </Button>
            <Button size="lg" variant="outline" className="flex-1">
              <Heart className="mr-2 h-5 w-5" /> Add to Wishlist
            </Button>
          </div>

          {/* Delivery and Returns */}
          <div className="bg-slate-50 p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <Truck className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium">Free Delivery</h4>
                <p className="text-sm text-slate-600">Free standard shipping on orders over $99</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium">1-Year Warranty</h4>
                <p className="text-sm text-slate-600">All products come with a 1-year warranty</p>
              </div>
            </div>
          </div>

          {/* Share */}
          <div className="flex items-center gap-4 pt-2">
            <span className="text-sm text-slate-600">Share:</span>
            <Button variant="ghost" size="sm" className="rounded-full p-2 h-auto">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <div className="mt-16">
        <Tabs defaultValue="description">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="p-6 border rounded-b-lg mt-2">
            <div className="prose max-w-none">
              <h3>About {product.name}</h3>
              <p>{product.description}</p>

              {product.features && (
                <>
                  <h4>Key Features</h4>
                  <ul>
                    {product.features.map((feature: string, index: number) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </TabsContent>
          <TabsContent value="specifications" className="p-6 border rounded-b-lg mt-2">
            <ProductSpecs product={product} />
          </TabsContent>
          <TabsContent value="reviews" className="p-6 border rounded-b-lg mt-2">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{product.rating} out of 5</h3>
                  <StarRating rating={product.rating} size="lg" />
                  <p className="text-sm text-slate-600 mt-1">Based on {product.reviews} reviews</p>
                </div>
                <WriteReviewDialog 
                  productId={Number(product.id)} 
                  productName={product.name}
                  onReviewSubmitted={handleReviewChange}
                />
              </div>

              <Separator />

              <ReviewList 
                productId={Number(product.id)} 
                refreshTrigger={reviewRefreshTrigger}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Products */}
      <RelatedProducts 
        currentProductId={product.id} 
        category={typeof product.category === 'object' ? product.category.slug : product.category} 
      />
    </div>
  )
}
