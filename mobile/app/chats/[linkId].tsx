import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import * as DocumentPicker from 'expo-document-picker'

import { useAuth } from '../context/AuthContext'
import {
  getMessages,
  sendMessage,
  sendMessageWithFiles,
  markMessagesAsRead,
  getWebSocketUrl,
  getUserPresence,
  type ChatMessage,
} from '../lib/api/chat'
import { getCurrentUser } from '../lib/api/auth'

const formatDistanceToNow = (date: string) => {
  const then = new Date(date)
  const diffInSeconds = Math.floor((Date.now() - then.getTime()) / 1000)
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} min${minutes !== 1 ? 's' : ''} ago`
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hr${hours !== 1 ? 's' : ''} ago`
  }
  const days = Math.floor(diffInSeconds / 86400)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

type PendingFile = {
  uri: string
  name: string
  mimeType?: string | null
  size?: number | null
}

const sortMessages = (items: ChatMessage[]) =>
  [...items].sort(
    (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime(),
  )

export default function ChatThreadScreen() {
  const { token } = useAuth()
  const router = useRouter()
  const { linkId, name, counterpartId } = useLocalSearchParams<{
    linkId?: string
    name?: string
    counterpartId?: string
  }>()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<PendingFile[]>([])
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flatListRef = useRef<FlatList<ChatMessage>>(null)

  const otherPartyName = name || 'Chat'
  const isCounterpartOnline = counterpartId
    ? onlineUsers.has(String(counterpartId))
    : false

  useEffect(() => {
    let active = true
    if (!token) return
    ;(async () => {
      try {
        const me = await getCurrentUser(token)
        if (active) {
          setCurrentUserId(me.id)
        }
      } catch (err) {
        console.error('Failed to load current user', err)
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load user')
        }
      }
    })()
    return () => {
      active = false
    }
  }, [token])

  const loadMessages = useCallback(async () => {
    if (!token || !linkId) return
    setLoading(true)
    try {
      const data = await getMessages(token, linkId as string, 100, 0)
      setMessages(sortMessages(data))
      setError(null)
    } catch (err) {
      console.error('Failed to load messages', err)
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [token, linkId])

  useFocusEffect(
    useCallback(() => {
      loadMessages()
    }, [loadMessages]),
  )

  const refreshPresence = useCallback(async () => {
    if (!token || !linkId) return
    try {
      const presence = await getUserPresence(token, linkId as string)
      const nextOnline = new Set<string>()
      presence.forEach((entry) => {
        if (entry.is_online) {
          nextOnline.add(entry.user_id)
        }
      })
      setOnlineUsers(nextOnline)
    } catch (err) {
      console.warn('Failed to load presence', err)
    }
  }, [token, linkId])

  useEffect(() => {
    refreshPresence()
    const interval = setInterval(refreshPresence, 30_000)
    return () => clearInterval(interval)
  }, [refreshPresence])

  const handleSocketMessage = useCallback((payload: any) => {
    if (!payload?.type) return
    if (payload.type === 'new_message' && payload.data) {
      setMessages((prev) => {
        if (prev.some((msg) => msg.id === payload.data.id)) {
          return prev
        }
        return sortMessages([...prev, payload.data])
      })
    } else if (payload.type === 'messages_read' && payload.data) {
      setMessages((prev) =>
        prev.map((msg) =>
          payload.data.message_ids?.includes(msg.id)
            ? { ...msg, read_at: payload.data.read_at }
            : msg,
        ),
      )
    } else if (payload.type === 'typing' && payload.data) {
      setTypingUsers((prev) => {
        const next = new Set(prev)
        if (payload.data.is_typing) {
          next.add(payload.data.user_id)
        } else {
          next.delete(payload.data.user_id)
        }
        return next
      })
    } else if (payload.type === 'user_online' && payload.data) {
      setOnlineUsers((prev) => new Set(prev).add(payload.data.user_id))
    } else if (payload.type === 'user_offline' && payload.data) {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        next.delete(payload.data.user_id)
        return next
      })
    }
  }, [])

  useEffect(() => {
    if (!token || !linkId) return
    const ws = new WebSocket(getWebSocketUrl(linkId as string, token))
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        handleSocketMessage(payload)
      } catch (err) {
        console.warn('Failed to parse WS message', err)
      }
    }

    ws.onerror = (event) => {
      console.warn('WebSocket error', event)
    }

    ws.onclose = () => {
      wsRef.current = null
      setTypingUsers(new Set())
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [token, linkId, handleSocketMessage])

  useEffect(() => {
    if (!currentUserId || !token) return
    const unread = messages.filter(
      (msg) => msg.sender_id !== currentUserId && !msg.read_at,
    )
    if (unread.length === 0) return
    markMessagesAsRead(
      token,
      unread.map((msg) => msg.id),
    ).catch((err) => console.warn('Failed to mark messages as read', err))
  }, [messages, currentUserId, token])

  useEffect(() => {
    const timeout = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)
    return () => clearTimeout(timeout)
  }, [messages.length])

  const appendMessageLocally = (message: ChatMessage) => {
    setMessages((prev) => sortMessages([...prev, message]))
  }

  const sendTypingEvent = (type: 'typing_start' | 'typing_stop') => {
    if (!wsRef.current) return
    try {
      wsRef.current.send(JSON.stringify({ type, data: {} }))
    } catch (err) {
      console.warn('Failed to send typing event', err)
    }
  }

  const handleTyping = () => {
    if (!wsRef.current) return
    if (!typingTimeoutRef.current) {
      sendTypingEvent('typing_start')
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingEvent('typing_stop')
      typingTimeoutRef.current = null
    }, 2500)
  }

  const handlePickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
      })
      const canceled =
        (result as any).canceled ?? ((result as any).type === 'cancel')
      if (canceled) return

      const assets = (result as any).assets
        ? (result as any).assets
        : [
            {
              uri: (result as any).uri,
              name: (result as any).name,
              mimeType: (result as any).mimeType,
              size: (result as any).size,
            },
          ]

      const filesToAdd = assets.map((asset: any) => ({
        uri: asset.uri,
        name: asset.name || 'attachment',
        mimeType: asset.mimeType,
        size: asset.size,
      }))
      setSelectedFiles((prev) => [...prev, ...filesToAdd])
    } catch (err) {
      console.warn('Failed to pick document', err)
      Alert.alert('Attachment', 'Could not pick the document.')
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSendMessage = async () => {
    if (!token || !linkId) return
    const trimmed = messageText.trim()
    if (!trimmed && selectedFiles.length === 0) return

    setSending(true)
    try {
      let response: ChatMessage | null = null
      if (selectedFiles.length > 0) {
        response = await sendMessageWithFiles(
          token,
          linkId as string,
          trimmed || 'Attachment',
          selectedFiles.map((file) => ({
            uri: file.uri,
            name: file.name,
            type: file.mimeType || 'application/octet-stream',
          })),
        )
      } else {
        response = await sendMessage(token, linkId as string, {
          message_text: trimmed,
          message_type: 'TEXT',
        })
      }
      if (response) {
        appendMessageLocally(response)
      }
      setMessageText('')
      setSelectedFiles([])
    } catch (err) {
      console.error('Failed to send message', err)
      Alert.alert('Send failed', err instanceof Error ? err.message : 'Try again')
    } finally {
      setSending(false)
    }
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.sender_id === currentUserId
    const bubbleStyles = [
      styles.messageBubble,
      isOwn ? styles.ownBubble : styles.otherBubble,
    ]
    const messageTextStyle = [
      styles.messageText,
      isOwn ? styles.ownText : styles.otherText,
    ]

      return (
      <View style={bubbleStyles}>
        {item.message_text ? (
          <Text style={messageTextStyle}>{item.message_text}</Text>
        ) : null}
        {item.attachments && item.attachments.length > 0 ? (
          <View style={styles.attachmentsList}>
            {item.attachments.map((attachment) => (
              <TouchableOpacity
                key={attachment.id || attachment.file_url}
                onPress={() => Linking.openURL(attachment.file_url)}
                style={styles.attachmentChip}
              >
                <Ionicons
                  name="document-attach-outline"
                  size={14}
                  color={isOwn ? '#e0e7ff' : '#4b5563'}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.attachmentText,
                    isOwn ? styles.attachmentTextOwn : styles.attachmentTextOther,
                  ]}
                >
                  {attachment.file_name}
            </Text>
          </TouchableOpacity>
            ))}
          </View>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, isOwn ? styles.metaOwn : styles.metaOther]}>
            {formatDistanceToNow(item.sent_at)}
          </Text>
          {isOwn ? (
            <Ionicons
              name={item.read_at ? 'checkmark-done' : 'checkmark'}
              size={14}
              color={item.read_at ? '#bfdbfe' : '#e5e7eb'}
              style={styles.metaIcon}
            />
          ) : null}
        </View>
        </View>
    )
    }

  const typingIndicator = useMemo(() => typingUsers.size > 0, [typingUsers])

  if (!token || !linkId) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.infoText}>Missing chat context.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {otherPartyName}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isCounterpartOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.infoText}>Loading conversation...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.infoText}>{error}</Text>
          <TouchableOpacity onPress={loadMessages} style={styles.retryButton}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
            renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
            ListFooterComponent={
              typingIndicator ? (
                <View style={styles.typingBubble}>
                  <Text style={styles.typingText}>Typing…</Text>
                </View>
              ) : null
            }
          />
        </>
      )}

      {selectedFiles.length > 0 && (
        <View style={styles.selectedFilesContainer}>
          {selectedFiles.map((file, index) => (
            <View key={`${file.uri}-${index}`} style={styles.selectedFileChip}>
              <Ionicons name="document" size={14} color="#1f2937" />
              <Text numberOfLines={1} style={styles.selectedFileText}>
                {file.name}
              </Text>
              <TouchableOpacity onPress={() => removeFile(index)}>
                <Ionicons name="close" size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handlePickFiles}
          accessibilityLabel="Attach files"
        >
          <Ionicons name="attach" size={22} color="#2563eb" />
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={(value) => {
            setMessageText(value)
            handleTyping()
          }}
          multiline
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity
          style={[styles.sendButton, sending ? styles.sendDisabled : null]}
          onPress={handleSendMessage}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  backIcon: {
    padding: 4,
  },
  headerInfo: { marginLeft: 12, flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  headerSubtitle: { fontSize: 13, color: '#6b7280' },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    maxWidth: '80%',
  },
  ownBubble: {
    backgroundColor: '#2563eb',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#e5e7eb',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 15, lineHeight: 20 },
  ownText: { color: '#f8fafc' },
  otherText: { color: '#111827' },
  attachmentsList: { marginTop: 6, gap: 4 },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  attachmentText: { fontSize: 12, flexShrink: 1 },
  attachmentTextOwn: { color: '#e0e7ff' },
  attachmentTextOther: { color: '#1f2937' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  metaText: { fontSize: 11 },
  metaOwn: { color: '#bfdbfe' },
  metaOther: { color: '#6b7280' },
  metaIcon: { marginLeft: 4 },
  typingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
  },
  typingText: { color: '#374151', fontSize: 13 },
  selectedFilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  selectedFileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  selectedFileText: { maxWidth: 160, fontSize: 12, color: '#1f2937' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  iconButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    maxHeight: 120,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    color: '#111827',
  },
  sendButton: {
    backgroundColor: '#2563eb',
    borderRadius: 999,
    padding: 12,
  },
  sendDisabled: { opacity: 0.7 },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  infoText: { color: '#4b5563', textAlign: 'center', marginTop: 12 },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  retryText: { color: '#fff', fontWeight: '600' },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: { color: '#fff', fontWeight: '600' },
})
