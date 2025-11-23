// app/Orders.js
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// --- Sample data (replace with your API calls) ---
const SAMPLE_ORDERS = Array.from({ length: 24 }).map((_, i) => {
  const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Canceled'];
  const status = statuses[i % statuses.length];
  return {
    id: (1000 + i).toString(),
    number: `ORD-${1000 + i}`,
    total: (Math.random() * 200 + 20).toFixed(2),
    date: new Date(Date.now() - i * 86400000).toISOString(), // today - i days
    status,
    items: [
      { id: `p-${i}-1`, title: `Product ${i + 1}A`, qty: 1, price: 19.99 },
      { id: `p-${i}-2`, title: `Product ${i + 1}B`, qty: 2, price: 9.99 },
    ],
    shippingAddress: '123 Main St, City, Country',
  };
});

// --- Helper to format date (simple) ---
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// --- Status color map ---
const STATUS_COLOR = {
  Pending: '#ffb74d',
  Processing: '#64b5f6',
  Shipped: '#4db6ac',
  Delivered: '#81c784',
  Canceled: '#e57373',
};

// --- OrderRow component ---
function OrderRow({ order, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(order)}>
      <View style={styles.rowLeft}>
        <Text style={styles.orderNumber}>{order.number}</Text>
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

// --- Orders screen ---
export default function Orders({ navigation }) {
  // UI state
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1); // for pagination simulation
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Simulated fetch (replace with your API)
  const fetchOrders = useCallback(
    async ({ page = 1, pageSize = 8 } = {}) => {
      // simulate network delay
      await new Promise((r) => setTimeout(r, 400));
      const start = (page - 1) * pageSize;
      const slice = SAMPLE_ORDERS.slice(start, start + pageSize);
      return slice;
    },
    []
  );

  // load initial page
  useEffect(() => {
    (async () => {
      const first = await fetchOrders({ page: 1 });
      setOrders(first);
      setPage(1);
    })();
  }, [fetchOrders]);

  // refresh handler
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const first = await fetchOrders({ page: 1 });
    setOrders(first);
    setPage(1);
    setIsRefreshing(false);
  }, [fetchOrders]);

  // load more handler (pagination)
  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    const more = await fetchOrders({ page: nextPage });
    if (more.length > 0) {
      setOrders((prev) => [...prev, ...more]);
      setPage(nextPage);
    }
    setIsLoadingMore(false);
  }, [fetchOrders, page, isLoadingMore]);

  // filtering & searching applied on client side here (replace with server-side filtering for large lists)
  const filtered = orders.filter((o) => {
    if (filterStatus !== 'All' && o.status !== filterStatus) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      o.number.toLowerCase().includes(q) ||
      o.items.some((it) => it.title.toLowerCase().includes(q))
    );
  });

  const openOrder = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const closeOrder = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };

  // Render empty state
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
        <TouchableOpacity
          onPress={() => {
            // If you use react navigation: navigation.navigate('CreateOrder') or similar
            // If you use expo-router, replace with router.push(...) elsewhere
            navigation?.navigate?.('Profile'); // example - harmless if no navigation
          }}
          style={styles.headerAction}
        >
          <Ionicons name="person-circle-outline" size={24} color="#333" />
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
              style={[
                styles.filterBtn,
                filterStatus === s && styles.filterBtnActive,
              ]}
              onPress={() => setFilterStatus(s)}
            >
              <Text style={[styles.filterText, filterStatus === s && styles.filterTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderRow order={item} onPress={openOrder} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={filtered.length === 0 ? styles.flatEmptyContainer : styles.flatContainer}
        ListEmptyComponent={<EmptyList />}
        onEndReachedThreshold={0.5}
        onEndReached={loadMore}
        ListFooterComponent={() =>
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" />
            </View>
          ) : null
        }
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      />

      {/* Order Detail Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={closeOrder} transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order {selectedOrder?.number}</Text>
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
                <Text style={styles.modalValue}>{formatDate(selectedOrder?.date || '')}</Text>
              </View>

              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Total</Text>
                <Text style={styles.modalValue}>${selectedOrder?.total}</Text>
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={[styles.modalLabel, { marginBottom: 8 }]}>Items</Text>
                {selectedOrder?.items?.map((it) => (
                  <View key={it.id} style={styles.itemRow}>
                    <Text style={styles.itemTitle}>{it.title}</Text>
                    <Text style={styles.itemQty}>x{it.qty}</Text>
                    <Text style={styles.itemPrice}>${it.price.toFixed(2)}</Text>
                  </View>
                ))}
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.modalLabel}>Shipping Address</Text>
                <Text style={styles.modalValue}>{selectedOrder?.shippingAddress}</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => {
                // example action: go to chat with support about the order
                // navigation?.navigate?.('Chat', { orderId: selectedOrder?.id });
                closeOrder();
              }}>
                <Text style={styles.primaryBtnText}>Contact Support</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostBtn} onPress={closeOrder}>
                <Text style={styles.ghostBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f7f7' },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 20, fontWeight: '600' },
  headerAction: { padding: 6 },

  controls: { padding: 12, backgroundColor: '#fff' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 10,
    borderRadius: 10,
    height: 42,
  },
  searchInput: { flex: 1, marginLeft: 8 },

  filtersRow: { flexDirection: 'row', marginTop: 10, flexWrap: 'wrap' },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eee',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  filterBtnActive: { backgroundColor: '#007bff', borderColor: '#007bff' },
  filterText: { color: '#333', fontSize: 13 },
  filterTextActive: { color: '#fff' },

  flatContainer: { paddingBottom: 24 },
  flatEmptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  row: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalBody: { padding: 14 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalLabel: { color: '#666', fontWeight: '600' },
  modalValue: { color: '#222' },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemTitle: { flex: 1 },
  itemQty: { width: 36, textAlign: 'center' },
  itemPrice: { width: 70, textAlign: 'right' },

  modalFooter: { padding: 12, borderTopWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
  primaryBtn: { backgroundColor: '#007bff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, flex: 1, marginRight: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  ghostBtn: { borderWidth: 1, borderColor: '#ddd', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', minWidth: 90 },
  ghostBtnText: { color: '#333' },
});
