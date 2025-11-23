import { getApiUrl, defaultHeaders } from './config'

export interface Link {
  id: string
  consumer_id: string
  supplier_id: string
  status: 'pending' | 'accepted' | 'declined' | 'removed' | 'blocked'
  requested_at: string
  responded_at: string | null
  responded_by: string | null
  supplier_name: string | null
  consumer_name: string | null
}

export interface LinkRequestCreate {
  supplier_id: string
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

// Consumer endpoints
export async function requestLinkToSupplier(
  data: LinkRequestCreate,
): Promise<Link> {
  const response = await fetch(getApiUrl('links/request'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to request link',
    }))
    throw new Error(
      error.detail || `Failed to request link: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function getMyLinks(statusFilter?: string): Promise<Link[]> {
  const params = new URLSearchParams()
  if (statusFilter) params.append('status_filter', statusFilter)

  const queryString = params.toString()
  const url = getApiUrl(`links/my-links${queryString ? `?${queryString}` : ''}`)

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch links',
    }))
    throw new Error(
      error.detail || `Failed to fetch links: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function checkLinkStatus(supplierId: string): Promise<{
  linked: boolean
  status: string | null
  link_id?: string
  requested_at?: string
  responded_at?: string | null
  message?: string
}> {
  const response = await fetch(getApiUrl(`links/check/${supplierId}`), {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to check link status',
    }))
    throw new Error(
      error.detail || `Failed to check link status: ${response.statusText}`,
    )
  }

  return response.json()
}

// Supplier endpoints
export async function getLinkRequests(statusFilter?: string): Promise<Link[]> {
  const params = new URLSearchParams()
  if (statusFilter) params.append('status_filter', statusFilter)

  const queryString = params.toString()
  const url = getApiUrl(
    `links/requests${queryString ? `?${queryString}` : ''}`,
  )

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch link requests',
    }))
    throw new Error(
      error.detail || `Failed to fetch link requests: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function acceptLinkRequest(linkId: string): Promise<Link> {
  const response = await fetch(getApiUrl(`links/requests/${linkId}/accept`), {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to accept link request',
    }))
    throw new Error(
      error.detail || `Failed to accept link request: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function rejectLinkRequest(linkId: string): Promise<Link> {
  const response = await fetch(getApiUrl(`links/requests/${linkId}/reject`), {
    method: 'POST',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to reject link request',
    }))
    throw new Error(
      error.detail || `Failed to reject link request: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function removeOrBlockLink(
  linkId: string,
  block: boolean = false,
): Promise<{ message: string; link_id: string; status: string }> {
  const params = new URLSearchParams()
  if (block) params.append('block', 'true')

  const queryString = params.toString()
  const url = getApiUrl(
    `links/requests/${linkId}${queryString ? `?${queryString}` : ''}`,
  )

  const response = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to remove/block link',
    }))
    throw new Error(
      error.detail || `Failed to remove/block link: ${response.statusText}`,
    )
  }

  return response.json()
}

