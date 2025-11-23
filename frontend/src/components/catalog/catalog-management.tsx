import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Edit, Trash2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { getMyProducts } from '@/lib/api/products'
import { getCategories } from '@/lib/api/categories'
import { ProductForm } from './product-form'
import { CategoryForm } from './category-form'
import type { Product } from '@/lib/api/products'
import { formatCurrency } from '@/lib/utils'

export function CatalogManagement() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const queryClient = useQueryClient()

  // Fetch products
  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
  } = useQuery({
    queryKey: ['products', categoryFilter],
    queryFn: () =>
      getMyProducts(
        false, // Always fetch all products, we'll filter by status on frontend
        categoryFilter === 'all' ? undefined : categoryFilter,
      ),
  })

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  })

  // Filter products based on search query and status
  const filteredProducts = products.filter((product) => {
    // Filter by status
    if (statusFilter === 'active' && !product.is_active) {
      return false
    }
    if (statusFilter === 'inactive' && product.is_active) {
      return false
    }

    // Filter by search query
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handleAddProduct = () => {
    setEditingProduct(null)
    setIsProductDialogOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setIsProductDialogOpen(true)
  }

  const handleProductDialogClose = () => {
    setIsProductDialogOpen(false)
    setEditingProduct(null)
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  const handleCategoryDialogClose = () => {
    setIsCategoryDialogOpen(false)
    queryClient.invalidateQueries({ queryKey: ['categories'] })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Catalog Management
          </h2>
          <p className="text-muted-foreground">
            Manage your products, availability, and minimum order quantities
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog
            open={isCategoryDialogOpen}
            onOpenChange={setIsCategoryDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Package className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Category</DialogTitle>
                <DialogDescription>
                  Create a new product category to organize your catalog
                </DialogDescription>
              </DialogHeader>
              <CategoryForm
                categories={categories}
                onSuccess={handleCategoryDialogClose}
              />
            </DialogContent>
          </Dialog>
          <Dialog
            open={isProductDialogOpen}
            onOpenChange={setIsProductDialogOpen}
          >
            <Button onClick={handleAddProduct}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Edit Product' : 'Add Product'}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct
                    ? 'Update product details and availability'
                    : 'Add a new product to your catalog'}
                </DialogDescription>
              </DialogHeader>
              <ProductForm
                product={editingProduct}
                categories={categories}
                onSuccess={handleProductDialogClose}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products by name, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="inactive">Inactive Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-md border">
        {productsLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm text-muted-foreground">
              Loading products...
            </div>
          </div>
        ) : productsError ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm text-destructive">
              Failed to load products. Please try again.
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2">
            <Package className="h-12 w-12 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'No products match your filters'
                : 'No products yet. Add your first product to get started.'}
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Price/Unit</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead>Min Order Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    {product.category_name || 'Uncategorized'}
                  </TableCell>
                  <TableCell>{product.unit}</TableCell>
                  <TableCell>
                    {formatCurrency(product.price_per_unit)}
                  </TableCell>
                  <TableCell>{product.stock_level}</TableCell>
                  <TableCell>{product.minimum_order_quantity}</TableCell>
                  <TableCell>
                    <Badge
                      variant={product.is_active ? 'default' : 'secondary'}
                    >
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <ProductDeleteButton productId={product.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Summary */}
      {filteredProducts.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredProducts.length} of {products.length} products
        </div>
      )}
    </div>
  )
}

function ProductDeleteButton({ productId }: { productId: string }) {
  const queryClient = useQueryClient()
  const [isDeleting, setIsDeleting] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { deleteProduct } = await import('@/lib/api/products')
      return deleteProduct(productId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this product?')) {
      setIsDeleting(true)
      try {
        await deleteMutation.mutateAsync()
      } catch (error) {
        alert('Failed to delete product. Please try again.')
      } finally {
        setIsDeleting(false)
      }
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  )
}
