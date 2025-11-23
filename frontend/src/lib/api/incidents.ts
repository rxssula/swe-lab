import { getApiUrl, defaultHeaders } from './config'

export type IncidentStatus = 'open' | 'in_progress' | 'resolved'

export interface UserInfo {
  user_id: string
  name: string | null
  email: string
  role: string | null
}

export interface IncidentLog {
  id: string
  incident_id: string
  user_id: string
  user_name: string | null
  user_role: string | null
  action: string
  notes: string
  timestamp: string
}

export interface IncidentDetail {
  id: string
  link_id: string
  order_id: string | null
  reported_by: UserInfo
  assigned_to: UserInfo | null
  status: IncidentStatus
  description: string
  created_at: string
  resolved_at: string | null
  consumer_name: string | null
  supplier_name: string | null
  logs: IncidentLog[]
}

export interface IncidentSummary {
  id: string
  link_id: string
  order_id: string | null
  status: IncidentStatus
  description: string
  created_at: string
  resolved_at: string | null
  consumer_name: string | null
  supplier_name: string | null
  assigned_to_name: string | null
}

export interface IncidentCreateRequest {
  link_id: string
  order_id?: string | null
  description: string
}

export interface AddLogRequest {
  action: string
  notes: string
}

export interface EscalateRequest {
  reason: string
  escalate_to_role: 'MANAGER' | 'OWNER'
}

export interface ResolveRequest {
  resolution_notes: string
}

export interface AssignRequest {
  assign_to_user_id: string
}

interface ApiError {
  detail: string
}

function getAuthHeaders() {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  return {
    ...defaultHeaders,
    Authorization: `Bearer ${token}`,
  }
}

// Consumer endpoints
export async function createIncident(
  data: IncidentCreateRequest,
): Promise<IncidentDetail> {
  const response = await fetch(getApiUrl('incidents/'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to create incident',
    }))
    throw new Error(
      error.detail || `Failed to create incident: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function getMyComplaints(
  statusFilter?: IncidentStatus,
): Promise<IncidentSummary[]> {
  const params = new URLSearchParams()
  if (statusFilter) params.append('status_filter', statusFilter)

  const queryString = params.toString()
  const url = getApiUrl(
    `incidents/my-complaints${queryString ? `?${queryString}` : ''}`,
  )

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch complaints',
    }))
    throw new Error(
      error.detail || `Failed to fetch complaints: ${response.statusText}`,
    )
  }

  return response.json()
}

// Supplier endpoints
export async function getMyAssignedIncidents(
  statusFilter?: IncidentStatus,
): Promise<IncidentSummary[]> {
  const params = new URLSearchParams()
  if (statusFilter) params.append('status_filter', statusFilter)

  const queryString = params.toString()
  const url = getApiUrl(
    `incidents/my-assigned${queryString ? `?${queryString}` : ''}`,
  )

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch assigned incidents',
    }))
    throw new Error(
      error.detail ||
        `Failed to fetch assigned incidents: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function getSupplierIncidents(
  statusFilter?: IncidentStatus,
): Promise<IncidentSummary[]> {
  const params = new URLSearchParams()
  if (statusFilter) params.append('status_filter', statusFilter)

  const queryString = params.toString()
  const url = getApiUrl(
    `incidents/my-supplier${queryString ? `?${queryString}` : ''}`,
  )

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch supplier incidents',
    }))
    throw new Error(
      error.detail ||
        `Failed to fetch supplier incidents: ${response.statusText}`,
    )
  }

  return response.json()
}

// Common endpoints
export async function getIncidentDetail(
  incidentId: string,
): Promise<IncidentDetail> {
  const response = await fetch(getApiUrl(`incidents/${incidentId}`), {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch incident details',
    }))
    throw new Error(
      error.detail || `Failed to fetch incident: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function addIncidentLog(
  incidentId: string,
  data: AddLogRequest,
): Promise<IncidentLog> {
  const response = await fetch(getApiUrl(`incidents/${incidentId}/logs`), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to add log entry',
    }))
    throw new Error(
      error.detail || `Failed to add log: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function escalateIncident(
  incidentId: string,
  data: EscalateRequest,
): Promise<IncidentDetail> {
  const response = await fetch(getApiUrl(`incidents/${incidentId}/escalate`), {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to escalate incident',
    }))
    throw new Error(
      error.detail || `Failed to escalate: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function resolveIncident(
  incidentId: string,
  data: ResolveRequest,
): Promise<IncidentDetail> {
  const response = await fetch(getApiUrl(`incidents/${incidentId}/resolve`), {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to resolve incident',
    }))
    throw new Error(
      error.detail || `Failed to resolve: ${response.statusText}`,
    )
  }

  return response.json()
}

export async function assignIncident(
  incidentId: string,
  data: AssignRequest,
): Promise<IncidentDetail> {
  const response = await fetch(getApiUrl(`incidents/${incidentId}/assign`), {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to assign incident',
    }))
    throw new Error(
      error.detail || `Failed to assign: ${response.statusText}`,
    )
  }

  return response.json()
}

