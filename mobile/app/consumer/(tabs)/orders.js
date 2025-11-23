// app/consumer/(tabs)/orders.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext'; // adjust path if needed

// helper to format date
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const STATUS_COLOR = {
  Pending: '#ffb74d',
  Processing: '#64b5f6',
  Shipped: '#4db6ac',
  Delivered: '#81c784',
  Canceled: '#e57373',
};

export default function Orders() {
  const router = useRouter();

  // Try reading token from AuthProvider, fallback to AsyncStorage
  let tokenFromContext = null;
  try {
    const auth = useAuth();
    tokenFromContext = auth?.token ?? null;
  } catch {
    tokenFromContext = null;
  }
  const TOKEN_KEY = 'token';
  const getToken = async () => {
    if (tokenFromContext) return tokenFromContext;
    return await AsyncStorage.getItem(TOKEN_KEY);
  };

  // ===== Replace this with your backend orders endpoint =====
  // Example: 'https://swe-lab-1.onrender.com/consumer/orders/'
  const ORDERS_URL = 'https://swe-lab-1.onrender.com/consumer/orders/';
  // ==========================================================

  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const PAGE_SIZE = 12; // adjust if your API uses different page size

  const fetchOrdersApi = useCallback(
    async ({ page = 1 } = {}) => {
      try {
        const token = await getToken();
        const headers = { Accept: 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        // If your API accepts page & page_size query params adjust accordingly
        const url = `${ORDERS_URL}?page=${page}&page_size=${PAGE_SIZE}`;
        const resp = await fetch(url, { headers });
        const text = await resp.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }

        if (!resp.ok) {
          console.warn('orders fetch failed', resp.status, data ?? text);
          throw new Error(data?.detail ?? data?.message ?? `Failed to fetch orders (status ${resp.status})`);
        }

        // expected shapes:
        // - plain array: [{...}, {...}]
        // - paginated: { results: [...], next: ..., count: ...}
        if (Array.isArray(data)) {
          return { items: data, hasMore: data.length === PAGE_SIZE };
        } else if (data && Array.isArray(data.results)) {
          return { items: data.results, hasMore: !!data.next };
        } else {
          return { items: [], hasMore: false };
        }
      } catch (err) {
        console.error('fetchOrdersApi error', err);
        throw err;
      }
    },
    [ORDERS_URL, tokenFromContext]
  );

  // initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { items } = await fetchOrdersApi({ page: 1 });
        if (!mounted) return;
        setOrders(items);
        setPage(1);
      } catch (err) {
        Alert.alert('Error', err.message ?? 'Failed to load orders.');
        setOrders([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [fetchOrdersApi]);

  // pull to refresh
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { items } = await fetchOrdersApi({ page: 1 });
      setOrders(items);
      setPage(1);
    } catch (err) {
      Alert.alert('Error', err.message ?? 'Refresh failed.');
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchOrdersApi]);

  // load more (pagination)
  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { items, hasMore } = await fetchOrdersApi({ page: nextPage });
      if (items.length > 0) {
        setOrders(prev => [...prev, ...items]);
        setPage(nextPage);
      }
      if (!hasMore) {
        // no more pages; you can set a flag if desired
      }
    } catch (err) {
      console.warn('loadMore error', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchOrdersApi, page, isLoadingMore]);

  // client-side filtering/search
  const filtered = orders.filter((o) => {
    if (filterStatus !== 'All' && o.status !== filterStatus) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const number = (o.number ?? o.id ?? '').toString().toLowerCase();
    const itemMatch = (o.items ?? []).some(it => (it.title ?? '').toString().toLowerCase().includes(q));
    return number.includes(q) || itemMatch;
  });

  const openOrder = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const closeOrder = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };

  // navigate to complaint screen with order info
  const onComplain = (order) => {
    // adapt path and params as needed
    router.push({
      pathname: '/consumer/complaints',
      params: { orderId: order.id, orderNumber: order.number ?? order.id },
    });
  };

  // row renderer
  function OrderRow({ order, onPress }) {
    return (
      <TouchableOpacity style={styles.row} onPress={() => onPress(order)}>
        <View style={styles.rowLeft}>
          <Text style={styles.orderNumber}>{order.number ?? `#${order.id}`}</Text>
          <Text style={styles.orderDate}>{formatDate(order.date)}</Text>
        </View>

        <View style={styles.rowRight}>
          <Text style={styles.orderTotal}>${order.total}</Text>
          <View style={[styles.statusChip, { backgroundColor: STATUS_COLOR[order.status] || '#ddd' }]}>
            <Text style={styles.statusText}>{order.status}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  const EmptyList = () => (
    <View style={styles.empty}>
      <Ionicons name="receipt-outline" size={48} color="#bbb" />
      <Text style={styles.emptyText}>No orders found.</Text>
      <Text style={styles.emptySub}>Try adjusting filters or check back later.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order History</Text>
        <TouchableOpacity style={styles.headerAction} onPress={() => fetchOrdersApi({ page: 1 }).then(({ items }) => { setOrders(items); setPage(1); }).catch(err => Alert.alert('Error', err.message))}>
          <Ionicons name="refresh-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#666" />
          <TextInput
            placeholder="Search by order number or item..."
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filtersRow}>
          {['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Canceled'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterBtn, filterStatus === s && styles.filterBtnActive]}
              onPress={() => setFilterStatus(s)}
            >
              <Text style={[styles.filterText, filterStatus === s && styles.filterTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <OrderRow order={item} onPress={openOrder} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={filtered.length === 0 ? styles.flatEmptyContainer : styles.flatContainer}
          ListEmptyComponent={<EmptyList />}
          onEndReachedThreshold={0.5}
          onEndReached={loadMore}
          ListFooterComponent={() => (isLoadingMore ? <View style={styles.loadingMore}><ActivityIndicator size="small" /></View> : null)}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Order Detail Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={closeOrder} transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order {selectedOrder?.number ?? selectedOrder?.id}</Text>
              <TouchableOpacity onPress={closeOrder}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Status</Text>
                <View style={[styles.statusChip, { backgroundColor: STATUS_COLOR[selectedOrder?.status] || '#ddd' }]}>
                  <Text style={styles.statusText}>{selectedOrder?.status}</Text>
                </View>
              </View>

              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Date</Text>
                <Text style={styles.modalValue}>{formatDate(selectedOrder?.date)}</Text>
              </View>

              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Total</Text>
                <Text style={styles.modalValue}>${selectedOrder?.total}</Text>
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={[styles.modalLabel, { marginBottom: 8 }]}>Items</Text>
                {(selectedOrder?.items ?? []).map((it) => (
                  <View key={it.id} style={styles.itemRow}>
                    <Text style={styles.itemTitle}>{it.title}</Text>
                    <Text style={styles.itemQty}>x{it.qty}</Text>
                    <Text style={styles.itemPrice}>${Number(it.price).toFixed(2)}</Text>
                  </View>
                ))}
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.modalLabel}>Shipping Address</Text>
                <Text style={styles.modalValue}>{selectedOrder?.shippingAddress ?? selectedOrder?.shipping_address ?? '—'}</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => { /* contact support flow */ Alert.alert('Support', 'Contact support flow not implemented'); }}>
                <Text style={styles.primaryBtnText}>Contact Support</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#e74c3c', marginLeft: 8 }]}
                onPress={() => {
                  closeOrder();
                  onComplain(selectedOrder);
                }}
              >
                <Text style={styles.primaryBtnText}>Complaint</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.ghostBtn, { marginLeft: 8 }]} onPress={closeOrder}>
                <Text style={styles.ghostBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- Styles (kept same as original) ---
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f7f7' },
  header: { height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: '600' },
  headerAction: { padding: 6 },

  controls: { padding: 12, backgroundColor: '#fff' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f2', paddingHorizontal: 10, borderRadius: 10, height: 42 },
  searchInput: { flex: 1, marginLeft: 8 },

  filtersRow: { flexDirection: 'row', marginTop: 10, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18, borderWidth: 1, borderColor: '#eee', marginRight: 8, marginBottom: 8, backgroundColor: '#fff' },
  filterBtnActive: { backgroundColor: '#007bff', borderColor: '#007bff' },
  filterText: { color: '#333', fontSize: 13 },
  filterTextActive: { color: '#fff' },

  flatContainer: { paddingBottom: 24 },
  flatEmptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  row: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: {},
  orderNumber: { fontSize: 15, fontWeight: '600' },
  orderDate: { color: '#666', fontSize: 12, marginTop: 4 },

  rowRight: { alignItems: 'flex-end' },
  orderTotal: { fontWeight: '700', marginBottom: 6 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14 },
  statusText: { fontSize: 12, color: '#222' },

  separator: { height: 8, backgroundColor: '#f7f7f7' },

  empty: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, fontSize: 16, color: '#777' },
  emptySub: { marginTop: 6, color: '#aaa' },

  loadingMore: { padding: 12, alignItems: 'center' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalBody: { padding: 14 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalLabel: { color: '#666', fontWeight: '600' },
  modalValue: { color: '#222' },

  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  itemTitle: { flex: 1 },
  itemQty: { width: 36, textAlign: 'center' },
  itemPrice: { width: 70, textAlign: 'right' },

  modalFooter: { padding: 12, borderTopWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'flex-start' },
  primaryBtn: { backgroundColor: '#007bff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, flex: 1 },
  primaryBtnText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  ghostBtn: { borderWidth: 1, borderColor: '#ddd', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', minWidth: 90 },
  ghostBtnText: { color: '#333' },
});
