// app/(tabs)/orders.js
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
import { useAuth } from '../context/AuthContext';

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

    // get auth data
    const auth = useAuth();
    const userRole = auth?.user?.role ?? "consumer"; // default consumer
    const isSupplier = userRole === "supplier";

    // Try reading token from AuthProvider, fallback to AsyncStorage
    let tokenFromContext = null;
    try {
        tokenFromContext = auth?.token ?? null;
    } catch {
        tokenFromContext = null;
    }

    const TOKEN_KEY = 'token';
    const getToken = async () => {
        if (tokenFromContext) return tokenFromContext;
        return await AsyncStorage.getItem(TOKEN_KEY);
    };

    // consumer endpoint by default
    // suppliers will override this (we assume backend has /supplier/orders)
    const ORDERS_URL = isSupplier
        ? 'https://swe-lab-1.onrender.com/supplier/orders/'
        : 'https://swe-lab-1.onrender.com/consumer/orders/';

    const [query, setQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    const [orders, setOrders] = useState([]);
    const [page, setPage] = useState(1);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loading, setLoading] = useState(true);

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    const PAGE_SIZE = 12;

    const fetchOrdersApi = useCallback(
        async ({ page = 1 } = {}) => {
            try {
                const token = await getToken();
                const headers = { Accept: 'application/json' };
                if (token) headers.Authorization = `Bearer ${token}`;

                const url = `${ORDERS_URL}?page=${page}&page_size=${PAGE_SIZE}`;
                const resp = await fetch(url, { headers });
                const text = await resp.text();
                let data = null;
                try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }

                if (!resp.ok) {
                    console.warn('orders fetch failed', resp.status, data ?? text);
                    throw new Error(data?.detail ?? data?.message ?? `Failed to fetch orders (status ${resp.status})`);
                }

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

    // load more
    const loadMore = useCallback(async () => {
        if (isLoadingMore) return;
        setIsLoadingMore(true);
        try {
            const nextPage = page + 1;
            const { items } = await fetchOrdersApi({ page: nextPage });
            if (items.length > 0) {
                setOrders(prev => [...prev, ...items]);
                setPage(nextPage);
            }
        } catch (err) {
            console.warn('loadMore error', err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [fetchOrdersApi, page, isLoadingMore]);

    // search & filter
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

    const onComplain = (order) => {
        router.push({
            pathname: '/consumer/complaints',
            params: { orderId: order.id, orderNumber: order.number ?? order.id },
        });
    };

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
                <TouchableOpacity
                    style={styles.headerAction}
                    onPress={() =>
                        fetchOrdersApi({ page: 1 })
                            .then(({ items }) => {
                                setOrders(items);
                                setPage(1);
                            })
                            .catch(err => Alert.alert('Error', err.message))
                    }
                >
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
                    ListFooterComponent={() =>
                        isLoadingMore ? <View style={styles.loadingMore}><ActivityIndicator size="small" /></View> : null
                    }
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
                />
            )}

            {/* Order Modal */}
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
                            <TouchableOpacity
                                style={styles.primaryBtn}
                                onPress={() => {
                                    Alert.alert('Support', 'Contact support flow not implemented');
                                }}
                            >
                                <Text style={styles.primaryBtnText}>Contact Support</Text>
                            </TouchableOpacity>

                            {/* ❗️ONLY CONSUMER CAN SEND COMPLAINTS */}
                            {!isSupplier && (
                                <TouchableOpacity
                                    style={[styles.primaryBtn, { backgroundColor: '#e74c3c', marginLeft: 8 }]}
                                    onPress={() => {
                                        closeOrder();
                                        onComplain(selectedOrder);
                                    }}
                                >
                                    <Text style={styles.primaryBtnText}>Complaint</Text>
                                </TouchableOpacity>
                            )}

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

// ------------------ STYLES ------------------
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: { fontSize: 20, fontWeight: '600' },
    headerAction: { padding: 6 },

    controls: { paddingHorizontal: 16, paddingBottom: 8 },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f1f1',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 8,
    },
    searchInput: { flex: 1, marginLeft: 6 },

    filtersRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
    },
    filterBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: '#eee',
        marginRight: 8,
        marginBottom: 6,
    },
    filterBtnActive: {
        backgroundColor: '#333',
    },
    filterText: { fontSize: 13, color: '#333' },
    filterTextActive: { color: '#fff' },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    flatContainer: { paddingBottom: 80 },
    flatEmptyContainer: { flexGrow: 1, justifyContent: 'center' },

    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    rowLeft: {},
    rowRight: { alignItems: 'flex-end' },

    orderNumber: { fontSize: 16, fontWeight: '500' },
    orderDate: { color: '#666', marginTop: 2 },
    orderTotal: { fontSize: 16, fontWeight: '500', marginBottom: 4 },

    statusChip: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 10,
        marginTop: 4,
    },
    statusText: { color: '#fff', fontSize: 12 },

    separator: { height: 1, backgroundColor: '#eee', marginLeft: 16 },

    empty: { alignItems: 'center', paddingTop: 80 },
    emptyText: { marginTop: 12, fontSize: 16, color: '#666' },
    emptySub: { marginTop: 4, fontSize: 13, color: '#aaa' },

    loadingMore: { paddingVertical: 20 },

    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    modalTitle: { fontSize: 18, fontWeight: '600' },
    modalBody: { padding: 16 },

    modalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    modalLabel: { fontSize: 14, color: '#666' },
    modalValue: { fontSize: 14, fontWeight: '500' },

    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    itemTitle: { fontSize: 14 },
    itemQty: { fontSize: 14 },
    itemPrice: { fontSize: 14, fontWeight: '500' },

    modalFooter: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderColor: '#eee',
    },
    primaryBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#333',
        borderRadius: 6,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    ghostBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#eee',
        borderRadius: 6,
    },
    ghostBtnText: {
        color: '#333',
        fontSize: 14,
        fontWeight: '600',
    },
});
