"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Plus, Search, Edit, Trash2, Eye, RefreshCw, Star, Package, Palette, Settings } from "lucide-react"
import { 
  getAllProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getAllColors,
  createColor,
  getAllVariants,
  createVariant,
  getProductVariants,
  updateVariant,
  deleteVariant
} from "@/lib/services/products"
import { getAllCategories } from "@/lib/services/categories"
import { analyticsService } from "@/lib/services/analytics"
import { SafeImage } from "@/components/safe-image"
import { ImageUpload } from "@/components/image-upload"
import { useImageCache } from "@/hooks/use-image-cache"

// Types
interface ProductStats {
  totalSales: number
  revenue: number
  pageViews: number
  conversionRate: string
}

interface Color {
  id: number
  name: string
  hex_code: string
}

interface Variant {
  id?: number
  product?: number
  color: any
  storage: string
  price: number
  stock: number
  is_in_stock: boolean
}

interface Product {
  id: number
  name: string
  category: any
  image: string
  description: string
  full_description: string
  features: string[]
  badge: string
  rating: number
  reviews: number
  variants: Variant[]
  min_price: number
  max_price: number
  total_stock: number
  available_colors: Color[]
  available_storages: string[]
  created_at: string
}

// Helper functions
const formatImageUrl = (url: string | null | undefined): string => {
  if (!url) return "/placeholder.jpg"
  if (url.startsWith("http")) return url
  return `http://localhost:8000${url}`
}

