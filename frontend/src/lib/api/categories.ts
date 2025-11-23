import { defaultHeaders, getApiUrl } from './config'

export interface Category {
  id: string
  name: string
  description: string | null
  parent_category_id: string | null
}

export interface CategoryCreate {
  name: string
  description?: string | null
  parent_category_id?: string | null
}

export interface CategoryUpdate {
  name?: string
  description?: string | null
  parent_category_id?: string | null
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

export async function getCategories(parentId?: string): Promise<Array<Category>> {
  const params = new URLSearchParams()
  if (parentId) params.append('parent_id', parentId)

  const queryString = params.toString()
  const url = getApiUrl(`categories/${queryString ? `?${queryString}` : ''}`)

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch categories',
    }))
    throw new Error(error.detail || `Failed to fetch categories: ${response.statusText}`)
  }

  return response.json()
}

export async function getCategory(categoryId: string): Promise<Category> {
  const response = await fetch(getApiUrl(`categories/${categoryId}`), {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch category',
    }))
    throw new Error(error.detail || `Failed to fetch category: ${response.statusText}`)
  }

  return response.json()
}

export async function createCategory(data: CategoryCreate): Promise<Category> {
  const response = await fetch(getApiUrl('categories/'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to create category',
    }))
    throw new Error(error.detail || `Failed to create category: ${response.statusText}`)
  }

  return response.json()
}

export async function updateCategory(
  categoryId: string,
  data: CategoryUpdate
): Promise<Category> {
  const response = await fetch(getApiUrl(`categories/${categoryId}`), {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to update category',
    }))
    throw new Error(error.detail || `Failed to update category: ${response.statusText}`)
  }

  return response.json()
}

