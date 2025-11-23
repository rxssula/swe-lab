import { getApiUrl, getAuthHeaders } from './config'

export type CurrentUser = {
  id: string
  email: string
  phone_number?: string
  created_at: string
  last_login_at?: string
}

type ApiError = { detail?: string }

export async function getCurrentUser(token: string): Promise<CurrentUser> {
  const response = await fetch(getApiUrl('auth/me'), {
    method: 'GET',
    headers: getAuthHeaders(token),
  })

  if (response.ok) {
    return (await response.json()) as CurrentUser
  }

  let detail = 'Failed to fetch user profile'
  try {
    const error = (await response.json()) as ApiError
    if (error?.detail) detail = error.detail
  } catch {
  }
  throw new Error(detail)
}