const isExternalImage = (url: string | null | undefined): boolean => {
  if (!url) return false
  return url.startsWith("http")
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [colors, setColors] = useState<Color[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false)
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false)
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null)
  const [productVariants, setProductVariants] = useState<Variant[]>([])
  
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [productStats, setProductStats] = useState<ProductStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  
  const { getCachedImageUrl, invalidateCache, refreshAllImages, updateTrigger } = useImageCache()
  const { toast } = useToast()

  // Form states
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    description: "",
    full_description: "",
    badge: "",
    image: "" as string | File | null,
    features: [] as string[],
  })

  const [newVariant, setNewVariant] = useState({
    color: "",
    storage: "",
    price: "",
    stock: "",
  })

  const [newColor, setNewColor] = useState({
    name: "",
    hex_code: "#000000",
  })

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [productsData, categoriesData, colorsData] = await Promise.all([
        getAllProducts(),
        getAllCategories(),
        getAllColors()
      ])
      
      console.log("Products API Response:", productsData)
      console.log("Categories API Response:", categoriesData)
      console.log("Colors API Response:", colorsData)
      
      // Handle products data
      if (Array.isArray(productsData)) {
        setProducts(productsData)
      } else if (productsData && Array.isArray(productsData.results)) {
        setProducts(productsData.results)
      } else {
        setProducts([])
      }
      
      // Handle categories data
      if (Array.isArray(categoriesData)) {
        setCategories(categoriesData)
      } else if (categoriesData && Array.isArray(categoriesData.results)) {
        setCategories(categoriesData.results)
      } else {
        setCategories([])
      }

      // Handle colors data
      if (Array.isArray(colorsData)) {
        setColors(colorsData)
      } else if (colorsData && Array.isArray(colorsData.results)) {
        setColors(colorsData.results)
      } else {
        setColors([])
      }
    } catch (err) {
      setError("Failed to load data")
      console.error("Error loading data:", err)
      setProducts([])
      setCategories([])
      setColors([])
    } finally {
      setLoading(false)
    }
  }

  // Reload products function
  const reloadProducts = async () => {
    try {
      setIsRefreshing(true)
      const productsData = await getAllProducts()
      
      if (Array.isArray(productsData)) {
        setProducts(productsData)
      } else if (productsData && Array.isArray(productsData.results)) {
        setProducts(productsData.results)
      } else {
        setProducts([])
      }
      
      refreshAllImages()
      
      toast({
        title: "Products refreshed",
        description: "Product list has been refreshed.",
      })
    } catch (err) {
      console.error("Error reloading products:", err)
      toast({
        title: "Refresh failed",
        description: "Failed to refresh products. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Load product statistics
  const loadProductStats = async (productId: number) => {
    try {
      setLoadingStats(true)
      const stats = await analyticsService.getProductStats(productId)
      setProductStats(stats)
    } catch (error) {
      console.error("Error loading product stats:", error)
      setProductStats({
        totalSales: 156,
        revenue: 155844,
        pageViews: 2340,
        conversionRate: "6.7%"
      })
    } finally {
      setLoadingStats(false)
    }
  }

  // Filter products
  const filteredProducts = products.filter((product) => {
    if (!product || !product.name) return false
    
    const categoryName = product.category?.name || ""
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || categoryName === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Handle add product (create product first, then variants)
  const handleAddProduct = async () => {
    try {
      // First create the product
      const productData: any = {
        name: newProduct.name,
        category_id: newProduct.category,
        description: newProduct.description,
        full_description: newProduct.full_description,
        badge: newProduct.badge || null,
        features: newProduct.features,
      }

      // Handle image
      if (newProduct.image instanceof File) {
        productData.imageFile = newProduct.image
      }

      console.log("Creating product:", productData)
      const createdProduct = await createProduct(productData)
      console.log("Created product:", createdProduct)
      
      // Update products list
      setProducts(prev => [...prev, createdProduct])
      
      // Reset form
      setNewProduct({
        name: "",
        category: "",
        description: "",
        full_description: "",
        badge: "",
        image: "",
        features: [],
      })
      
      setIsAddDialogOpen(false)
      
      toast({
        title: "Product created",
        description: "Product has been created successfully. You can now add variants.",
      })
      
      // Optionally open variant dialog for the new product
      setSelectedProductForVariants(createdProduct)
      setIsVariantDialogOpen(true)
      
    } catch (error) {
      console.error("Error adding product:", error)
      toast({
        title: "Error",
        description: "Failed to create product. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle edit product
  const handleEditProduct = async () => {
    if (!editingProduct) return

    try {
      const productData: any = {
        name: newProduct.name,
        category_id: newProduct.category,
        description: newProduct.description,
        full_description: newProduct.full_description,
        badge: newProduct.badge || null,
        features: newProduct.features,
      }

      // Handle image
      if (newProduct.image instanceof File) {
        productData.imageFile = newProduct.image
      } else if (newProduct.image === null) {
        productData.imageFile = null
      }

      console.log("Updating product:", productData)
      const updatedProduct = await updateProduct(editingProduct.id.toString(), productData)
      console.log("Updated product:", updatedProduct)
      
      // Update products list
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? updatedProduct : p))
      
      if (updatedProduct.image) {
        invalidateCache(formatImageUrl(updatedProduct.image))
      }
      
      setEditingProduct(null)
      setIsEditDialogOpen(false)
      
      // Reset form
      setNewProduct({
        name: "",
        category: "",
        description: "",
        full_description: "",
        badge: "",
        image: "",
        features: [],
      })
      
      toast({
        title: "Product updated",
        description: "Product has been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating product:", error)
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle delete product
  const handleDeleteProduct = async (id: number) => {
    try {
      await deleteProduct(id.toString())
      setProducts(prev => prev.filter(p => p.id !== id))
      
      toast({
        title: "Product deleted",
        description: "Product has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle load product variants
  const handleLoadProductVariants = async (product: Product) => {
    try {
      setSelectedProductForVariants(product)
      const variants = await getProductVariants(product.id.toString())
      setProductVariants(Array.isArray(variants) ? variants : [])
      setIsVariantDialogOpen(true)
    } catch (error) {
      console.error("Error loading variants:", error)
      toast({
        title: "Error",
        description: "Failed to load product variants.",
        variant: "destructive",
      })
    }
  }

  // Handle add variant
  const handleAddVariant = async () => {
    if (!selectedProductForVariants) return

    try {
      const variantData = {
        product: selectedProductForVariants.id,
        color_id: newVariant.color,
        storage: newVariant.storage,
        price: parseFloat(newVariant.price),
        stock: parseInt(newVariant.stock),
      }

      console.log("Creating variant:", variantData)
      const createdVariant = await createVariant(variantData)
      console.log("Created variant:", createdVariant)
      
      // Update variants list
      setProductVariants(prev => [...prev, createdVariant])
      
      // Reset variant form
      setNewVariant({
        color: "",
        storage: "",
        price: "",
        stock: "",
      })
      
      // Reload products to get updated variant info
      reloadProducts()
      
      toast({
        title: "Variant added",
        description: "Product variant has been added successfully.",
      })
    } catch (error) {
      console.error("Error adding variant:", error)
      toast({
        title: "Error",
        description: "Failed to add variant. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle add color
  const handleAddColor = async () => {
    try {
      const colorData = {
        name: newColor.name,
        hex_code: newColor.hex_code,
      }

      console.log("Creating color:", colorData)
      const createdColor = await createColor(colorData)
      console.log("Created color:", createdColor)
      
      // Update colors list
      setColors(prev => [...prev, createdColor])
      
      // Reset color form
      setNewColor({
        name: "",
        hex_code: "#000000",
      })
      
      setIsColorDialogOpen(false)
      
      toast({
        title: "Color added",
        description: "New color has been added successfully.",
      })
    } catch (error) {
      console.error("Error adding color:", error)
      toast({
        title: "Error",
        description: "Failed to add color. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-8">
      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="text-red-600 font-medium">{error}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-slate-600">Loading products...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content - Only show when not loading */}
      {!loading && (
        <>
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Products</h1>
              <p className="text-slate-600">Manage your product catalog and variants</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={reloadProducts}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              
              {/* Add Color Button */}
              <Dialog open={isColorDialogOpen} onOpenChange={setIsColorDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Palette className="mr-2 h-4 w-4" />
                    Add Color
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Color</DialogTitle>
                    <DialogDescription>Add a new color option for product variants</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="colorName">Color Name</Label>
                      <Input
                        id="colorName"
                        value={newColor.name}
                        onChange={(e) => setNewColor(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Midnight Black, Ocean Blue"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="colorHex">Hex Code</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={newColor.hex_code}
                          onChange={(e) => setNewColor(prev => ({ ...prev, hex_code: e.target.value }))}
                          className="w-12 h-10 rounded border"
                        />
                        <Input
                          id="colorHex"
                          value={newColor.hex_code}
                          onChange={(e) => setNewColor(prev => ({ ...prev, hex_code: e.target.value }))}
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsColorDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddColor}>Add Color</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Add Product Button */}
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>Create a new product. You can add variants after creation.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Product Name</Label>
                        <Input
                          id="name"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={newProduct.category}
                          onValueChange={(value) => setNewProduct(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Short Description</Label>
                      <Textarea
                        id="description"
                        value={newProduct.description}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fullDescription">Full Description</Label>
                      <Textarea
                        id="fullDescription"
                        value={newProduct.full_description}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, full_description: e.target.value }))}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="badge">Badge (Optional)</Label>
                      <Input
                        id="badge"
                        value={newProduct.badge}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, badge: e.target.value }))}
                        placeholder="e.g., New, Sale, Popular"
                      />
                    </div>

                    <div className="space-y-2">
                      <ImageUpload
                        value={newProduct.image || undefined}
                        onChange={(value) => setNewProduct(prev => ({ ...prev, image: value }))}
                        label="Product Image"
                      />
                    </div>

                    {/* Features Section */}
                    <div className="space-y-2">
                      <Label>Features</Label>
                      <div className="space-y-2">
                        {newProduct.features.map((feature, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={feature}
                              onChange={(e) => {
                                const newFeatures = [...newProduct.features]
                                newFeatures[index] = e.target.value
                                setNewProduct(prev => ({ ...prev, features: newFeatures }))
                              }}
                              placeholder="Enter feature"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const newFeatures = newProduct.features.filter((_, i) => i !== index)
                                setNewProduct(prev => ({ ...prev, features: newFeatures }))
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setNewProduct(prev => ({ ...prev, features: [...prev.features, ""] }))
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Feature
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddProduct}>Create Product</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>Products ({filteredProducts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price Range</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Variants</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-slate-500">
                          No products found
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                              <SafeImage
                                src={getCachedImageUrl(formatImageUrl(product.image))}
                                alt={product.name || "Product"}
                                width={40}
                                height={40}
                                className="object-contain"
                                unoptimized={isExternalImage(product.image)}
                              />
                            </div>
                            <div>
                              <p className="font-medium">{product.name || "Unnamed Product"}</p>
                              <p className="text-sm text-slate-600 line-clamp-1">{product.description || "No description"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {product.category?.name || "uncategorized"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            {product.min_price && product.max_price ? (
                              product.min_price === product.max_price ? (
                                <p className="font-medium">${product.min_price}</p>
                              ) : (
                                <p className="font-medium">${product.min_price} - ${product.max_price}</p>
                              )
                            ) : (
                              <p className="text-slate-500">No variants</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <span className="text-sm font-medium">{product.total_stock || 0}</span>
                            <span className="text-xs text-slate-500 block">total</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {product.variants?.length || 0} variants
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLoadProductVariants(product)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="text-sm">{product.rating || 0}</span>
                            <Star className="h-3 w-3 ml-1 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-slate-500 ml-1">({product.reviews || 0})</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setViewingProduct(product)
                                setIsViewDialogOpen(true)
                                loadProductStats(product.id)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingProduct(product)
                                setNewProduct({
                                  name: product.name || "",
                                  category: product.category?.id?.toString() || "",
                                  description: product.description || "",
                                  full_description: product.full_description || "",
                                  badge: product.badge || "",
                                  image: product.image || "",
                                  features: product.features || [],
                                })
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Product Variants Dialog */}
          <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Product Variants - {selectedProductForVariants?.name}
                </DialogTitle>
                <DialogDescription>
                  Manage color and storage variants for this product
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Add New Variant Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Variant</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Color</Label>
                        <Select
                          value={newVariant.color}
                          onValueChange={(value) => setNewVariant(prev => ({ ...prev, color: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                          <SelectContent>
                            {colors.map((color) => (
                              <SelectItem key={color.id} value={color.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded border"
                                    style={{ backgroundColor: color.hex_code }}
                                  />
                                  {color.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Storage</Label>
                        <Select
                          value={newVariant.storage}
                          onValueChange={(value) => setNewVariant(prev => ({ ...prev, storage: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select storage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="128GB">128 GB</SelectItem>
                            <SelectItem value="256GB">256 GB</SelectItem>
                            <SelectItem value="512GB">512 GB</SelectItem>
                            <SelectItem value="1TB">1 TB</SelectItem>
                            <SelectItem value="2TB">2 TB</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newVariant.price}
                          onChange={(e) => setNewVariant(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Stock</Label>
                        <Input
                          type="number"
                          value={newVariant.stock}
                          onChange={(e) => setNewVariant(prev => ({ ...prev, stock: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button onClick={handleAddVariant}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Variant
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Existing Variants List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Existing Variants ({productVariants.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Color</TableHead>
                          <TableHead>Storage</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productVariants.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <div className="text-slate-500">
                                No variants found. Add your first variant above.
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          productVariants.map((variant) => (
                            <TableRow key={variant.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded border"
                                    style={{ backgroundColor: variant.color?.hex_code }}
                                  />
                                  {variant.color?.name}
                                </div>
                              </TableCell>
                              <TableCell>{variant.storage}</TableCell>
                              <TableCell>${variant.price}</TableCell>
                              <TableCell>{variant.stock}</TableCell>
                              <TableCell>
                                <Badge variant={variant.is_in_stock ? "default" : "destructive"}>
                                  {variant.is_in_stock ? "In Stock" : "Out of Stock"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (variant.id) {
                                      deleteVariant(variant.id.toString())
                                        .then(() => {
                                          setProductVariants(prev => prev.filter(v => v.id !== variant.id))
                                          reloadProducts()
                                          toast({
                                            title: "Variant deleted",
                                            description: "Product variant has been deleted successfully.",
                                          })
                                        })
                                        .catch(error => {
                                          console.error("Error deleting variant:", error)
                                          toast({
                                            title: "Error",
                                            description: "Failed to delete variant.",
                                            variant: "destructive",
                                          })
                                        })
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsVariantDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Product Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Product</DialogTitle>
                <DialogDescription>Update product information. Variants can be managed separately.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Product Name</Label>
                    <Input
                      id="edit-name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Select
                      value={newProduct.category}
                      onValueChange={(value) => setNewProduct(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Short Description</Label>
                  <Textarea
                    id="edit-description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-fullDescription">Full Description</Label>
                  <Textarea
                    id="edit-fullDescription"
                    value={newProduct.full_description}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, full_description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-badge">Badge (Optional)</Label>
                  <Input
                    id="edit-badge"
                    value={newProduct.badge}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, badge: e.target.value }))}
                    placeholder="e.g., New, Sale, Popular"
                  />
                </div>

                <div className="space-y-2">
                  <ImageUpload
                    value={newProduct.image || undefined}
                    onChange={(value) => setNewProduct(prev => ({ ...prev, image: value }))}
                    label="Product Image"
                  />
                </div>

                {/* Features Section */}
                <div className="space-y-2">
                  <Label>Features</Label>
                  <div className="space-y-2">
                    {newProduct.features.map((feature, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={feature}
                          onChange={(e) => {
                            const newFeatures = [...newProduct.features]
                            newFeatures[index] = e.target.value
                            setNewProduct(prev => ({ ...prev, features: newFeatures }))
                          }}
                          placeholder="Enter feature"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const newFeatures = newProduct.features.filter((_, i) => i !== index)
                            setNewProduct(prev => ({ ...prev, features: newFeatures }))
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setNewProduct(prev => ({ ...prev, features: [...prev.features, ""] }))
                      }}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Feature
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditProduct} disabled={loading}>
                  {loading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Product"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* View Product Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Product Details - {viewingProduct?.name}</DialogTitle>
                <DialogDescription>
                  Detailed view of product information and statistics
                </DialogDescription>
              </DialogHeader>
              
              {viewingProduct && (
                <div className="grid gap-6">
                  {/* Product Image */}
                  <div className="flex justify-center">
                    <div className="w-64 h-64 rounded-lg overflow-hidden bg-gray-100">
                      <SafeImage
                        src={formatImageUrl(viewingProduct.image)}
                        alt={viewingProduct.name}
                        width={256}
                        height={256}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">Product Name</Label>
                        <p className="text-lg font-medium">{viewingProduct.name}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">Category</Label>
                        <p className="text-lg">{viewingProduct.category?.name || 'Uncategorized'}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">Badge</Label>
                        <p className="text-lg">{viewingProduct.badge || 'None'}</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">Rating</Label>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(viewingProduct.rating || 0)
                                    ? "text-yellow-400 fill-current"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-lg">
                            {viewingProduct.rating} ({viewingProduct.reviews} reviews)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">Price Range</Label>
                        <p className="text-lg font-semibold text-green-600">
                          ${viewingProduct.min_price} - ${viewingProduct.max_price}
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">Total Stock</Label>
                        <p className="text-lg">{viewingProduct.total_stock} units</p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">Available Colors</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {viewingProduct.available_colors
                            ?.filter((color, index, self) => 
                              index === self.findIndex(c => c.id === color.id)
                            )
                            ?.map((color) => (
                            <div key={color.id} className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded">
                              <div
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: color.hex_code }}
                              />
                              <span className="text-sm">{color.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">Storage Options</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {[...new Set(viewingProduct.available_storages)]
                            ?.sort((a, b) => {
                              // Convert storage strings to numbers for proper sorting
                              const getValue = (storage: string) => {
                                const num = parseFloat(storage);
                                if (storage.includes('TB')) return num * 1000;
                                return num;
                              };
                              return getValue(a) - getValue(b);
                            })
                            ?.map((storage) => (
                            <Badge key={storage} variant="outline">
                              {storage}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Descriptions */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold text-gray-600">Short Description</Label>
                      <p className="text-gray-700 mt-1">{viewingProduct.description}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-semibold text-gray-600">Full Description</Label>
                      <p className="text-gray-700 mt-1">{viewingProduct.full_description}</p>
                    </div>
                    
                    {viewingProduct.features && viewingProduct.features.length > 0 && (
                      <div>
                        <Label className="text-sm font-semibold text-gray-600">Features</Label>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          {viewingProduct.features.map((feature, index) => (
                            <li key={index} className="text-gray-700">{feature}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Product Variants */}
                  {viewingProduct.variants && viewingProduct.variants.length > 0 && (
                    <div>
                      <Label className="text-sm font-semibold text-gray-600">Product Variants</Label>
                      <div className="mt-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Color</TableHead>
                              <TableHead>Storage</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead>Stock</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {viewingProduct.variants.map((variant) => (
                              <TableRow key={variant.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-4 h-4 rounded border"
                                      style={{ backgroundColor: variant.color?.hex_code }}
                                    />
                                    {variant.color?.name}
                                  </div>
                                </TableCell>
                                <TableCell>{variant.storage}</TableCell>
                                <TableCell>${variant.price}</TableCell>
                                <TableCell>{variant.stock}</TableCell>
                                <TableCell>
                                  <Badge variant={variant.is_in_stock ? "default" : "destructive"}>
                                    {variant.is_in_stock ? "In Stock" : "Out of Stock"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Product Statistics */}
                  {productStats && (
                    <div>
                      <Label className="text-sm font-semibold text-gray-600">Product Statistics</Label>
                      <div className="grid grid-cols-4 gap-4 mt-2">
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold">{productStats.totalSales}</div>
                            <p className="text-xs text-muted-foreground">Total Sales</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold">${productStats.revenue}</div>
                            <p className="text-xs text-muted-foreground">Revenue</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold">{productStats.pageViews}</div>
                            <p className="text-xs text-muted-foreground">Page Views</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold">{productStats.conversionRate}%</div>
                            <p className="text-xs text-muted-foreground">Conversion Rate</p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {/* Creation Date */}
                  <div>
                    <Label className="text-sm font-semibold text-gray-600">Created Date</Label>
                    <p className="text-gray-700 mt-1">
                      {new Date(viewingProduct.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsViewDialogOpen(false)
                    setEditingProduct(viewingProduct)
                    if (viewingProduct) {
                      setNewProduct({
                        name: viewingProduct.name || "",
                        category: viewingProduct.category?.id?.toString() || "",
                        description: viewingProduct.description || "",
                        full_description: viewingProduct.full_description || "",
                        badge: viewingProduct.badge || "",
                        image: viewingProduct.image || "",
                        features: viewingProduct.features || [],
                      })
                    }
                    setIsEditDialogOpen(true)
                  }}
                >
                  Edit Product
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
