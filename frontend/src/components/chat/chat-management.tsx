import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  CheckCheck,
  Circle,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
} from 'lucide-react'
import type {ChatMessage, ChatThread, UserPresence} from '@/lib/api/chat';
import type {Link} from '@/lib/api/links';
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  
  
  
  getChatThreads,
  getMessages,
  getUserPresence,
  getWebSocketUrl,
  markMessagesAsRead,
  sendMessage,
  sendMessageWithFiles
} from '@/lib/api/chat'
import { getCurrentUser } from '@/lib/api/auth'
import {  getLinkRequests, getMyLinks } from '@/lib/api/links'

// Simple date formatting function
function formatDistanceToNow(date: Date | string): string {
  const now = new Date()
  const then = typeof date === 'string' ? new Date(date) : date
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }
}

interface ChatManagementProps {
  userType: 'supplier' | 'consumer'
}

export function ChatManagement({ userType }: ChatManagementProps) {
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null)
  const [messageText, setMessageText] = useState('')
  const [_, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [selectedFiles, setSelectedFiles] = useState<Array<File>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const queryClient = useQueryClient()

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  })

  // Fetch chat threads
  const { data: threads = [], refetch: refetchThreads } = useQuery({
    queryKey: ['chatThreads'],
    queryFn: getChatThreads,
  })

  // Fetch links to get supplier/consumer names
  const { data: links = [] } = useQuery({
    queryKey: ['links', userType],
    queryFn: () =>
      userType === 'consumer'
        ? getMyLinks('accepted')
        : getLinkRequests('accepted'),
  })

  // Fetch messages for selected thread
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['chatMessages', selectedThread?.link_id],
    queryFn: () => getMessages(selectedThread!.link_id),
    enabled: !!selectedThread,
  })

  // Fetch user presence
  const { data: presence } = useQuery({
    queryKey: ['userPresence', selectedThread?.link_id],
    queryFn: () => getUserPresence(selectedThread!.link_id),
    enabled: !!selectedThread,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Update online users from presence data
  useEffect(() => {
    if (!presence) return

    const online = new Set<string>()
    presence.forEach((p: UserPresence) => {
      if (p.is_online) {
        online.add(p.user_id)
      }
    })

    setOnlineUsers((prev) => {
      if (prev.size === online.size) {
        let isSame = true
        for (const id of prev) {
          if (!online.has(id)) {
            isSame = false
            break
          }
        }
        if (isSame) {
          return prev
        }
      }
      return online
    })
  }, [presence])

  // WebSocket connection
  useEffect(() => {
    if (!selectedThread || !currentUser) return

    const wsUrl = getWebSocketUrl(selectedThread.link_id)
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleWebSocketMessage(data)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
      // Attempt to reconnect after 3 seconds
      const linkId = selectedThread.link_id
      setTimeout(() => {
        if (linkId) {
          wsRef.current = new WebSocket(getWebSocketUrl(linkId))
        }
      }, 3000)
    }

    wsRef.current = ws

    return () => {
      ws.close()
    }
  }, [selectedThread?.link_id, currentUser])

  const handleWebSocketMessage = useCallback(
    (data: any) => {
      if (data.type === 'new_message') {
        // Add new message to the list
        queryClient.setQueryData(
          ['chatMessages', selectedThread?.link_id],
          (old: Array<ChatMessage> = []) => {
            const newMessage = {
              ...data.data,
              sent_at: data.data.sent_at,
            }
            // Check if message already exists
            if (old.some((m) => m.id === data.data.id)) {
              return old
            }
            return [...old, newMessage].sort(
              (a, b) =>
                new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime(),
            )
          },
        )

        // Update thread list with new last message
        queryClient.setQueryData(['chatThreads'], (old: Array<ChatThread> = []) => {
          return old.map((thread) => {
            if (thread.link_id === selectedThread?.link_id) {
              return {
                ...thread,
                last_message_at: data.data.sent_at,
                unread_count:
                  data.data.sender_id !== currentUser?.id
                    ? thread.unread_count + 1
                    : thread.unread_count,
              }
            }
            return thread
          })
        })

        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)

        // Mark as read if user is viewing the thread
        if (selectedThread && data.data.sender_id !== currentUser?.id) {
          markMessagesAsRead({ message_ids: [data.data.id] })
        }
      } else if (data.type === 'messages_read') {
        // Update read status
        queryClient.setQueryData(
          ['chatMessages', selectedThread?.link_id],
          (old: Array<ChatMessage> = []) => {
            return old.map((msg) => {
              if (data.data.message_ids.includes(msg.id)) {
                return { ...msg, read_at: data.data.read_at }
              }
              return msg
            })
          },
        )
      } else if (data.type === 'typing') {
        if (data.data.is_typing) {
          setTypingUsers((prev) => new Set(prev).add(data.data.user_id))
        } else {
          setTypingUsers((prev) => {
            const next = new Set(prev)
            next.delete(data.data.user_id)
            return next
          })
        }
      } else if (data.type === 'user_online') {
        setOnlineUsers((prev) => new Set(prev).add(data.data.user_id))
      } else if (data.type === 'user_offline') {
        setOnlineUsers((prev) => {
          const next = new Set(prev)
          next.delete(data.data.user_id)
          return next
        })
      }
    },
    [selectedThread, currentUser, queryClient],
  )

  // Mark messages as read when thread is selected
  useEffect(() => {
    if (selectedThread && messages.length > 0) {
      const unreadMessages = messages.filter(
        (msg) => msg.sender_id !== currentUser?.id && !msg.read_at,
      )
      if (unreadMessages.length > 0) {
        markMessagesAsRead({
          message_ids: unreadMessages.map((m) => m.id),
        })
        refetchThreads()
      }
    }
  }, [selectedThread, messages, currentUser, refetchThreads])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessageMutation = useMutation({
    mutationFn: (data: {
      linkId: string
      messageText: string
      files?: Array<File>
    }) =>
      data.files && data.files.length > 0
        ? sendMessageWithFiles(data.linkId, data.messageText, data.files)
        : sendMessage(data.linkId, {
            message_text: data.messageText,
            message_type: 'TEXT',
          }),
    onSuccess: () => {
      setMessageText('')
      setSelectedFiles([])
      refetchMessages()
      refetchThreads()
    },
  })

  const handleSendMessage = () => {
    if (!selectedThread || (!messageText.trim() && selectedFiles.length === 0))
      return

    sendMessageMutation.mutate({
      linkId: selectedThread.link_id,
      messageText: messageText.trim(),
      files: selectedFiles.length > 0 ? selectedFiles : undefined,
    })
  }

  const handleTyping = () => {
    if (!selectedThread || !wsRef.current) return

    setIsTyping(true)

    // Send typing start
    wsRef.current.send(
      JSON.stringify({
        type: 'typing_start',
        data: {},
      }),
    )

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Send typing stop after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      if (wsRef.current) {
        wsRef.current.send(
          JSON.stringify({
            type: 'typing_stop',
            data: {},
          }),
        )
      }
    }, 3000)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_item, i) => i !== index))
  }

  // Get the other party's name (supplier or consumer)
  const getOtherPartyName = (thread: ChatThread) => {
    const link = links.find((l: Link) => l.id === thread.link_id)
    if (link) {
      return userType === 'consumer'
        ? link.supplier_name || 'Supplier'
        : link.consumer_name || 'Consumer'
    }
    return userType === 'consumer' ? 'Supplier' : 'Consumer'
  }

  // Get the other party's ID
  const getOtherPartyId = (thread: ChatThread) => {
    return userType === 'consumer' ? thread.supplier_id : thread.consumer_id
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Thread List */}
      <Card className="w-80 shrink-0">
        <CardHeader>
          <CardTitle>Chats</CardTitle>
          <CardDescription>
            {userType === 'consumer'
              ? 'Chat with your linked suppliers'
              : 'Chat with your linked consumers'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[calc(100vh-12rem)] overflow-y-auto">
            {threads.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No chat threads available. Link with{' '}
                {userType === 'consumer' ? 'suppliers' : 'consumers'} to start
                chatting.
              </div>
            ) : (
              <div className="divide-y">
                {threads.map((thread) => {
                  const otherPartyId = getOtherPartyId(thread)
                  const isOnline = onlineUsers.has(otherPartyId)
                  const isSelected = selectedThread?.id === thread.id

                  return (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThread(thread)}
                      className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                        isSelected ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium truncate">
                              {getOtherPartyName(thread)}
                            </span>
                            {isOnline && (
                              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                            )}
                          </div>
                          {thread.last_message_at && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {formatDistanceToNow(thread.last_message_at)}
                            </p>
                          )}
                        </div>
                        {thread.unread_count > 0 && (
                          <Badge variant="default" className="shrink-0">
                            {thread.unread_count}
                          </Badge>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {getOtherPartyName(selectedThread)}
                    {onlineUsers.has(getOtherPartyId(selectedThread)) && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        (Online)
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {userType === 'consumer' ? 'Supplier' : 'Consumer'}{' '}
                    communication
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isOwnMessage = message.sender_id === currentUser?.id
                    const isRead = !!message.read_at

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap wrap-break-words">
                            {message.message_text}
                          </p>
                          {message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {message.attachments.map((attachment, idx) => (
                                  <a
                                    key={idx}
                                    href={attachment.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`block text-xs underline ${
                                      isOwnMessage
                                        ? 'text-primary-foreground/80'
                                        : 'text-muted-foreground'
                                    }`}
                                  >
                                    📎 {attachment.file_name}
                                  </a>
                                ))}
                              </div>
                            )}
                          <div className="flex items-center gap-1 mt-1">
                            <span
                              className={`text-xs ${
                                isOwnMessage
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {formatDistanceToNow(message.sent_at)}
                            </span>
                            {isOwnMessage && (
                              <span className="text-xs">
                                {isRead ? (
                                  <CheckCheck className="h-3 w-3 inline" />
                                ) : (
                                  <Check className="h-3 w-3 inline" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {typingUsers.size > 0 && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                          <div
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                          />
                          <div
                            className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                            style={{ animationDelay: '0.4s' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="border-t p-2">
                  <div className="flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-muted rounded px-2 py-1 text-sm"
                      >
                        <Paperclip className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">
                          {file.name}
                        </span>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <Paperclip className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <Textarea
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value)
                      handleTyping()
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 min-h-[60px] resize-none"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={
                      sendMessageMutation.isPending ||
                      (!messageText.trim() && selectedFiles.length === 0)
                    }
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a chat thread to start messaging</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
