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
import { WishlistButton } from "@/components/wishlist-button"
import { ProductGallery } from "@/components/product-gallery"
import { ProductSpecs } from "@/components/product-specs"
import { ProductRecommendations } from "@/components/product-recommendations"
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
  const [currentPrice, setCurrentPrice] = useState<number>(0)

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

  const updatePrice = (color: string, storage: string, product: Product) => {
    // Find the exact variant based on color and storage
    let selectedVariant = product.variants.find(variant => 
      variant.color.name === color && variant.storage === storage
    );
    
    // If no exact match, find variant with selected color
    if (!selectedVariant && color) {
      selectedVariant = product.variants.find(variant => 
        variant.color.name === color
      );
    }
    
    // If still no match, use the first available variant
    if (!selectedVariant && product.variants.length > 0) {
      selectedVariant = product.variants[0];
    }
    
    const price = selectedVariant ? parseFloat(selectedVariant.price) : product.min_price;
    setCurrentPrice(price);
  }

  // Get available storage options for the selected color
  const getAvailableStoragesForColor = (color: string, product: Product) => {
    if (!color || !product.variants) return product.available_storages || [];
    
    const availableStorages = product.variants
      .filter(variant => variant.color.name === color && variant.is_in_stock)
      .map(variant => variant.storage)
      .filter((storage, index, array) => array.indexOf(storage) === index); // Remove duplicates
    
    // Sort storage options in logical order
    return availableStorages.sort((a, b) => {
      const storageOrder = {
        '128GB': 1,
        '256GB': 2,
        '512GB': 3,
        '1TB': 4,
        '2TB': 5
      };
      
      const aOrder = storageOrder[a as keyof typeof storageOrder] || 999;
      const bOrder = storageOrder[b as keyof typeof storageOrder] || 999;
      
      return aOrder - bOrder;
    });
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
          const defaultColor = foundProduct.available_colors && foundProduct.available_colors.length > 0 
            ? foundProduct.available_colors[0].name 
            : "";
          
          // Get available storages for the default color
          const availableStoragesForColor = getAvailableStoragesForColor(defaultColor, foundProduct);
          const defaultStorage = availableStoragesForColor.length > 0 
            ? availableStoragesForColor[0] 
            : "";
          
          setSelectedColor(defaultColor)
          setSelectedStorage(defaultStorage)
          
          // Set initial price
          updatePrice(defaultColor, defaultStorage, foundProduct)
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
      
      // Find the selected variant or use the first available variant
      let selectedVariant = product.variants.find(variant => 
        variant.color.name === selectedColor && variant.storage === selectedStorage
      );
      
      // If no exact match, find by color only
      if (!selectedVariant) {
        selectedVariant = product.variants.find(variant => 
          variant.color.name === selectedColor
        );
      }
      
      // If still no match, use the first variant
      if (!selectedVariant && product.variants.length > 0) {
        selectedVariant = product.variants[0];
      }
      
      const variantPrice = currentPrice || (selectedVariant ? parseFloat(selectedVariant.price) : product.min_price);
      
      await addItem({
        id: Number(product.id),
        productId: Number(product.id),
        name: product.name,
        price: variantPrice,
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
              href={`/products?category=${product.category.slug}`} 
              className="hover:text-blue-600 capitalize"
            >
              {product.category.name}
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
            <span className="text-3xl font-bold">${currentPrice || product.min_price}</span>
            {product.min_price !== product.max_price && (
              <span className="text-sm text-slate-500">
                (${product.min_price} - ${product.max_price})
              </span>
            )}
          </div>

          {/* Short Description */}
          <p className="text-slate-600">{product.description}</p>

          <Separator />

          {/* Color Options */}
          {product.available_colors && product.available_colors.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Color</h3>
              <div className="flex flex-wrap gap-3">
                {Array.from(new Map(product.available_colors.map(color => [color.id, color])).values()).map((color: ProductColor) => (
                  <Button
                    key={color.id}
                    variant="outline"
                    className={`rounded-full w-12 h-12 p-0 border-2 ${
                      selectedColor === color.name ? "border-blue-600" : "border-slate-200"
                    }`}
                    style={{ backgroundColor: color.hex_code }}
                    onClick={() => {
                      const newColor = color.name;
                      const availableStoragesForNewColor = getAvailableStoragesForColor(newColor, product);
                      
                      // Try to keep the current storage if it's available for the new color
                      let newStorage = selectedStorage;
                      if (!availableStoragesForNewColor.includes(selectedStorage)) {
                        // If current storage is not available for new color, select the first available one
                        newStorage = availableStoragesForNewColor.length > 0 ? availableStoragesForNewColor[0] : "";
                      }
                      
                      setSelectedColor(newColor)
                      setSelectedStorage(newStorage)
                      updatePrice(newColor, newStorage, product)
                    }}
                  >
                    {selectedColor === color.name && <Check className="h-4 w-4 text-white" />}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Storage Options */}
          {(() => {
            const availableStoragesForSelectedColor = getAvailableStoragesForColor(selectedColor, product);
            return availableStoragesForSelectedColor.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium">Storage</h3>
                <div className="flex flex-wrap gap-3">
                  {availableStoragesForSelectedColor.map((size: string) => (
                    <Button
                      key={size}
                      variant={selectedStorage === size ? "default" : "outline"}
                      className={selectedStorage === size ? "bg-blue-600 hover:bg-blue-700" : ""}
                      onClick={() => {
                        setSelectedStorage(size)
                        updatePrice(selectedColor, size, product)
                      }}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })()}

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
            <WishlistButton 
              productId={typeof product.id === 'string' ? parseInt(product.id) : product.id} 
              variant="default" 
              size="lg" 
              className="flex-1"
            />
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
              <p>{product.full_description || product.description}</p>

              {product.features && product.features.length > 0 && (
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

      {/* Product Recommendations */}
      <ProductRecommendations productId={product.id} />
    </div>
  )
}
