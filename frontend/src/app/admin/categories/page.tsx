"use client"

import { useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Trash2, Eye, FolderOpen, Package } from "lucide-react"
import { ImageUpload } from "@/components/image-upload"
import { useToast } from "@/hooks/use-toast"

interface Category {
  id: number
  name: string
  slug: string
  description: string
  image: string
  parentId?: number
  isActive: boolean
  productCount: number
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export default function AdminCategoriesPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([
    {
      id: 1,
      name: "iPhone",
      slug: "iphone",
      description: "Apple iPhone smartphones with cutting-edge technology",
      image: "/placeholder.svg?height=200&width=200",
      isActive: true,
      productCount: 8,
      sortOrder: 1,
      createdAt: "2024-01-01",
      updatedAt: "2024-01-15",
    },
    {
      id: 2,
      name: "iPad",
      slug: "ipad",
      description: "Apple iPad tablets for work and creativity",
      image: "/placeholder.svg?height=200&width=200",
      isActive: true,
      productCount: 6,
      sortOrder: 2,
      createdAt: "2024-01-01",
      updatedAt: "2024-01-15",
    },
    {
      id: 3,
      name: "MacBook",
      slug: "macbook",
      description: "Apple MacBook laptops for professionals",
      image: "/placeholder.svg?height=200&width=200",
      isActive: true,
      productCount: 4,
      sortOrder: 3,
      createdAt: "2024-01-01",
      updatedAt: "2024-01-15",
    },
    {
      id: 4,
      name: "iPhone Pro",
      slug: "iphone-pro",
      description: "Professional iPhone models with advanced features",
      image: "/placeholder.svg?height=200&width=200",
      parentId: 1,
      isActive: true,
      productCount: 4,
      sortOrder: 1,
      createdAt: "2024-01-05",
      updatedAt: "2024-01-15",
    },
    {
      id: 5,
      name: "iPad Pro",
      slug: "ipad-pro",
      description: "Professional iPad models for creative work",
      image: "/placeholder.svg?height=200&width=200",
      parentId: 2,
      isActive: true,
      productCount: 2,
      sortOrder: 1,
      createdAt: "2024-01-05",
      updatedAt: "2024-01-15",
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
    parentId: "",
    isActive: true,
    sortOrder: "",
  })

  const filteredCategories = categories.filter((category) => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? category.isActive : !category.isActive)
    return matchesSearch && matchesStatus
  })

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  const handleAddCategory = () => {
    if (!newCategory.name) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      })
      return
    }

    const category: Category = {
      id: Date.now(),
      name: newCategory.name,
      slug: newCategory.slug || generateSlug(newCategory.name),
      description: newCategory.description,
      image: newCategory.image || "/placeholder.svg?height=200&width=200",
      parentId: newCategory.parentId ? Number.parseInt(newCategory.parentId) : undefined,
      isActive: newCategory.isActive,
      productCount: 0,
      sortOrder: newCategory.sortOrder ? Number.parseInt(newCategory.sortOrder) : categories.length + 1,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    }

    setCategories([...categories, category])
    setNewCategory({
      name: "",
      slug: "",
      description: "",
      image: "",
      parentId: "",
      isActive: true,
      sortOrder: "",
    })
    setIsAddDialogOpen(false)

    toast({
      title: "Success",
      description: "Category created successfully",
    })
  }

  const handleEditCategory = () => {
    if (!editingCategory || !newCategory.name) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      })
      return
    }

    const updatedCategory: Category = {
      ...editingCategory,
      name: newCategory.name,
      slug: newCategory.slug || generateSlug(newCategory.name),
      description: newCategory.description,
      image: newCategory.image,
      parentId: newCategory.parentId ? Number.parseInt(newCategory.parentId) : undefined,
      isActive: newCategory.isActive,
      sortOrder: newCategory.sortOrder ? Number.parseInt(newCategory.sortOrder) : editingCategory.sortOrder,
      updatedAt: new Date().toISOString().split("T")[0],
    }

    setCategories(categories.map((c) => (c.id === editingCategory.id ? updatedCategory : c)))
    setEditingCategory(null)
    setNewCategory({
      name: "",
      slug: "",
      description: "",
      image: "",
      parentId: "",
      isActive: true,
      sortOrder: "",
    })
    setIsEditDialogOpen(false)

    toast({
      title: "Success",
      description: "Category updated successfully",
    })
  }

  const handleDeleteCategory = (id: number) => {
    const categoryToDelete = categories.find((c) => c.id === id)
    const hasChildren = categories.some((c) => c.parentId === id)

    if (hasChildren) {
      toast({
        title: "Error",
        description: "Cannot delete category with subcategories. Please delete subcategories first.",
        variant: "destructive",
      })
      return
    }

    setCategories(categories.filter((c) => c.id !== id))
    toast({
      title: "Success",
      description: `Category "${categoryToDelete?.name}" deleted successfully`,
    })
  }

  const toggleCategoryStatus = (id: number) => {
    setCategories(
      categories.map((c) =>
        c.id === id ? { ...c, isActive: !c.isActive, updatedAt: new Date().toISOString().split("T")[0] } : c,
      ),
    )
  }

  const getParentCategories = () => {
    return categories.filter((c) => !c.parentId)
  }

  const getCategoryHierarchy = (category: Category) => {
    if (!category.parentId) return category.name

    const parent = categories.find((c) => c.id === category.parentId)
    return parent ? `${parent.name} > ${category.name}` : category.name
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-slate-600">Organize your products with categories and subcategories</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
              <DialogDescription>Create a new category to organize your products</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    value={newCategory.name}
                    onChange={(e) => {
                      const name = e.target.value
                      setNewCategory((prev) => ({
                        ...prev,
                        name,
                        slug: prev.slug || generateSlug(name),
                      }))
                    }}
                    placeholder="e.g., Smartphones"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={newCategory.slug}
                    onChange={(e) => setNewCategory((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="e.g., smartphones"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the category"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parentId">Parent Category (Optional)</Label>
                  <Select
                    value={newCategory.parentId}
                    onValueChange={(value) => setNewCategory((prev) => ({ ...prev, parentId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Top Level)</SelectItem>
                      {getParentCategories().map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={newCategory.sortOrder}
                    onChange={(e) => setNewCategory((prev) => ({ ...prev, sortOrder: e.target.value }))}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <ImageUpload
                  value={newCategory.image}
                  onChange={(value) => setNewCategory((prev) => ({ ...prev, image: value }))}
                  label="Category Image"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={newCategory.isActive}
                  onCheckedChange={(checked) => setNewCategory((prev) => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Active Category</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCategory}>Add Category</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <FolderOpen className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Categories</CardTitle>
            <FolderOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.filter((c) => c.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parent Categories</CardTitle>
            <FolderOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.filter((c) => !c.parentId).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.reduce((sum, c) => sum + c.productCount, 0)}</div>
          </CardContent>
        </Card>
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
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Categories ({filteredCategories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Hierarchy</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                          <img
                            src={category.image || "/placeholder.svg"}
                            alt={category.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-sm text-slate-600">/{category.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {category.parentId && <span className="text-slate-400 mr-1">└</span>}
                        <span className="text-sm">{getCategoryHierarchy(category)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{category.productCount} products</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant={category.isActive ? "default" : "secondary"}>
                          {category.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Switch
                          checked={category.isActive}
                          onCheckedChange={() => toggleCategoryStatus(category.id)}
                        //   size="sm"
                        />
                      </div>
                    </TableCell>
                    <TableCell>{category.sortOrder}</TableCell>
                    <TableCell>{new Date(category.updatedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setViewingCategory(category)
                            setIsViewDialogOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCategory(category)
                            setNewCategory({
                              name: category.name,
                              slug: category.slug,
                              description: category.description,
                              image: category.image,
                              parentId: category.parentId?.toString() || "",
                              isActive: category.isActive,
                              sortOrder: category.sortOrder.toString(),
                            })
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Category Detail View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Category Details</DialogTitle>
            <DialogDescription>Complete category information</DialogDescription>
          </DialogHeader>
          {viewingCategory && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden">
                    <img
                      src={viewingCategory.image || "/placeholder.svg"}
                      alt={viewingCategory.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold">{viewingCategory.name}</h2>
                    <p className="text-slate-600">/{viewingCategory.slug}</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-slate-600">{viewingCategory.description || "No description provided"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium">Status</h3>
                      <Badge variant={viewingCategory.isActive ? "default" : "secondary"}>
                        {viewingCategory.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-medium">Products</h3>
                      <p className="text-slate-600">{viewingCategory.productCount} products</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium">Sort Order</h3>
                      <p className="text-slate-600">{viewingCategory.sortOrder}</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Category ID</h3>
                      <p className="text-slate-600">#{viewingCategory.id}</p>
                    </div>
                  </div>
                  {viewingCategory.parentId && (
                    <div>
                      <h3 className="font-medium">Parent Category</h3>
                      <p className="text-slate-600">
                        {categories.find((c) => c.id === viewingCategory.parentId)?.name || "Unknown"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <h3 className="font-medium">Created</h3>
                  <p className="text-slate-600">{new Date(viewingCategory.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <h3 className="font-medium">Last Updated</h3>
                  <p className="text-slate-600">{new Date(viewingCategory.updatedAt).toLocaleDateString()}</p>
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
                setEditingCategory(viewingCategory)
                setNewCategory({
                  name: viewingCategory!.name,
                  slug: viewingCategory!.slug,
                  description: viewingCategory!.description,
                  image: viewingCategory!.image,
                  parentId: viewingCategory!.parentId?.toString() || "",
                  isActive: viewingCategory!.isActive,
                  sortOrder: viewingCategory!.sortOrder.toString(),
                })
                setIsEditDialogOpen(true)
              }}
            >
              Edit Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Category Name *</Label>
                <Input
                  id="edit-name"
                  value={newCategory.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setNewCategory((prev) => ({
                      ...prev,
                      name,
                      slug: prev.slug || generateSlug(name),
                    }))
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slug">URL Slug</Label>
                <Input
                  id="edit-slug"
                  value={newCategory.slug}
                  onChange={(e) => setNewCategory((prev) => ({ ...prev, slug: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={newCategory.description}
                onChange={(e) => setNewCategory((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-parentId">Parent Category</Label>
                <Select
                  value={newCategory.parentId}
                  onValueChange={(value) => setNewCategory((prev) => ({ ...prev, parentId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top Level)</SelectItem>
                    {getParentCategories()
                      .filter((c) => c.id !== editingCategory?.id)
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sortOrder">Sort Order</Label>
                <Input
                  id="edit-sortOrder"
                  type="number"
                  value={newCategory.sortOrder}
                  onChange={(e) => setNewCategory((prev) => ({ ...prev, sortOrder: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <ImageUpload
                value={newCategory.image}
                onChange={(value) => setNewCategory((prev) => ({ ...prev, image: value }))}
                label="Category Image"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={newCategory.isActive}
                onCheckedChange={(checked) => setNewCategory((prev) => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="edit-isActive">Active Category</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setEditingCategory(null)
                setNewCategory({
                  name: "",
                  slug: "",
                  description: "",
                  image: "",
                  parentId: "",
                  isActive: true,
                  sortOrder: "",
                })
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditCategory}>Update Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
