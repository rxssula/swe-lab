export const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

console.log('API_BASE_URL', API_BASE_URL)

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  const cleanBaseUrl = API_BASE_URL.endsWith('/')
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL
  return `${cleanBaseUrl}/${cleanPath}`
}

export const defaultHeaders = {
  'Content-Type': 'application/json',
}
