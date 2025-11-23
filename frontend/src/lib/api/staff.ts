import { defaultHeaders, getApiUrl } from './config'

export interface StaffMember {
  id: string
  user_id: string
  role: string
  email: string
  phone_number: string | null
  created_at: string
  last_login_at: string | null
}

export interface CreateStaffRequest {
  email: string
  password: string
  role: 'OWNER' | 'MANAGER' | 'SALES'
  name: string
  phone_number?: string
}

export interface CreateStaffResponse {
  user: {
    id: string
    email: string
    name: string
    phone_number: string | null
    created_at: string
    last_login_at: string | null
  }
  role: string
  supplier_id: string
}

export interface UpdateRoleRequest {
  role: 'OWNER' | 'MANAGER' | 'SALES'
}

export interface ApiError {
  detail: string
}

/**
 * Get current user's supplier ID from localStorage
 */
function getSupplierId(): string {
  const supplierId = localStorage.getItem('supplier_id')
  if (!supplierId) {
    throw new Error('Supplier ID not found')
  }
  return supplierId
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }
  return token
}

/**
 * List all staff members for the current supplier
 */
export async function listSupplierStaff(): Promise<Array<StaffMember>> {
  const response = await fetch(getApiUrl('staff/supplier/list'), {
    method: 'GET',
    headers: {
      ...defaultHeaders,
      Authorization: `Bearer ${getAuthToken()}`,
    },
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch staff members',
    }))
    throw new Error(
      error.detail || `Failed to fetch staff: ${response.statusText}`,
    )
  }

  return response.json()
}

/**
 * Create a new staff member for the supplier
 */
export async function createSupplierStaff(
  data: CreateStaffRequest,
): Promise<CreateStaffResponse> {
  const supplierId = getSupplierId()
  const response = await fetch(getApiUrl(`suppliers/${supplierId}/staff`), {
    method: 'POST',
    headers: {
      ...defaultHeaders,
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to create staff member',
    }))
    throw new Error(
      error.detail || `Failed to create staff: ${response.statusText}`,
    )
  }

  return response.json()
}

/**
 * Update a staff member's role
 */
export async function updateStaffRole(
  staffId: string,
  data: UpdateRoleRequest,
): Promise<StaffMember> {
  const response = await fetch(getApiUrl(`staff/supplier/${staffId}/role`), {
    method: 'PATCH',
    headers: {
      ...defaultHeaders,
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to update staff role',
    }))
    throw new Error(
      error.detail || `Failed to update role: ${response.statusText}`,
    )
  }

  return response.json()
}

/**
 * Remove a staff member
 */
export async function removeSupplierStaff(staffId: string): Promise<void> {
  const response = await fetch(getApiUrl(`staff/supplier/${staffId}`), {
    method: 'DELETE',
    headers: {
      ...defaultHeaders,
      Authorization: `Bearer ${getAuthToken()}`,
    },
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to remove staff member',
    }))
    throw new Error(
      error.detail || `Failed to remove staff: ${response.statusText}`,
    )
  }
}
