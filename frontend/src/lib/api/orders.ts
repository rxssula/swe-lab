import { getApiUrl } from './config'

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'completed'
  | 'cancelled'

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: string
  subtotal: string
}

export interface Order {
  id: string
  consumer_id: string
  supplier_id: string
  status: OrderStatus
  total_amount: string
  delivery_notes?: string
  delivery_option: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  accepted_at?: string
  completed_at?: string
  cancelled_at?: string
  items: Array<OrderItem>
}

interface ApiError {
  detail: string
}

const defaultHeaders = {
  'Content-Type': 'application/json',
}

function getAuthHeaders() {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  return {
    ...defaultHeaders,
    Authorization: `Bearer ${token}`,
  }
}

// Supplier endpoints
export async function getIncomingOrders(
  status?: OrderStatus,
  consumerId?: string,
): Promise<Array<Order>> {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (consumerId) params.append('consumer_id', consumerId)

  const queryString = params.toString()
  const url = getApiUrl(
    `orders/supplier/incoming${queryString ? `?${queryString}` : ''}`,
  )

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch incoming orders',
    }))
    throw new Error(
      error.detail || `Failed to fetch orders: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function acceptOrder(orderId: string): Promise<Order> {
  const response = await fetch(getApiUrl(`orders/${orderId}/accept`), {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to accept order',
    }))
    throw new Error(
      error.detail || `Failed to accept order: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function rejectOrder(
  orderId: string,
  rejectionReason: string,
): Promise<Order> {
  const params = new URLSearchParams()
  params.append('rejection_reason', rejectionReason)

  const response = await fetch(
    getApiUrl(`orders/${orderId}/reject?${params.toString()}`),
    {
      method: 'POST',
      headers: getAuthHeaders(),
    },
  )

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to reject order',
    }))
    throw new Error(
      error.detail || `Failed to reject order: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function completeOrder(orderId: string): Promise<Order> {
  const response = await fetch(getApiUrl(`orders/${orderId}/complete`), {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to complete order',
    }))
    throw new Error(
      error.detail || `Failed to complete order: ${response.statusText}`,
    )
  }

  return response.json()
}

// Consumer endpoints
export async function getConsumerOrderHistory(
  status?: OrderStatus,
  supplierId?: string,
): Promise<Array<Order>> {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (supplierId) params.append('supplier_id', supplierId)

  const queryString = params.toString()
  const url = getApiUrl(
    `orders/consumer/history${queryString ? `?${queryString}` : ''}`,
  )

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch order history',
    }))
    throw new Error(
      error.detail || `Failed to fetch orders: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function cancelOrder(orderId: string): Promise<Order> {
  const response = await fetch(getApiUrl(`orders/${orderId}/cancel`), {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to cancel order',
    }))
    throw new Error(
      error.detail || `Failed to cancel order: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function reorder(
  orderId: string,
  deliveryNotes?: string,
  deliveryOption?: string,
): Promise<Order> {
  const params = new URLSearchParams()
  if (deliveryNotes) params.append('delivery_notes', deliveryNotes)
  if (deliveryOption) params.append('delivery_option', deliveryOption)

  const queryString = params.toString()
  const response = await fetch(
    getApiUrl(`orders/${orderId}/reorder${queryString ? `?${queryString}` : ''}`),
    {
      method: 'POST',
      headers: getAuthHeaders(),
    },
  )

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to reorder',
    }))
    throw new Error(
      error.detail || `Failed to reorder: ${response.statusText}`,
    )
  }

  return response.json()
}

// Common endpoint
export async function getOrderDetails(orderId: string): Promise<Order> {
  const response = await fetch(getApiUrl(`orders/${orderId}`), {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch order details',
    }))
    throw new Error(
      error.detail || `Failed to fetch order: ${response.statusText}`,
    )
  }

  return response.json()
}

export interface OrderItemCreate {
  product_id: string
  quantity: number
}

export interface OrderCreate {
  supplier_id: string
  items: Array<OrderItemCreate>
  delivery_notes?: string
  delivery_option: string
}

export async function createOrder(data: OrderCreate): Promise<Order> {
  const response = await fetch(getApiUrl('orders/'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to create order',
    }))
    throw new Error(
      error.detail || `Failed to create order: ${response.statusText}`,
    )
  }

  return response.json()
}

