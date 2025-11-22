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

export interface LoginRequest {
  email: string
  password: string
}

export interface ApiError {
  detail: string
}

export async function login(data: LoginRequest): Promise<SignupResponse> {
  // OAuth2PasswordRequestForm expects form-encoded data
  const formData = new URLSearchParams()
  formData.append('username', data.email)
  formData.append('password', data.password)
  formData.append('grant_type', 'password')

  const response = await fetch(getApiUrl('auth/token'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'An error occurred during login',
    }))
    throw new Error(error.detail || `Login failed: ${response.statusText}`)
  }

  return response.json()
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
