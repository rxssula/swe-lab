import { getApiUrl, defaultHeaders } from './config'

export interface ConsumerSignupRequest {
  business_name: string
  business_type?: string
  address?: string
  city?: string
  country?: string
  email: string
  password: string
  phone_number?: string
}

export interface SupplierSignupRequest {
  company_name: string
  business_type?: string
  address?: string
  city?: string
  country?: string
  email: string
  password: string
  phone_number?: string
  subscription_tier?: string
}

export interface User {
  id: string
  email: string
  phone_number?: string
  created_at: string
  last_login_at?: string
}

export interface SignupResponse {
  access_token: string
  token_type: string
  user: User
  user_type: string
  role: string
}

export interface ApiError {
  detail: string
}

export async function signupConsumer(
  data: ConsumerSignupRequest,
): Promise<SignupResponse> {
  const response = await fetch(getApiUrl('auth/signup/consumer'), {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'An error occurred during signup',
    }))
    throw new Error(error.detail || `Signup failed: ${response.statusText}`)
  }

  return response.json()
}

export async function signupSupplier(
  data: SupplierSignupRequest,
): Promise<SignupResponse> {
  const response = await fetch(getApiUrl('auth/signup/supplier'), {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'An error occurred during signup',
    }))
    throw new Error(error.detail || `Signup failed: ${response.statusText}`)
  }

  return response.json()
}
