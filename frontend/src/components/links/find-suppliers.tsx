import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Clock,
  Link as LinkIcon,
  Package,
  Search,
  Store,
  XCircle,
} from 'lucide-react'
import type { Link } from '@/lib/api/links'
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
import { getCategories } from '@/lib/api/categories'
import { getSuppliersByCategory } from '@/lib/api/suppliers'
import { getMyLinks, requestLinkToSupplier } from '@/lib/api/links'

export function FindSuppliers() {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const queryClient = useQueryClient()

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
  })

  // Fetch suppliers by category
  const {
    data: suppliers = [],
    isLoading: suppliersLoading,
    error: suppliersError,
  } = useQuery({
    queryKey: ['suppliersByCategory', selectedCategory],
    queryFn: () => getSuppliersByCategory(selectedCategory),
    enabled: !!selectedCategory,
  })

  // Fetch consumer's links
  const { data: links = [] } = useQuery({
    queryKey: ['myLinks'],
    queryFn: () => getMyLinks(),
  })

  // Create a map of supplier_id -> link status
  const linkStatusMap = new Map<string, Link>()
  links.forEach((link) => {
    linkStatusMap.set(link.supplier_id, link)
  })

  // Request link mutation
  const requestLinkMutation = useMutation({
    mutationFn: requestLinkToSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLinks'] })
      queryClient.invalidateQueries({ queryKey: ['suppliersByCategory'] })
    },
  })

  const handleRequestLink = async (supplierId: string) => {
    try {
      await requestLinkMutation.mutateAsync({ supplier_id: supplierId })
    } catch (error: any) {
      alert(error.message || 'Failed to request link')
    }
  }

  // Filter suppliers by search query
  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      supplier.business_name.toLowerCase().includes(query) ||
      supplier.business_type?.toLowerCase().includes(query) ||
      supplier.city?.toLowerCase().includes(query) ||
      supplier.country?.toLowerCase().includes(query)
    )
  })

  const getLinkStatusBadge = (supplier: (typeof suppliers)[0]) => {
    const link = linkStatusMap.get(supplier.supplier_id)
    if (!link) {
      return null
    }

    switch (link.status) {
      case 'accepted':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Linked
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case 'declined':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Declined
          </Badge>
        )
      case 'blocked':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Blocked
          </Badge>
        )
      default:
        return null
    }
  }

  const canRequestLink = (supplier: (typeof suppliers)[0]) => {
    const link = linkStatusMap.get(supplier.supplier_id)
    if (!link) return true
    return link.status === 'declined' || link.status === 'removed'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Find Suppliers</h2>
        <p className="text-muted-foreground">
          Browse suppliers by category and request links to access their
          products
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search suppliers by name, type, city, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            disabled={!selectedCategory}
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Suppliers List */}
      {!selectedCategory ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-md border">
          <Store className="h-12 w-12 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            Please select a category to browse suppliers
          </div>
        </div>
      ) : suppliersLoading ? (
        <div className="flex h-64 items-center justify-center rounded-md border">
          <div className="text-sm text-muted-foreground">
            Loading suppliers...
          </div>
        </div>
      ) : suppliersError ? (
        <div className="flex h-64 items-center justify-center rounded-md border">
          <div className="text-sm text-destructive">
            Failed to load suppliers. Please try again.
          </div>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-md border">
          <Store className="h-12 w-12 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            {searchQuery
              ? 'No suppliers match your search'
              : 'No suppliers found in this category'}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSuppliers.map((supplier) => {
            const link = linkStatusMap.get(supplier.supplier_id)
            const isPending = link?.status === 'pending'
            const isLinked = link?.status === 'accepted'
            const canRequest = canRequestLink(supplier)

            return (
              <Card key={supplier.supplier_id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Store className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">
                        {supplier.business_name}
                      </CardTitle>
                    </div>
                    {getLinkStatusBadge(supplier)}
                  </div>
                  <CardDescription>
                    {supplier.business_type || 'No type specified'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(supplier.city || supplier.country) && (
                    <div className="text-sm text-muted-foreground">
                      {[supplier.city, supplier.country]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {supplier.product_count_in_category} in category
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {supplier.total_active_products} total products
                  </div>
                </CardContent>
                <CardFooter>
                  {isLinked ? (
                    <Button variant="outline" className="w-full" disabled>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Already Linked
                    </Button>
                  ) : isPending ? (
                    <Button variant="secondary" className="w-full" disabled>
                      <Clock className="mr-2 h-4 w-4" />
                      Request Pending
                    </Button>
                  ) : canRequest ? (
                    <Button
                      className="w-full"
                      onClick={() => handleRequestLink(supplier.supplier_id)}
                      disabled={requestLinkMutation.isPending}
                    >
                      <LinkIcon className="mr-2 h-4 w-4" />
                      {requestLinkMutation.isPending
                        ? 'Requesting...'
                        : 'Request Link'}
                    </Button>
                  ) : (
                    <Button variant="destructive" className="w-full" disabled>
                      <XCircle className="mr-2 h-4 w-4" />
                      Cannot Request
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {filteredSuppliers.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredSuppliers.length} of {suppliers.length} supplier
          {suppliers.length !== 1 ? 's' : ''} in this category
        </div>
      )}
    </div>
  )
}
