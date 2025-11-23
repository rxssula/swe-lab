import { getApiUrl, defaultHeaders } from './config'

export interface ChatAttachment {
  id?: string
  file_url: string
  file_type: string
  file_name: string
}

export interface ChatMessage {
  id: string
  thread_id: string
  sender_id: string
  sender_type: 'CONSUMER' | 'SUPPLIER'
  message_text: string
  message_type: string
  product_id: string | null
  sent_at: string
  read_at: string | null
  attachments: ChatAttachment[]
}

export interface ChatThread {
  id: string
  link_id: string
  consumer_id: string
  supplier_id: string
  created_at: string
  last_message_at: string | null
  unread_count: number
}

export interface SendMessageRequest {
  message_text: string
  message_type?: string
  product_id?: string | null
  attachment_urls?: string[] | null
}

export interface MarkAsReadRequest {
  message_ids: string[]
}

export interface UserPresence {
  user_id: string
  is_online: boolean
  last_seen: string
  connected_at: string | null
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

// Get all chat threads for the current user
export async function getChatThreads(): Promise<ChatThread[]> {
  const response = await fetch(getApiUrl('chat/threads'), {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch chat threads',
    }))
    throw new Error(
      error.detail || `Failed to fetch threads: ${response.statusText}`,
    )
  }

  return response.json()
}

// Get messages for a specific thread
export async function getMessages(
  linkId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<ChatMessage[]> {
  const params = new URLSearchParams()
  params.append('limit', limit.toString())
  params.append('offset', offset.toString())

  const response = await fetch(
    getApiUrl(`chat/links/${linkId}/messages?${params.toString()}`),
    {
      method: 'GET',
      headers: getAuthHeaders(),
    },
  )

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch messages',
    }))
    throw new Error(
      error.detail || `Failed to fetch messages: ${response.statusText}`,
    )
  }

  return response.json()
}

// Send a message
export async function sendMessage(
  linkId: string,
  data: SendMessageRequest,
): Promise<ChatMessage> {
  const response = await fetch(getApiUrl(`chat/links/${linkId}/messages`), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to send message',
    }))
    throw new Error(
      error.detail || `Failed to send message: ${response.statusText}`,
    )
  }

  return response.json()
}

// Mark messages as read
export async function markMessagesAsRead(
  data: MarkAsReadRequest,
): Promise<{ message: string; marked_count: number }> {
  const response = await fetch(getApiUrl('chat/messages/mark-read'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to mark messages as read',
    }))
    throw new Error(
      error.detail ||
        `Failed to mark messages as read: ${response.statusText}`,
    )
  }

  return response.json()
}

// Get user presence for a link
export async function getUserPresence(
  linkId: string,
): Promise<UserPresence[]> {
  const response = await fetch(getApiUrl(`chat/links/${linkId}/presence`), {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to fetch user presence',
    }))
    throw new Error(
      error.detail || `Failed to fetch presence: ${response.statusText}`,
    )
  }

  return response.json()
}

// Upload a file attachment
export async function uploadChatFile(
  linkId: string,
  file: File,
): Promise<{
  file_url: string
  file_name: string
  file_type: string
  file_size: number
  message: string
}> {
  const formData = new FormData()
  formData.append('file', file)

  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  const response = await fetch(getApiUrl(`chat/links/${linkId}/upload-file`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type, let browser set it with boundary
    },
    body: formData,
  })

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to upload file',
    }))
    throw new Error(
      error.detail || `Failed to upload file: ${response.statusText}`,
    )
  }

  return response.json()
}

// Send message with files
export async function sendMessageWithFiles(
  linkId: string,
  messageText: string,
  files: File[],
  messageType: string = 'TEXT',
  productId?: string,
): Promise<ChatMessage> {
  const formData = new FormData()
  formData.append('message_text', messageText)
  formData.append('message_type', messageType)
  if (productId) {
    formData.append('product_id', productId)
  }

  files.forEach((file) => {
    formData.append('files', file)
  })

  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  const response = await fetch(
    getApiUrl(`chat/links/${linkId}/send-with-files`),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type, let browser set it with boundary
      },
      body: formData,
    },
  )

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Failed to send message with files',
    }))
    throw new Error(
      error.detail ||
        `Failed to send message with files: ${response.statusText}`,
    )
  }

  return response.json()
}

// Get WebSocket URL
export function getWebSocketUrl(linkId: string): string {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No access token found')
  }

  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
  const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws'
  const wsBaseUrl = baseUrl.replace(/^https?/, wsProtocol)

  return `${wsBaseUrl}/chat/ws/${linkId}?token=${encodeURIComponent(token)}`
}

