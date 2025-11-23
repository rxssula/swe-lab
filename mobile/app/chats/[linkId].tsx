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

interface ChatMessage {
  id: string
  thread_id: string
  sender_id: string
  sender_type: string
  message_text: string
  message_type: string
  product_id?: string
  sent_at: string
  read_at?: string | null
  attachments: Array<{
    id: string
    file_url: string
    file_name: string
  }>
}

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
  const { token, user } = useAuth()
  const router = useRouter()
  const { linkId, name, counterpartId } = useLocalSearchParams<{
    linkId?: string
    name?: string
    counterpartId?: string
  }>()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<PendingFile[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const flatListRef = useRef<FlatList<ChatMessage>>(null)

  const otherPartyName = name || 'Chat'
  const currentUserId = user?.id ? String(user.id) : null

  useEffect(() => {
    if (__DEV__) {
      console.log('Chat Screen - Current User ID:', currentUserId)
      console.log('Chat Screen - User object:', user)
    }
  }, [currentUserId, user])

  const loadMessages = useCallback(async () => {
    if (!token || !linkId) return
    setLoading(true)
    try {
      const resp = await fetch(
        `https://swe-lab-1.onrender.com/chat/links/${linkId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      )

      if (!resp.ok) {
        throw new Error('Failed to load messages')
      }

      const data = await resp.json()
      setMessages(sortMessages(Array.isArray(data) ? data : []))
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

  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        loadMessages()
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [loadMessages, loading])

  useEffect(() => {
    const markAsRead = async () => {
      if (!token || !linkId || !currentUserId || messages.length === 0) return

      const unreadMessages = messages.filter(
        (msg) => msg.sender_id !== currentUserId && !msg.read_at
      )

      if (unreadMessages.length === 0) return

      try {
        await Promise.all(
          unreadMessages.map(async (msg) => {
            try {
              await fetch(
                `https://swe-lab-1.onrender.com/chat/messages/${msg.id}/read`,
                {
                  method: 'PUT',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                  },
                }
              )
            } catch (err) {
              console.warn('Failed to mark message as read:', err)
            }
          })
        )

        setTimeout(() => loadMessages(), 500)
      } catch (err) {
        console.warn('Error marking messages as read:', err)
      }
    }

    markAsRead()
  }, [messages, currentUserId, token, linkId, loadMessages])

  useEffect(() => {
    const timeout = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)
    return () => clearTimeout(timeout)
  }, [messages.length])

  const appendMessageLocally = (message: ChatMessage) => {
    setMessages((prev) => sortMessages([...prev, message]))
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
      const requestBody: any = {
        message_text: trimmed,
        message_type: 'TEXT',
      }

      if (selectedFiles.length > 0) {
        requestBody.attachment_urls = selectedFiles.map(f => f.uri)
      }

      const resp = await fetch(
        `https://swe-lab-1.onrender.com/chat/links/${linkId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      )

      if (!resp.ok) {
        throw new Error('Failed to send message')
      }

      const response = await resp.json()
      if (response) {
        appendMessageLocally(response)
      }

      setMessageText('')
      setSelectedFiles([])

      setTimeout(() => loadMessages(), 500)
    } catch (err) {
      console.error('Failed to send message', err)
      Alert.alert('Send failed', err instanceof Error ? err.message : 'Try again')
    } finally {
      setSending(false)
    }
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.sender_id === currentUserId

    if (__DEV__) {
      console.log('Message:', {
        sender_id: item.sender_id,
        currentUserId,
        isOwn,
        text: item.message_text?.substring(0, 20)
      })
    }

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
            {messages.length} {messages.length === 1 ? 'message' : 'messages'}
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.centerContent}>
          <Text style={styles.infoText}>{error}</Text>
          <TouchableOpacity onPress={loadMessages} style={styles.retryButton}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            loading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color="#2563eb" />
              </View>
            ) : null
          }
        />
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
          onChangeText={setMessageText}
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
