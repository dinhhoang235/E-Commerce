"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Trash2, Eye, Star } from "lucide-react"
import { ImageUpload } from "@/components/image-upload"
import { SafeImage } from "@/components/safe-image"
import { getallProducts, createProduct, updateProduct, deleteProduct } from "@/lib/services/products"
import { getAllCategories } from "@/lib/services/categories"
import { formatImageUrl, isExternalImage } from "@/lib/utils/image"

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [viewingProduct, setViewingProduct] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    price: "",
    originalPrice: "",
    description: "",
    fullDescription: "",
    badge: "",
    image: "",
    features: [] as string[],
    colors: [] as string[],
    storage: [] as string[],
  })

  // Load products and categories on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Load products and categories in parallel
        const [productsData, categoriesData] = await Promise.all([
          getallProducts(),
          getAllCategories()
        ])
        
        console.log("Products API Response:", productsData) // Debug log
        console.log("Categories API Response:", categoriesData) // Debug log
        
        // Handle products data
        if (Array.isArray(productsData)) {
          setProducts(productsData)
        } else if (productsData && Array.isArray(productsData.results)) {
          // Handle paginated response
          setProducts(productsData.results)
        } else if (productsData && typeof productsData === 'object') {
          // Handle object response - convert to array
          setProducts([productsData])
        } else {
          console.warn("Unexpected products API response format:", productsData)
          setProducts([])
        }
        
        // Handle categories data
        if (Array.isArray(categoriesData)) {
          setCategories(categoriesData)
        } else if (categoriesData && Array.isArray(categoriesData.results)) {
          // Handle paginated response
          setCategories(categoriesData.results)
        } else if (categoriesData && typeof categoriesData === 'object') {
          // Handle object response - convert to array
          setCategories([categoriesData])
        } else {
          console.warn("Unexpected categories API response format:", categoriesData)
          setCategories([])
        }
      } catch (err) {
        setError("Failed to load data")
        console.error("Error loading data:", err)
        setProducts([]) // Ensure products is always an array
        setCategories([]) // Ensure categories is always an array
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const filteredProducts = Array.isArray(products) ? products.filter((product) => {
    if (!product || !product.name) return false
    
    // Handle both camelCase and snake_case for category
    const categoryName = product.category?.name || product.category || ""
    if (!categoryName) return false
    
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || categoryName === selectedCategory
    return matchesSearch && matchesCategory
  }) : []

  const handleAddProduct = async () => {
    try {
      const productData = {
        name: newProduct.name,
        category_id: newProduct.category, // Use category_id for backend
        price: Number.parseFloat(newProduct.price),
        original_price: newProduct.originalPrice ? Number.parseFloat(newProduct.originalPrice) : null,
        description: newProduct.description,
        full_description: newProduct.fullDescription,
        badge: newProduct.badge || null,
        image: newProduct.image || null,
        features: newProduct.features,
        colors: newProduct.colors,
        storage: newProduct.storage,
      }

      console.log("Sending product data:", productData) // Debug log

      const createdProduct = await createProduct(productData)
      console.log("Created product:", createdProduct) // Debug log
      
      // Ensure products is an array before spreading
      const currentProducts = Array.isArray(products) ? products : []
      setProducts([...currentProducts, createdProduct])
      
      // Reset form
      setNewProduct({
        name: "",
        category: "",
        price: "",
        originalPrice: "",
        description: "",
        fullDescription: "",
        badge: "",
        image: "",
        features: [],
        colors: [],
        storage: [],
      })
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error("Error adding product:", error)
      setError("Failed to add product")
    }
  }

  const handleEditProduct = async () => {
    if (!editingProduct) return

    try {
      const productData = {
        name: newProduct.name,
        category_id: newProduct.category, // Use category_id for backend
        price: Number.parseFloat(newProduct.price),
        original_price: newProduct.originalPrice ? Number.parseFloat(newProduct.originalPrice) : null,
        description: newProduct.description,
        full_description: newProduct.fullDescription,
        badge: newProduct.badge || null,
        image: newProduct.image || null,
        features: newProduct.features,
        colors: newProduct.colors,
        storage: newProduct.storage,
      }

      console.log("Updating product data:", productData) // Debug log

      const updatedProduct = await updateProduct(editingProduct.id, productData)
      console.log("Updated product:", updatedProduct) // Debug log
      
      // Ensure products is an array before mapping
      const currentProducts = Array.isArray(products) ? products : []
      setProducts(currentProducts.map((p) => (p.id === editingProduct.id ? updatedProduct : p)))
      
      // Reset form
      setEditingProduct(null)
      setNewProduct({
        name: "",
        category: "",
        price: "",
        originalPrice: "",
        description: "",
        fullDescription: "",
        badge: "",
        image: "",
        features: [],
        colors: [],
        storage: [],
      })
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("Error updating product:", error)
      setError("Failed to update product")
    }
  }

  const handleDeleteProduct = async (id: number) => {
    try {
      await deleteProduct(id.toString())
      // Ensure products is an array before filtering
      const currentProducts = Array.isArray(products) ? products : []
      setProducts(currentProducts.filter((p) => p.id !== id))
    } catch (error) {
      console.error("Error deleting product:", error)
      setError("Failed to delete product")
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
          <p className="text-slate-600">Manage your product catalog</p>
        </div>
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
              <DialogDescription>Create a new product for your store</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newProduct.category}
                    onValueChange={(value) => setNewProduct((prev) => ({ ...prev, category: value }))}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, price: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="originalPrice">Original Price (Optional)</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    value={newProduct.originalPrice}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, originalPrice: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Short Description</Label>
                <Textarea
                  id="description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullDescription">Full Description</Label>
                <Textarea
                  id="fullDescription"
                  value={newProduct.fullDescription}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, fullDescription: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="badge">Badge (Optional)</Label>
                  <Input
                    id="badge"
                    value={newProduct.badge}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, badge: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <ImageUpload
                    value={newProduct.image}
                    onChange={(value) => setNewProduct((prev) => ({ ...prev, image: value }))}
                    label="Product Image"
                  />
                </div>
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
                          setNewProduct((prev) => ({ ...prev, features: newFeatures }))
                        }}
                        placeholder="Enter feature"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const newFeatures = newProduct.features.filter((_, i) => i !== index)
                          setNewProduct((prev) => ({ ...prev, features: newFeatures }))
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
                      setNewProduct((prev) => ({ ...prev, features: [...prev.features, ""] }))
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Feature
                  </Button>
                </div>
              </div>

              {/* Colors Section */}
              <div className="space-y-2">
                <Label>Colors</Label>
                <div className="space-y-2">
                  {newProduct.colors.map((color, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => {
                          const newColors = [...newProduct.colors]
                          newColors[index] = e.target.value
                          setNewProduct((prev) => ({ ...prev, colors: newColors }))
                        }}
                        className="w-12 h-10 rounded border"
                      />
                      <Input
                        value={color}
                        onChange={(e) => {
                          const newColors = [...newProduct.colors]
                          newColors[index] = e.target.value
                          setNewProduct((prev) => ({ ...prev, colors: newColors }))
                        }}
                        placeholder="#000000"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const newColors = newProduct.colors.filter((_, i) => i !== index)
                          setNewProduct((prev) => ({ ...prev, colors: newColors }))
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
                      setNewProduct((prev) => ({ ...prev, colors: [...prev.colors, "#000000"] }))
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Color
                  </Button>
                </div>
              </div>

              {/* Storage Section */}
              <div className="space-y-2">
                <Label>Storage Options</Label>
                <div className="space-y-2">
                  {newProduct.storage.map((storage, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={storage}
                        onChange={(e) => {
                          const newStorage = [...newProduct.storage]
                          newStorage[index] = e.target.value
                          setNewProduct((prev) => ({ ...prev, storage: newStorage }))
                        }}
                        placeholder="e.g., 128GB, 256GB"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const newStorage = newProduct.storage.filter((_, i) => i !== index)
                          setNewProduct((prev) => ({ ...prev, storage: newStorage }))
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
                      setNewProduct((prev) => ({ ...prev, storage: [...prev.storage, ""] }))
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Storage Option
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddProduct}>Add Product</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-slate-500">
                      {loading ? "Loading products..." : "No products found"}
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
                            src={formatImageUrl(product.image)}
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
                        {product.category?.name || product.category || "uncategorized"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">${product.price || 0}</p>
                        {(product.original_price || product.originalPrice) && (
                          <p className="text-sm text-slate-500 line-through">
                            ${product.original_price || product.originalPrice}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Active</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="text-sm">{product.rating || 0}</span>
                        <span className="text-xs text-slate-500 ml-1">({product.reviews || 0})</span>
                      </div>
                    </TableCell>                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setViewingProduct(product)
                            setIsViewDialogOpen(true)
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
                              category: product.category?.id || product.category_id || "",
                              price: product.price?.toString() || "",
                              originalPrice: (product.original_price || product.originalPrice)?.toString() || "",
                              description: product.description || "",
                              fullDescription: product.full_description || product.fullDescription || "",
                              badge: product.badge || "",
                              image: product.image || "",
                              features: product.features || [],
                              colors: product.colors || [],
                              storage: product.storage || [],
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
      {/* Product Detail View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>Complete product information and specifications</DialogDescription>
          </DialogHeader>
          {viewingProduct && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Product Image */}
                <div className="space-y-4">
                  <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden">
                    <SafeImage
                      src={formatImageUrl(viewingProduct.image)}
                      alt={viewingProduct.name || "Product"}
                      width={400}
                      height={400}
                      className="w-full h-full object-contain"
                      unoptimized={isExternalImage(viewingProduct.image)}
                    />
                  </div>
                </div>

                {/* Product Information */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {viewingProduct.badge && (
                        <Badge className="bg-red-500 hover:bg-red-600">{viewingProduct.badge}</Badge>
                      )}
                      <Badge variant="outline" className="capitalize">
                        {viewingProduct.category?.name || viewingProduct.category || "uncategorized"}
                      </Badge>
                    </div>
                    <h2 className="text-2xl font-bold">{viewingProduct.name || "Unnamed Product"}</h2>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold">${viewingProduct.price || 0}</span>
                      {(viewingProduct.original_price || viewingProduct.originalPrice) && (
                        <>
                          <span className="text-xl text-slate-500 line-through">
                            ${viewingProduct.original_price || viewingProduct.originalPrice}
                          </span>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Save ${((viewingProduct.original_price || viewingProduct.originalPrice) - viewingProduct.price) || 0}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">Description</h3>
                    <p className="text-slate-600">{viewingProduct.description || "No description available"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="font-medium">Rating</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(viewingProduct.rating || 0)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-slate-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-slate-600">
                          {viewingProduct.rating || 0} ({viewingProduct.reviews || 0} reviews)
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium">Product ID</h3>
                      <p className="text-slate-600">#{viewingProduct.id}</p>
                    </div>
                  </div>

                  {/* Additional Product Details */}
                  {viewingProduct.colors && viewingProduct.colors.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-medium">Available Colors</h3>
                      <div className="flex gap-2">
                        {viewingProduct.colors.map((color: string, index: number) => (
                          <div
                            key={index}
                            className="w-8 h-8 rounded-full border-2 border-slate-200"
                            style={{ backgroundColor: color?.toLowerCase() || "#000000" }}
                            title={color || "Color"}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingProduct.storage && viewingProduct.storage.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-medium">Storage Options</h3>
                      <div className="flex gap-2">
                        {viewingProduct.storage.map((size: string, index: number) => (
                          <Badge key={index} variant="outline">
                            {size || "Unknown"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingProduct.features && viewingProduct.features.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-medium">Key Features</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                        {viewingProduct.features.map((feature: string, index: number) => (
                          <li key={index}>{feature || "Feature"}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Stats */}
              <div className="grid grid-cols-4 gap-4 pt-6 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">156</p>
                  <p className="text-sm text-slate-600">Total Sales</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">$155,844</p>
                  <p className="text-sm text-slate-600">Revenue</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">2,340</p>
                  <p className="text-sm text-slate-600">Page Views</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">6.7%</p>
                  <p className="text-sm text-slate-600">Conversion</p>
                </div>
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
                setNewProduct({
                  name: viewingProduct.name || "",
                  category: viewingProduct.category?.id || viewingProduct.category_id || "",
                  price: viewingProduct.price?.toString() || "",
                  originalPrice: (viewingProduct.original_price || viewingProduct.originalPrice)?.toString() || "",
                  description: viewingProduct.description || "",
                  fullDescription: viewingProduct.full_description || viewingProduct.fullDescription || "",
                  badge: viewingProduct.badge || "",
                  image: viewingProduct.image || "",
                  features: viewingProduct.features || [],
                  colors: viewingProduct.colors || [],
                  storage: viewingProduct.storage || [],
                })
                setIsEditDialogOpen(true)
              }}
            >
              Edit Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newProduct.category}
                  onValueChange={(value) => setNewProduct((prev) => ({ ...prev, category: value }))}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originalPrice">Original Price (Optional)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  value={newProduct.originalPrice}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, originalPrice: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Short Description</Label>
              <Textarea
                id="description"
                value={newProduct.description}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullDescription">Full Description</Label>
              <Textarea
                id="fullDescription"
                value={newProduct.fullDescription}
                onChange={(e) => setNewProduct((prev) => ({ ...prev, fullDescription: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="badge">Badge (Optional)</Label>
                <Input
                  id="badge"
                  value={newProduct.badge}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, badge: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <ImageUpload
                  value={newProduct.image}
                  onChange={(value) => setNewProduct((prev) => ({ ...prev, image: value }))}
                  label="Product Image"
                />
              </div>
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
                        setNewProduct((prev) => ({ ...prev, features: newFeatures }))
                      }}
                      placeholder="Enter feature"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newFeatures = newProduct.features.filter((_, i) => i !== index)
                        setNewProduct((prev) => ({ ...prev, features: newFeatures }))
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
                    setNewProduct((prev) => ({ ...prev, features: [...prev.features, ""] }))
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Feature
                </Button>
              </div>
            </div>

            {/* Colors Section */}
            <div className="space-y-2">
              <Label>Colors</Label>
              <div className="space-y-2">
                {newProduct.colors.map((color, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => {
                        const newColors = [...newProduct.colors]
                        newColors[index] = e.target.value
                        setNewProduct((prev) => ({ ...prev, colors: newColors }))
                      }}
                      className="w-12 h-10 rounded border"
                    />
                    <Input
                      value={color}
                      onChange={(e) => {
                        const newColors = [...newProduct.colors]
                        newColors[index] = e.target.value
                        setNewProduct((prev) => ({ ...prev, colors: newColors }))
                      }}
                      placeholder="#000000"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newColors = newProduct.colors.filter((_, i) => i !== index)
                        setNewProduct((prev) => ({ ...prev, colors: newColors }))
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
                    setNewProduct((prev) => ({ ...prev, colors: [...prev.colors, "#000000"] }))
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Color
                </Button>
              </div>
            </div>

            {/* Storage Section */}
            <div className="space-y-2">
              <Label>Storage Options</Label>
              <div className="space-y-2">
                {newProduct.storage.map((storage, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={storage}
                      onChange={(e) => {
                        const newStorage = [...newProduct.storage]
                        newStorage[index] = e.target.value
                        setNewProduct((prev) => ({ ...prev, storage: newStorage }))
                      }}
                      placeholder="e.g., 128GB, 256GB"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newStorage = newProduct.storage.filter((_, i) => i !== index)
                        setNewProduct((prev) => ({ ...prev, storage: newStorage }))
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
                    setNewProduct((prev) => ({ ...prev, storage: [...prev.storage, ""] }))
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Storage Option
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setEditingProduct(null)
                setNewProduct({
                  name: "",
                  category: "",
                  price: "",
                  originalPrice: "",
                  description: "",
                  fullDescription: "",
                  badge: "",
                  image: "",
                  features: [],
                  colors: [],
                  storage: [],
                })
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditProduct}>Update Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  )
}
