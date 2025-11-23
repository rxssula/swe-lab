const DEFAULT_BASE_URL = 'https://swe-lab-1.onrender.com'

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '')

const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL
  return normalizeBaseUrl(envUrl && envUrl.length > 0 ? envUrl : DEFAULT_BASE_URL)
}

export const defaultHeaders: Record<string, string> = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

export const getApiUrl = (path: string) => {
  const cleanedPath = path.startsWith('/') ? path.slice(1) : path
  return `${getBaseUrl()}/${cleanedPath}`
}

export const getAuthHeaders = (
  token: string,
  { includeJsonContentType = true }: { includeJsonContentType?: boolean } = {},
) => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }

  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

export const getWebSocketBase = () => {
  const base = getBaseUrl()
  const protocol = base.startsWith('https') ? 'wss' : 'ws'
  return base.replace(/^https?/, protocol)
}

