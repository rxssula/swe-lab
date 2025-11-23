import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'

import { useAuth } from '../context/AuthContext'
import { getChatThreads } from '../lib/api/chat'
import { getLinkRequests, getMyLinks } from '../lib/api/links'

const formatDistanceToNow = (date) => {
  if (!date) return '—'
  const then = typeof date === 'string' ? new Date(date) : date
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

export default function ChatsList() {
  const router = useRouter()
  const { token, user } = useAuth()

  const [threads, setThreads] = useState([])
  const [links, setLinks] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const userType = user?.userType === 'supplier' ? 'supplier' : 'consumer'

  const fetchData = useCallback(
    async (showLoading = true) => {
      if (!token) return
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      try {
        const [threadResponse, linkResponse] = await Promise.all([
          getChatThreads(token),
          userType === 'consumer'
            ? getMyLinks(token, 'accepted')
            : getLinkRequests(token, 'accepted'),
        ])
        setThreads(threadResponse)
        setLinks(linkResponse)
        setError(null)
      } catch (err) {
        console.error('Failed to load chat threads', err)
        setError(err instanceof Error ? err.message : 'Failed to load chats')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [token, userType],
  )

  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [fetchData]),
  )

  const linkMap = useMemo(() => {
    const map = new Map()
    links.forEach((link) => {
      map.set(link.id, link)
    })
    return map
  }, [links])

  const getOtherPartyName = (thread) => {
    const link = linkMap.get(thread.link_id)
    if (!link) {
      return userType === 'consumer' ? 'Supplier' : 'Consumer'
    }
    return userType === 'consumer'
      ? link.supplier_name || 'Supplier'
      : link.consumer_name || 'Consumer'
  }

  const filteredThreads = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase()
    if (!lowerSearch) return threads
    return threads.filter((thread) =>
      getOtherPartyName(thread).toLowerCase().includes(lowerSearch),
    )
  }, [search, threads])

  const handleRefresh = () => {
    fetchData(false)
  }

  const getOtherPartyId = (thread) =>
    userType === 'consumer' ? thread.supplier_id : thread.consumer_id

  const openThread = (thread) => {
    const counterpartName = getOtherPartyName(thread)
    router.push({
      pathname: '/chats/[linkId]',
      params: {
        linkId: thread.link_id,
        threadId: thread.id,
        name: counterpartName,
        counterpartId: getOtherPartyId(thread),
      },
    })
  }

  const renderChatRow = ({ item }) => (
    <TouchableOpacity style={styles.chatRow} onPress={() => openThread(item)}>
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarInitials}>
        {getOtherPartyName(item)
            .split(' ')
            .slice(0, 2)
            .map((word) => word.charAt(0).toUpperCase())
            .join('')}
        </Text>
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.name}>{getOtherPartyName(item)}</Text>
          {item.last_message_at ? (
            <Text style={styles.time}>{formatDistanceToNow(item.last_message_at)}</Text>
          ) : (
            <Text style={styles.time}>No messages</Text>
          )}
        </View>
        <Text style={styles.lastMessage}>
          {item.unread_count > 0
            ? `${item.unread_count} unread message${item.unread_count > 1 ? 's' : ''}`
            : 'Tap to continue the conversation'}
        </Text>
      </View>
      {item.unread_count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  )

  if (!token) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.emptyText}>Sign in to view your chats.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Ionicons name="search" size={18} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          placeholder="Search chats..."
          style={styles.searchBar}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity onPress={handleRefresh} accessibilityLabel="Refresh chats">
          <Ionicons name="refresh" size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredThreads}
          keyExtractor={(item) => item.link_id}
          renderItem={renderChatRow}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <View style={styles.centerContent}>
              <Text style={styles.emptyText}>
                {error
                  ? error
                  : 'No chat threads yet. Link with a partner to start a conversation.'}
              </Text>
            </View>
          }
          contentContainerStyle={
            filteredThreads.length === 0 ? styles.listEmptyContainer : undefined
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 8,
  },
  searchIcon: { marginRight: -4 },
  searchBar: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    fontSize: 14,
    color: '#111827',
  },
  chatRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitials: { color: '#1d4ed8', fontWeight: '600' },
  chatInfo: { flex: 1 },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: { fontSize: 16, fontWeight: '600', color: '#111827', maxWidth: '75%' },
  time: { fontSize: 12, color: '#6b7280' },
  lastMessage: { fontSize: 13, color: '#4b5563' },
  separator: { height: 1, backgroundColor: '#e5e7eb', marginLeft: 76 },
  badge: {
    backgroundColor: '#ef4444',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: { marginTop: 8, color: '#6b7280' },
  emptyText: { textAlign: 'center', color: '#6b7280' },
  listEmptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
})
