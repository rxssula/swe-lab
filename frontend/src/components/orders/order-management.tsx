import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  CheckCircle2,
  XCircle,
  Package,
  Eye,
  X,
  RotateCcw,
} from 'lucide-react'
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
} from '@/components/ui/dialog'
import {
  getIncomingOrders,
  getConsumerOrderHistory,
  acceptOrder,
  rejectOrder,
  completeOrder,
  cancelOrder,
  getOrderDetails,
  type Order,
  type OrderStatus,
} from '@/lib/api/orders'
import { formatCurrency } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface OrderManagementProps {
  userType: 'supplier' | 'consumer'
}

export function OrderManagement({ userType }: OrderManagementProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [orderToReject, setOrderToReject] = useState<Order | null>(null)

  const queryClient = useQueryClient()

  // Fetch orders based on user type
  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersError,
  } = useQuery({
    queryKey: ['orders', userType, statusFilter],
    queryFn: () => {
      const status =
        statusFilter === 'all' ? undefined : (statusFilter as OrderStatus)
      return userType === 'supplier'
        ? getIncomingOrders(status)
        : getConsumerOrderHistory(status)
    },
  })

  // Filter orders based on search query
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.delivery_option
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      order.delivery_notes
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Mutations
  const acceptMutation = useMutation({
    mutationFn: acceptOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setIsDetailsOpen(false)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      rejectOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setIsRejectDialogOpen(false)
      setRejectionReason('')
      setOrderToReject(null)
      setIsDetailsOpen(false)
    },
  })

  const completeMutation = useMutation({
    mutationFn: completeOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setIsDetailsOpen(false)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setIsDetailsOpen(false)
    },
  })

  const handleViewDetails = async (order: Order) => {
    try {
      const fullOrder = await getOrderDetails(order.id)
      setSelectedOrder(fullOrder)
      setIsDetailsOpen(true)
    } catch (error) {
      console.error('Failed to fetch order details:', error)
      // Fallback to the order we already have
      setSelectedOrder(order)
      setIsDetailsOpen(true)
    }
  }

  const handleAccept = (orderId: string) => {
    if (confirm('Are you sure you want to accept this order?')) {
      acceptMutation.mutate(orderId)
    }
  }

  const handleReject = (order: Order) => {
    setOrderToReject(order)
    setIsRejectDialogOpen(true)
  }

  const handleConfirmReject = () => {
    if (!orderToReject || !rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }
    rejectMutation.mutate({
      orderId: orderToReject.id,
      reason: rejectionReason,
    })
  }

  const handleComplete = (orderId: string) => {
    if (confirm('Mark this order as completed/shipped?')) {
      completeMutation.mutate(orderId)
    }
  }

  const handleCancel = (orderId: string) => {
    if (confirm('Are you sure you want to cancel this order?')) {
      cancelMutation.mutate(orderId)
    }
  }

  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'secondary'
      case 'accepted':
        return 'default'
      case 'completed':
        return 'default'
      case 'rejected':
        return 'destructive'
      case 'cancelled':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Order Management
          </h2>
          <p className="text-muted-foreground">
            {userType === 'supplier'
              ? 'Manage incoming orders, accept/reject orders, and mark as shipped'
              : 'View order history, track status, and manage your orders'}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders by ID, delivery option, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-md border">
        {ordersLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm text-muted-foreground">
              Loading orders...
            </div>
          </div>
        ) : ordersError ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm text-destructive">
              Failed to load orders. Please try again.
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2">
            <Package className="h-12 w-12 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'No orders match your filters'
                : 'No orders yet.'}
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Delivery Option</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    {order.id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {order.status.charAt(0).toUpperCase() +
                        order.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                  <TableCell>{order.delivery_option}</TableCell>
                  <TableCell>{formatDate(order.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(order)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {userType === 'supplier' && (
                        <>
                          {order.status === 'pending' && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleAccept(order.id)}
                                disabled={acceptMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleReject(order)}
                                disabled={rejectMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {order.status === 'accepted' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleComplete(order.id)}
                              disabled={completeMutation.isPending}
                            >
                              <Package className="h-4 w-4 mr-1" />
                              Mark Shipped
                            </Button>
                          )}
                        </>
                      )}
                      {userType === 'consumer' &&
                        (order.status === 'pending' ||
                          order.status === 'accepted') && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancel(order.id)}
                            disabled={cancelMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Summary */}
      {filteredOrders.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              View complete order information and items
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Order ID</Label>
                  <p className="font-medium">{selectedOrder.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div>
                    <Badge variant={getStatusBadgeVariant(selectedOrder.status)}>
                      {selectedOrder.status.charAt(0).toUpperCase() +
                        selectedOrder.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Amount</Label>
                  <p className="font-medium text-lg">
                    {formatCurrency(selectedOrder.total_amount)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Delivery Option</Label>
                  <p className="font-medium">{selectedOrder.delivery_option}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created At</Label>
                  <p className="font-medium">
                    {formatDate(selectedOrder.created_at)}
                  </p>
                </div>
                {selectedOrder.accepted_at && (
                  <div>
                    <Label className="text-muted-foreground">Accepted At</Label>
                    <p className="font-medium">
                      {formatDate(selectedOrder.accepted_at)}
                    </p>
                  </div>
                )}
                {selectedOrder.completed_at && (
                  <div>
                    <Label className="text-muted-foreground">Completed At</Label>
                    <p className="font-medium">
                      {formatDate(selectedOrder.completed_at)}
                    </p>
                  </div>
                )}
                {selectedOrder.rejection_reason && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">
                      Rejection Reason
                    </Label>
                    <p className="font-medium text-destructive">
                      {selectedOrder.rejection_reason}
                    </p>
                  </div>
                )}
                {selectedOrder.delivery_notes && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Delivery Notes</Label>
                    <p className="font-medium">{selectedOrder.delivery_notes}</p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-muted-foreground mb-2 block">
                  Order Items
                </Label>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product ID</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product_id.slice(0, 8)}...</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            {formatCurrency(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.subtotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                {userType === 'supplier' && (
                  <>
                    {selectedOrder.status === 'pending' && (
                      <>
                        <Button
                          variant="default"
                          onClick={() => handleAccept(selectedOrder.id)}
                          disabled={acceptMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Accept Order
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleReject(selectedOrder)}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Order
                        </Button>
                      </>
                    )}
                    {selectedOrder.status === 'accepted' && (
                      <Button
                        variant="default"
                        onClick={() => handleComplete(selectedOrder.id)}
                        disabled={completeMutation.isPending}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Mark as Shipped
                      </Button>
                    )}
                  </>
                )}
                {userType === 'consumer' &&
                  (selectedOrder.status === 'pending' ||
                    selectedOrder.status === 'accepted') && (
                    <Button
                      variant="destructive"
                      onClick={() => handleCancel(selectedOrder.id)}
                      disabled={cancelMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel Order
                    </Button>
                  )}
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Order Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRejectDialogOpen(false)
                  setRejectionReason('')
                  setOrderToReject(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject Order'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

