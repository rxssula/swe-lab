import { getApiUrl, getAuthHeaders } from './config'

export type Link = {
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

type ApiError = { detail?: string }

async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (res.ok) {
    return (await res.json()) as T
  }

  let detail = fallbackMessage
  try {
    const error = (await res.json()) as ApiError
    if (error?.detail) {
      detail = error.detail
    }
  } catch {
    // ignore parse failures
  }
  throw new Error(detail)
}

export async function getMyLinks(token: string, statusFilter?: string): Promise<Link[]> {
  const params = new URLSearchParams()
  if (statusFilter) {
    params.append('status_filter', statusFilter)
  }
  const suffix = params.size > 0 ? `?${params}` : ''

  const response = await fetch(getApiUrl(`links/my-links${suffix}`), {
    method: 'GET',
    headers: getAuthHeaders(token),
  })

  return handleResponse(response, 'Failed to fetch links')
}

export async function getLinkRequests(token: string, statusFilter?: string): Promise<Link[]> {
  const params = new URLSearchParams()
  if (statusFilter) {
    params.append('status_filter', statusFilter)
  }
  const suffix = params.size > 0 ? `?${params}` : ''

  const response = await fetch(getApiUrl(`links/requests${suffix}`), {
    method: 'GET',
    headers: getAuthHeaders(token),
  })

  return handleResponse(response, 'Failed to fetch link requests')
}

