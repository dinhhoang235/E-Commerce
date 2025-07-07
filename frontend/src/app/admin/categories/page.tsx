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
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Trash2, Eye, FolderOpen, Package } from "lucide-react"
import { ImageUpload } from "@/components/image-upload"
import { useToast } from "@/hooks/use-toast"
import { getAllCategories, createCategory, updateCategory, deleteCategory } from "@/lib/services/categories"

interface Category {
  id: number
  name: string
  slug: string
  description: string
  image: string
  parent?: number | null
  parent_id?: number | null
  is_active: boolean
  product_count: number
  sort_order: number
  created_at: string
  updated_at: string
}

interface NewCategoryForm {
  name: string
  slug: string
  description: string
  image: string | File | null
  parentId: string
  isActive: boolean
  sortOrder: string
}

export default function AdminCategoriesPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const [newCategory, setNewCategory] = useState<NewCategoryForm>({
    name: "",
    slug: "",
    description: "",
    image: "",
    parentId: "",
    isActive: true,
    sortOrder: "",
  })

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        const data = await getAllCategories()
        console.log('Categories data:', data) // Debug log
        
        // Handle paginated response format
        if (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)) {
          setCategories(data.results)
        } else if (Array.isArray(data)) {
          // Handle direct array response
          setCategories(data)
        } else {
          console.error('Categories data is not in expected format:', data)
          setCategories([])
          toast({
            title: "Error",
            description: "Invalid categories data format",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
        setCategories([]) // Reset to empty array on error
        toast({
          title: "Error",
          description: "Failed to fetch categories",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [toast])

  const filteredCategories = (categories || []).filter((category) => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? category.is_active : !category.is_active)
    return matchesSearch && matchesStatus
  })

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  const handleAddCategory = async () => {
    if (!newCategory.name) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      })
      return
    }

    try {
      const categoryData = {
        name: newCategory.name,
        slug: newCategory.slug || generateSlug(newCategory.name),
        description: newCategory.description,
        imageFile: newCategory.image instanceof File ? newCategory.image : undefined,
        image: typeof newCategory.image === 'string' ? newCategory.image : undefined,
        parent_id: newCategory.parentId ? Number.parseInt(newCategory.parentId) : undefined,
        is_active: newCategory.isActive,
        sort_order: newCategory.sortOrder ? Number.parseInt(newCategory.sortOrder) : undefined,
      }

      const createdCategory = await createCategory(categoryData)
      setCategories([...(categories || []), createdCategory])
      
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
    } catch (error) {
      console.error('Error creating category:', error)
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      })
    }
  }

  const handleEditCategory = async () => {
    if (!editingCategory || !newCategory.name) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      })
      return
    }

    try {
      const categoryData = {
        name: newCategory.name,
        slug: newCategory.slug || generateSlug(newCategory.name),
        description: newCategory.description,
        imageFile: newCategory.image instanceof File ? newCategory.image : undefined,
        image: typeof newCategory.image === 'string' ? newCategory.image : undefined,
        parent_id: newCategory.parentId ? Number.parseInt(newCategory.parentId) : undefined,
        is_active: newCategory.isActive,
        sort_order: newCategory.sortOrder ? Number.parseInt(newCategory.sortOrder) : undefined,
      }

      const updatedCategory = await updateCategory(editingCategory.id.toString(), categoryData)
      setCategories((categories || []).map((c) => (c.id === editingCategory.id ? updatedCategory : c)))
      
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
    } catch (error) {
      console.error('Error updating category:', error)
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCategory = async (id: number) => {
    const categoryToDelete = (categories || []).find((c) => c.id === id)
    const hasChildren = (categories || []).some((c) => c.parent_id === id)

    if (hasChildren) {
      toast({
        title: "Error",
        description: "Cannot delete category with subcategories. Please delete subcategories first.",
        variant: "destructive",
      })
      return
    }

    try {
      await deleteCategory(id.toString())
      setCategories((categories || []).filter((c) => c.id !== id))
      toast({
        title: "Success",
        description: `Category "${categoryToDelete?.name}" deleted successfully`,
      })
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      })
    }
  }

  const toggleCategoryStatus = async (id: number) => {
    const category = (categories || []).find((c) => c.id === id)
    if (!category) return

    try {
      const updatedCategory = await updateCategory(id.toString(), {
        ...category,
        is_active: !category.is_active,
      })
      setCategories(
        (categories || []).map((c) => (c.id === id ? updatedCategory : c))
      )
    } catch (error) {
      console.error('Error toggling category status:', error)
      toast({
        title: "Error",
        description: "Failed to update category status",
        variant: "destructive",
      })
    }
  }

  const getParentCategories = () => {
    return (categories || []).filter((c) => !c.parent_id)
  }

  const getCategoryHierarchy = (category: Category) => {
    if (!category.parent_id) return category.name

    const parent = (categories || []).find((c) => c.id === category.parent_id)
    return parent ? `${parent.name} > ${category.name}` : category.name
  }

  return (
    <div className="space-y-8">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading categories...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex justify-between items-center">{/* ...existing code... */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-slate-600">Organize your products with categories and subcategories</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (open) {
            // Reset form when opening add dialog
            setNewCategory({
              name: "",
              slug: "",
              description: "",
              image: "",
              parentId: "",
              isActive: true,
              sortOrder: "",
            })
          }
        }}>
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
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
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
                        slug: generateSlug(name),
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
                  value={newCategory.image || undefined}
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
            <div className="text-2xl font-bold">{(categories || []).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Categories</CardTitle>
            <FolderOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(categories || []).filter((c) => c.is_active).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parent Categories</CardTitle>
            <FolderOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(categories || []).filter((c) => !c.parent_id).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(categories || []).reduce((sum, c) => sum + (c.product_count || 0), 0)}</div>
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
                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
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
                        {category.parent_id && <span className="text-slate-400 mr-1">└</span>}
                        <span className="text-sm">{getCategoryHierarchy(category)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{category.product_count || 0} products</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Switch
                          checked={category.is_active}
                          onCheckedChange={() => toggleCategoryStatus(category.id)}
                        />
                      </div>
                    </TableCell>
                    <TableCell>{category.sort_order || 0}</TableCell>
                    <TableCell>{new Date(category.updated_at).toLocaleDateString()}</TableCell>
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
                              parentId: category.parent_id?.toString() || "",
                              isActive: category.is_active,
                              sortOrder: category.sort_order?.toString() || "",
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
                      <Badge variant={viewingCategory.is_active ? "default" : "secondary"}>
                        {viewingCategory.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-medium">Products</h3>
                      <p className="text-slate-600">{viewingCategory.product_count || 0} products</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium">Sort Order</h3>
                      <p className="text-slate-600">{viewingCategory.sort_order || 0}</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Category ID</h3>
                      <p className="text-slate-600">#{viewingCategory.id}</p>
                    </div>
                  </div>
                  {viewingCategory.parent_id && (
                    <div>
                      <h3 className="font-medium">Parent Category</h3>
                      <p className="text-slate-600">
                        {(categories || []).find((c) => c.id === viewingCategory.parent_id)?.name || "Unknown"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <h3 className="font-medium">Created</h3>
                  <p className="text-slate-600">{new Date(viewingCategory.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <h3 className="font-medium">Last Updated</h3>
                  <p className="text-slate-600">{new Date(viewingCategory.updated_at).toLocaleDateString()}</p>
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
                  parentId: viewingCategory!.parent_id?.toString() || "",
                  isActive: viewingCategory!.is_active,
                  sortOrder: viewingCategory!.sort_order?.toString() || "",
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
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open)
        if (!open) {
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
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
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
                      slug: generateSlug(name),
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
                value={newCategory.image || undefined}
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
        </>
      )}
    </div>
  )
}
