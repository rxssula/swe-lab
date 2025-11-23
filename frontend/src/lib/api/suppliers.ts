import { getApiUrl, defaultHeaders } from './config'

export interface SupplierByCategory {
  supplier_id: string
  business_name: string
  business_type: string | null
  city: string | null
  country: string | null
  product_count_in_category: number
  total_active_products: number
  is_linked: boolean
  link_status: string | null
}

interface ApiError {
  detail: string
}

function getAuthHeaders() {
  const token = localStorage.getItem('access_token')
  return {
    ...defaultHeaders,
    Authorization: `Bearer ${token}`,
  }
}

export async function getSuppliersByCategory(
  categoryId: string,
  linkedOnly: boolean = false,
): Promise<SupplierByCategory[]> {
  const params = new URLSearchParams()
  if (linkedOnly) params.append('linked_only', 'true')

  const queryString = params.toString()
  const url = getApiUrl(
    `suppliers/by-category/${categoryId}${queryString ? `?${queryString}` : ''}`,
  )

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch suppliers',
    }))
    throw new Error(
      error.detail || `Failed to fetch suppliers: ${response.statusText}`,
    )
  }

  return response.json()
}

