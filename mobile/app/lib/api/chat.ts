import { getApiUrl, getAuthHeaders, getWebSocketBase } from './config'

export type ChatAttachment = {
  id?: string
  file_url: string
  file_type: string
  file_name: string
}

export type ChatMessage = {
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

export type ChatThread = {
  id: string
  link_id: string
  consumer_id: string
  supplier_id: string
  created_at: string
  last_message_at: string | null
  unread_count: number
}

export type UserPresence = {
  user_id: string
  is_online: boolean
  last_seen: string
  connected_at: string | null
}

type SendMessageRequest = {
  message_text: string
  message_type?: string
  product_id?: string | null
  attachment_urls?: string[] | null
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
    // ignore parsing errors
  }
  throw new Error(detail)
}

export async function getChatThreads(token: string): Promise<ChatThread[]> {
  const response = await fetch(getApiUrl('chat/threads'), {
    method: 'GET',
    headers: getAuthHeaders(token),
  })

  return handleResponse(response, 'Failed to fetch chat threads')
}

export async function getMessages(
  token: string,
  linkId: string,
  limit = 50,
  offset = 0,
): Promise<ChatMessage[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  const response = await fetch(getApiUrl(`chat/links/${linkId}/messages?${params}`), {
    method: 'GET',
    headers: getAuthHeaders(token),
  })

  return handleResponse(response, 'Failed to fetch messages')
}

export async function sendMessage(
  token: string,
  linkId: string,
  body: SendMessageRequest,
): Promise<ChatMessage> {
  const response = await fetch(getApiUrl(`chat/links/${linkId}/messages`), {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(body),
  })

  return handleResponse(response, 'Failed to send message')
}

type UploadableFile =
  | Blob
  | {
      uri: string
      name: string
      type?: string
    }

export async function sendMessageWithFiles(
  token: string,
  linkId: string,
  messageText: string,
  files: UploadableFile[],
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
    if ('uri' in file) {
      const name = file.name || `attachment-${Date.now()}`
      formData.append('files', {
        uri: file.uri,
        name,
        type: file.type || 'application/octet-stream',
      } as any)
    } else {
      formData.append('files', file as any)
    }
  })

  const response = await fetch(getApiUrl(`chat/links/${linkId}/send-with-files`), {
    method: 'POST',
    headers: getAuthHeaders(token, { includeJsonContentType: false }),
    body: formData,
  })

  return handleResponse(response, 'Failed to send message with files')
}

export async function markMessagesAsRead(token: string, messageIds: string[]) {
  if (messageIds.length === 0) return

  const response = await fetch(getApiUrl('chat/messages/mark-read'), {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ message_ids: messageIds }),
  })

  return handleResponse<{ message: string; marked_count: number }>(
    response,
    'Failed to mark messages as read',
  )
}

export async function getUserPresence(token: string, linkId: string): Promise<UserPresence[]> {
  const response = await fetch(getApiUrl(`chat/links/${linkId}/presence`), {
    method: 'GET',
    headers: getAuthHeaders(token),
  })

  return handleResponse(response, 'Failed to fetch user presence')
}

export function getWebSocketUrl(linkId: string, token: string) {
  const base = getWebSocketBase()
  return `${base}/chat/ws/${linkId}?token=${encodeURIComponent(token)}`
}

