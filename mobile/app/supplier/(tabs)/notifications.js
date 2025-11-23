// app/Notifications.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// --- Sample notifications (replace with API) ---
const SAMPLE_NOTIFS = [
  {
    id: 'n1',
    title: 'Order Shipped',
    body: 'Your order ORD-1001 has been shipped. Track it now.',
    time: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    unread: true,
    type: 'order',
    avatar: 'https://i.pravatar.cc/80?img=5',
  },
  {
    id: 'n2',
    title: 'New Message from Support',
    body: "Hi! We're checking your refund request — we'll update you soon.",
    time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    unread: true,
    type: 'message',
    avatar: 'https://i.pravatar.cc/80?img=6',
  },
  {
    id: 'n3',
    title: 'Discount Coupon',
    body: 'Use SAVE20 to get 20% off your next purchase. Expires soon!',
    time: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    unread: false,
    type: 'promo',
    avatar: 'https://i.pravatar.cc/80?img=7',
  },
];

// --- Helper to format relative time (simple) ---
function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// --- Notification Row ---
function NotificationRow({ item, onPress, onLongPress, onToggleRead, onDelete }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      style={[styles.row, item.unread && styles.rowUnread]}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />

      <View style={styles.content}>
        <View style={styles.rowTop}>
          <Text style={[styles.title, item.unread && styles.titleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.time}>{timeAgo(item.time)}</Text>
        </View>

        <View style={styles.rowBottom}>
          <Text style={[styles.body, item.unread && styles.bodyUnread]} numberOfLines={1}>
            {item.body}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity onPress={() => onToggleRead(item)} style={styles.iconBtn}>
              <Ionicons
                name={item.unread ? 'mail-unread-outline' : 'mail-open-outline'}
                size={18}
                color={item.unread ? '#007bff' : '#666'}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => onDelete(item)} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={18} color="#d9534f" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {item.unread ? <View style={styles.unreadDot} /> : null}
    </TouchableOpacity>
  );
}

// --- Notifications Screen ---
export default function Notifications({ navigation }) {
  const [notifs, setNotifs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // load sample
  useEffect(() => {
    // simulate fetch
    setTimeout(() => setNotifs(SAMPLE_NOTIFS), 200);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: call API to refresh notifications
    await new Promise((r) => setTimeout(r, 600));
    // For demo, we'll toggle a fake new notification
    setNotifs((prev) => [
      {
        id: `n${Date.now()}`,
        title: 'Welcome back!',
        body: 'Thanks for checking updates — here is one new item.',
        time: new Date().toISOString(),
        unread: true,
        type: 'info',
        avatar: 'https://i.pravatar.cc/80?img=12',
      },
      ...prev,
    ]);
    setRefreshing(false);
  }, []);

  const openNotification = (item) => {
    // mark read and navigate to relevant screen
    setNotifs((prev) => prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n)));

    // Example navigation by type
    switch (item.type) {
      case 'order':
        navigation?.navigate?.('Orders'); // or router.push('/orders') if using expo-router
        break;
      case 'message':
        navigation?.navigate?.('Chat', { userId: 'support' });
        break;
      default:
        // show details modal or push to a details screen
        Alert.alert(item.title, item.body);
    }
  };

  const longPressAction = (item) => {
    Alert.alert(
      'Notification',
      'Choose action',
      [
        { text: item.unread ? 'Mark as read' : 'Mark as unread', onPress: () => toggleRead(item) },
        { text: 'Archive', onPress: () => archiveNotification(item) },
        { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(item) },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const toggleRead = (item) => {
    setNotifs((prev) => prev.map((n) => (n.id === item.id ? { ...n, unread: !n.unread } : n)));
  };

  const deleteNotification = (item) => {
    setNotifs((prev) => prev.filter((n) => n.id !== item.id));
  };

  const archiveNotification = (item) => {
    // demo: remove from list; in real app move to archive
    setNotifs((prev) => prev.filter((n) => n.id !== item.id));
    // show toast/alert
    Alert.alert('Archived', 'Notification archived.');
  };

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Ionicons name="notifications-off-outline" size={56} color="#bbb" />
      <Text style={styles.emptyTitle}>No notifications</Text>
      <Text style={styles.emptySub}>You’ll see notifications here when something happens.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={markAllRead} style={styles.headerBtn}>
            <Ionicons name="mail-open-outline" size={20} color="#007bff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setNotifs([])} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={20} color="#d9534f" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={notifs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationRow
            item={item}
            onPress={openNotification}
            onLongPress={longPressAction}
            onToggleRead={toggleRead}
            onDelete={deleteNotification}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={notifs.length === 0 ? styles.flatEmptyContainer : styles.flatContainer}
        ListEmptyComponent={renderEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </SafeAreaView>
  );
}

// --- Styles ---
const AVATAR_SIZE = 48;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f7f7' },
  header: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { padding: 8, marginLeft: 6 },

  flatContainer: { paddingVertical: 8 },
  flatEmptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },

  row: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  rowUnread: { backgroundColor: '#eef7ff' },

  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, marginRight: 12 },

  content: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, color: '#222' },
  titleUnread: { fontWeight: '700' },
  time: { fontSize: 12, color: '#888', marginLeft: 8 },

  rowBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  body: { flex: 1, color: '#666' },
  bodyUnread: { color: '#333' },

  actions: { flexDirection: 'row', marginLeft: 8 },
  iconBtn: { paddingHorizontal: 6, paddingVertical: 4 },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007bff',
    marginLeft: 8,
  },

  separator: { height: 8, backgroundColor: '#f7f7f7' },

  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '600' },
  emptySub: { marginTop: 6, color: '#aaa', textAlign: 'center' },
});
