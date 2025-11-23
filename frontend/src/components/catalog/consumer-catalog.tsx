import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Store,
  X,
} from 'lucide-react'
import type {CatalogItem} from '@/lib/api/products';
import type {OrderItemCreate} from '@/lib/api/orders';
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  
  browseCatalog,
  getLinkedSuppliers
} from '@/lib/api/products'
import { getCategories } from '@/lib/api/categories'
import {  createOrder } from '@/lib/api/orders'
import { formatCurrency } from '@/lib/utils'

interface CartItem {
  product: CatalogItem
  quantity: number
}

interface Cart {
  [supplierId: string]: Array<CartItem>
}

export function ConsumerCatalog() {
  const [searchQuery, setSearchQuery] = useState('')
  const [supplierFilter, setSupplierFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [cart, setCart] = useState<Cart>({})
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null,
  )
  const [deliveryOption, setDeliveryOption] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')

  const queryClient = useQueryClient()

  // Fetch linked suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['linkedSuppliers'],
    queryFn: getLinkedSuppliers,
  })

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  })

  // Fetch products
  const {
    data: products = [],
    isLoading: productsLoading,
    error: productsError,
  } = useQuery({
    queryKey: ['catalog', supplierFilter, categoryFilter, searchQuery],
    queryFn: () =>
      browseCatalog({
        supplier_id: supplierFilter === 'all' ? undefined : supplierFilter,
        category_id: categoryFilter === 'all' ? undefined : categoryFilter,
        search: searchQuery || undefined,
        active_only: true,
      }),
  })

  // Group products by supplier
  const productsBySupplier = products.reduce(
    (acc, product) => {
      if (!(product.supplier_id in acc)) {
        acc[product.supplier_id] = []
      }
      acc[product.supplier_id].push(product)
      return acc
    },
    {} as Record<string, Array<CatalogItem>>,
  )

  // Calculate cart totals
  const getCartTotal = (supplierId: string) => {
    const items = supplierId in cart ? cart[supplierId] : []
    return items.reduce(
      (total, item) => total + item.product.price_per_unit * item.quantity,
      0,
    )
  }

  const getTotalItems = () => {
    return Object.values(cart).reduce(
      (total, items) =>
        total + items.reduce((sum, item) => sum + item.quantity, 0),
      0,
    )
  }

  // Cart operations
  const addToCart = (product: CatalogItem) => {
    setCart((prev) => {
      const supplierCart = product.supplier_id in prev ? prev[product.supplier_id] : []
      const existingItem = supplierCart.find(
        (item) => item.product.id === product.id,
      )

      if (existingItem) {
        const newQuantity = existingItem.quantity + 1
        if (newQuantity > product.stock_level) {
          alert(`Cannot add more. Only ${product.stock_level} units available.`)
          return prev
        }
        return {
          ...prev,
          [product.supplier_id]: supplierCart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: newQuantity }
              : item,
          ),
        }
      } else {
        if (product.minimum_order_quantity > 1) {
          return {
            ...prev,
            [product.supplier_id]: [
              ...supplierCart,
              {
                product,
                quantity: product.minimum_order_quantity,
              },
            ],
          }
        }
        return {
          ...prev,
          [product.supplier_id]: [...supplierCart, { product, quantity: 1 }],
        }
      }
    })
  }

  const updateCartQuantity = (
    supplierId: string,
    productId: string,
    delta: number,
  ) => {
    setCart((prev) => {
      const supplierCart = supplierId in prev ? prev[supplierId] : []
      const item = supplierCart.find((i) => i.product.id === productId)
      if (!item) return prev

      const newQuantity = item.quantity + delta
      if (newQuantity < item.product.minimum_order_quantity) {
        alert(
          `Minimum order quantity is ${item.product.minimum_order_quantity}`,
        )
        return prev
      }
      if (newQuantity > item.product.stock_level) {
        alert(`Only ${item.product.stock_level} units available.`)
        return prev
      }

      if (newQuantity === 0) {
        return {
          ...prev,
          [supplierId]: supplierCart.filter((i) => i.product.id !== productId),
        }
      }

      return {
        ...prev,
        [supplierId]: supplierCart.map((i) =>
          i.product.id === productId ? { ...i, quantity: newQuantity } : i,
        ),
      }
    })
  }

  const removeFromCart = (supplierId: string, productId: string) => {
    setCart((prev) => {
      const supplierCart = supplierId in prev ? prev[supplierId] : []
      return {
        ...prev,
        [supplierId]: supplierCart.filter((i) => i.product.id !== productId),
      }
    })
  }

  const clearCart = (supplierId: string) => {
    setCart((prev) => {
      const newCart = { ...prev }
      delete newCart[supplierId]
      return newCart
    })
  }

  // Order creation
  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      clearCart(selectedSupplierId!)
      setIsOrderDialogOpen(false)
      setIsCartOpen(false)
      setDeliveryOption('')
      setDeliveryNotes('')
      setSelectedSupplierId(null)
      alert('Order created successfully!')
    },
    onError: (error: Error) => {
      alert(`Failed to create order: ${error.message}`)
    },
  })

  const handleCheckout = (supplierId: string) => {
    const items = supplierId in cart ? cart[supplierId] : []
    if (items.length === 0) {
      alert('Cart is empty')
      return
    }

    setSelectedSupplierId(supplierId)
    setDeliveryOption('') // Reset delivery option when opening dialog
    setDeliveryNotes('') // Reset delivery notes when opening dialog
    setIsOrderDialogOpen(true)
  }

  const handleConfirmOrder = () => {
    if (!selectedSupplierId) return

    if (!deliveryOption.trim()) {
      alert('Please enter a delivery option')
      return
    }

    const items = selectedSupplierId in cart ? cart[selectedSupplierId] : []
    const orderItems: Array<OrderItemCreate> = items.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
    }))

    createOrderMutation.mutate({
      supplier_id: selectedSupplierId,
      items: orderItems,
      delivery_option: deliveryOption,
      delivery_notes: deliveryNotes || undefined,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Product Catalog</h2>
          <p className="text-muted-foreground">
            Browse products from your linked suppliers and place orders
          </p>
        </div>
        <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart
              {getTotalItems() > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                >
                  {getTotalItems()}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Shopping Cart</SheetTitle>
              <SheetDescription>
                Review your items before placing an order
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              {Object.keys(cart).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Your cart is empty
                  </p>
                </div>
              ) : (
                Object.entries(cart).map(([supplierId, items]) => {
                  const supplier = suppliers.find(
                    (s) => s.supplier_id === supplierId,
                  )
                  return (
                    <div key={supplierId} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4" />
                          <h3 className="font-semibold">
                            {supplier?.supplier_name || 'Unknown Supplier'}
                          </h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearCart(supplierId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Separator />
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div
                            key={item.product.id}
                            className="flex items-start justify-between gap-4"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {item.product.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item.product.price_per_unit)} /{' '}
                                {item.product.unit}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() =>
                                  updateCartQuantity(
                                    supplierId,
                                    item.product.id,
                                    -1,
                                  )
                                }
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center text-sm">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() =>
                                  updateCartQuantity(
                                    supplierId,
                                    item.product.id,
                                    1,
                                  )
                                }
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={() =>
                                  removeFromCart(supplierId, item.product.id)
                                }
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-semibold">Total:</span>
                        <span className="font-bold text-lg">
                          {formatCurrency(getCartTotal(supplierId))}
                        </span>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => handleCheckout(supplierId)}
                        disabled={createOrderMutation.isPending}
                      >
                        Checkout
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem
                  key={supplier.supplier_id}
                  value={supplier.supplier_id}
                >
                  {supplier.supplier_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>
      </div>

      {/* Products by Supplier */}
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
      ) : Object.keys(productsBySupplier).length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2">
          <Package className="h-12 w-12 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            {suppliers.length === 0
              ? 'No linked suppliers found. Please link with suppliers first.'
              : 'No products available from your linked suppliers.'}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(productsBySupplier).map(([supplierId, supplierProducts]) => {
            const supplier = suppliers.find((s) => s.supplier_id === supplierId)
            return (
              <div key={supplierId} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  <h3 className="text-xl font-semibold">
                    {supplier && supplier.supplier_name ? supplier.supplier_name : 'Unknown Supplier'}
                  </h3>
                  <Badge variant="secondary">
                    {supplierProducts.length} product{supplierProducts.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {supplierProducts.map((product) => {
                    const supplierCart = supplierId in cart ? cart[supplierId] : []
                    const cartItem = supplierCart.find(
                      (item) => item.product.id === product.id,
                    )
                    const inCart = !!cartItem
                    const primaryImage = product.images.length > 0
                      ? product.images.find((img) => img.is_primary) || product.images[0]
                      : undefined

                    return (
                      <Card key={product.id} className="flex flex-col">
                        <CardHeader>
                          {primaryImage && (
                            <div className="aspect-video w-full overflow-hidden rounded-md mb-4 bg-muted">
                              <img
                                src={primaryImage.image_url}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <CardTitle className="text-lg">
                            {product.name}
                          </CardTitle>
                          <CardDescription>
                            {product.description || 'No description'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Price
                            </span>
                            <span className="font-semibold">
                              {formatCurrency(product.price_per_unit)} /{' '}
                              {product.unit}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Stock
                            </span>
                            <Badge
                              variant={
                                product.stock_level > 0
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {product.stock_level} {product.unit}
                            </Badge>
                          </div>
                          {product.minimum_order_quantity > 1 && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                Min Order
                              </span>
                              <span className="text-sm font-medium">
                                {product.minimum_order_quantity} {product.unit}
                              </span>
                            </div>
                          )}
                          {product.category_name && (
                            <Badge variant="outline">
                              {product.category_name}
                            </Badge>
                          )}
                        </CardContent>
                        <CardFooter>
                          {inCart ? (
                            <div className="flex items-center gap-2 w-full">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() =>
                                  updateCartQuantity(supplierId, product.id, -1)
                                }
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-12 text-center font-medium">
                                {cartItem.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() =>
                                  updateCartQuantity(supplierId, product.id, 1)
                                }
                                disabled={
                                  cartItem.quantity >= product.stock_level
                                }
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              className="w-full"
                              onClick={() => addToCart(product)}
                              disabled={product.stock_level === 0}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add to Cart
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Order Confirmation Dialog */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Order</DialogTitle>
            <DialogDescription>
              Review your order details before submitting
            </DialogDescription>
          </DialogHeader>
          {selectedSupplierId && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="delivery-option">Delivery Option *</Label>
                <Input
                  id="delivery-option"
                  placeholder="e.g., Standard Delivery, Express"
                  value={deliveryOption}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="delivery-notes">
                  Delivery Notes (Optional)
                </Label>
                <Textarea
                  id="delivery-notes"
                  placeholder="Any special instructions..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold">Order Summary</h4>
                {selectedSupplierId && selectedSupplierId in cart
                  ? cart[selectedSupplierId].map((item) => (
                      <div
                        key={item.product.id}
                        className="flex justify-between text-sm"
                      >
                        <span>
                          {item.product.name} x {item.quantity}
                        </span>
                        <span>
                          {formatCurrency(
                            item.product.price_per_unit * item.quantity,
                          )}
                        </span>
                      </div>
                    ))
                  : null}
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>
                    {formatCurrency(getCartTotal(selectedSupplierId))}
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsOrderDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmOrder}
                  disabled={
                    createOrderMutation.isPending || !deliveryOption.trim()
                  }
                >
                  {createOrderMutation.isPending
                    ? 'Creating Order...'
                    : 'Confirm Order'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
