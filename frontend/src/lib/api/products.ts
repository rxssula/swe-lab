import { getApiUrl, defaultHeaders } from './config'

export interface Product {
  id: string
  supplier_id: string
  category_id: string
  name: string
  description: string | null
  unit: string
  price_per_unit: number
  stock_level: number
  minimum_order_quantity: number
  is_active: boolean
  supplier_name?: string | null
  category_name?: string | null
  images?: ProductImage[]
}

export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  is_primary: boolean
}

export interface ProductCreate {
  name: string
  description?: string | null
  category_id: string
  unit: string
  price_per_unit: number
  stock_level: number
  minimum_order_quantity: number
  is_active?: boolean
}

export interface ProductUpdate {
  name?: string
  description?: string | null
  category_id?: string
  unit?: string
  price_per_unit?: number
  stock_level?: number
  minimum_order_quantity?: number
  is_active?: boolean
}

export interface ApiError {
  detail: string
}

function getAuthHeaders() {
  const token = localStorage.getItem('access_token')
  return {
    ...defaultHeaders,
    Authorization: `Bearer ${token}`,
  }
}

export async function getMyProducts(
  activeOnly?: boolean,
  categoryId?: string,
): Promise<Product[]> {
  const params = new URLSearchParams()
  if (activeOnly) params.append('active_only', 'true')
  if (categoryId) params.append('category_id', categoryId)

  const queryString = params.toString()
  const url = getApiUrl(
    `products/my-products${queryString ? `?${queryString}` : ''}`,
  )

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch products',
    }))
    throw new Error(
      error.detail || `Failed to fetch products: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function getProduct(productId: string): Promise<Product> {
  const response = await fetch(getApiUrl(`products/${productId}`), {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch product',
    }))
    throw new Error(
      error.detail || `Failed to fetch product: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function createProduct(data: ProductCreate): Promise<Product> {
  const response = await fetch(getApiUrl('products/'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to create product',
    }))
    throw new Error(
      error.detail || `Failed to create product: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function updateProduct(
  productId: string,
  data: ProductUpdate,
): Promise<Product> {
  const response = await fetch(getApiUrl(`products/${productId}`), {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to update product',
    }))
    throw new Error(
      error.detail || `Failed to update product: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function deleteProduct(productId: string): Promise<void> {
  const response = await fetch(getApiUrl(`products/${productId}`), {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to delete product',
    }))
    throw new Error(
      error.detail || `Failed to delete product: ${response.statusText}`,
    )
  }
}

export interface CatalogItem {
  id: string
  name: string
  description: string | null
  unit: string
  price_per_unit: number
  stock_level: number
  minimum_order_quantity: number
  is_active: boolean
  supplier_id: string
  supplier_name: string
  category_name: string | null
  images: ProductImage[]
}

export interface LinkedSupplier {
  supplier_id: string
  supplier_name: string
  business_type: string | null
  city: string | null
  country: string | null
  product_count: number
  linked_at: string
}

export async function browseCatalog(params?: {
  supplier_id?: string
  category_id?: string
  search?: string
  min_price?: number
  max_price?: number
  active_only?: boolean
}): Promise<CatalogItem[]> {
  const queryParams = new URLSearchParams()
  if (params?.supplier_id) queryParams.append('supplier_id', params.supplier_id)
  if (params?.category_id) queryParams.append('category_id', params.category_id)
  if (params?.search) queryParams.append('search', params.search)
  if (params?.min_price !== undefined)
    queryParams.append('min_price', params.min_price.toString())
  if (params?.max_price !== undefined)
    queryParams.append('max_price', params.max_price.toString())
  if (params?.active_only !== undefined)
    queryParams.append('active_only', params.active_only.toString())

  const queryString = queryParams.toString()
  const url = getApiUrl(
    `products/catalog/browse${queryString ? `?${queryString}` : ''}`,
  )

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to browse catalog',
    }))
    throw new Error(
      error.detail || `Failed to browse catalog: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function getLinkedSuppliers(): Promise<LinkedSupplier[]> {
  const response = await fetch(getApiUrl('products/catalog/suppliers'), {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch linked suppliers',
    }))
    throw new Error(
      error.detail ||
        `Failed to fetch linked suppliers: ${response.statusText}`,
    )
  }

  return response.json()
}
