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

// helper to capitalize status from API (pending -> Pending)
function capitalizeStatus(status) {
    if (!status) return 'Pending';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

const STATUS_COLOR = {
    Pending: '#ffb74d',
    Accepted: '#64b5f6',
    Processing: '#64b5f6',
    Shipped: '#4db6ac',
    Delivered: '#81c784',
    Canceled: '#e57373',
    Cancelled: '#e57373', // API might return "cancelled"
    Completed: '#81c784',
    Rejected: '#e57373',
};

export default function Orders() {
    const router = useRouter();

    // get auth data
    const auth = useAuth();
    const userType = auth?.user?.userType?.toLowerCase() ?? "consumer";
    const isSupplier = userType === "supplier";

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

    // Use the correct endpoints
    const ORDERS_URL = isSupplier
        ? 'https://swe-lab-1.onrender.com/orders/supplier/incoming'
        : 'https://swe-lab-1.onrender.com/orders/consumer/history';

    const [query, setQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    const [orders, setOrders] = useState([]);
    const [page, setPage] = useState(1);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loading, setLoading] = useState(true);

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [processingOrderId, setProcessingOrderId] = useState(null);

    const PAGE_SIZE = 12;

    const fetchOrdersApi = useCallback(
        async ({ page = 1 } = {}) => {
            try {
                const token = await getToken();
                const headers = { Accept: 'application/json' };
                if (token) headers.Authorization = `Bearer ${token}`;

                const url = `${ORDERS_URL}`;
                console.log('Fetching orders from:', url);
                const resp = await fetch(url, { headers });
                console.log('Response status:', resp.status);
                const text = await resp.text();
                console.log('Response text:', text.substring(0, 200));
                let data = null;
                try { data = text ? JSON.parse(text) : null; } catch (e) {
                    console.error('JSON parse error:', e);
                    data = null;
                }

                if (!resp.ok) {
                    console.warn('orders fetch failed', resp.status, data ?? text);
                    throw new Error(data?.detail ?? data?.message ?? `Failed to fetch orders (status ${resp.status})`);
                }

                // Map API response to UI format
                let orders = [];
                if (Array.isArray(data)) {
                    orders = data.map(order => ({
                        id: order.id,
                        number: order.id, // API doesn't provide order number, use id
                        date: order.created_at,
                        total: parseFloat(order.total_amount || 0).toFixed(2),
                        status: capitalizeStatus(order.status),
                        items: Array.isArray(order.items) ? order.items.map(item => ({
                            id: item.id || item.product_id,
                            title: item.product_name || item.name || 'Product',
                            qty: item.quantity || 1,
                            price: parseFloat(item.price_per_unit || item.price || 0).toFixed(2),
                        })) : [],
                        shippingAddress: order.delivery_notes || '—',
                        delivery_option: order.delivery_option,
                        supplier_id: order.supplier_id,
                        consumer_id: order.consumer_id,
                        rejection_reason: order.rejection_reason,
                    }));
                    return { items: orders, hasMore: data.length === PAGE_SIZE };
                } else if (data && Array.isArray(data.results)) {
                    orders = data.results.map(order => ({
                        id: order.id,
                        number: order.id,
                        date: order.created_at,
                        total: parseFloat(order.total_amount || 0).toFixed(2),
                        status: capitalizeStatus(order.status),
                        items: Array.isArray(order.items) ? order.items.map(item => ({
                            id: item.id || item.product_id,
                            title: item.product_name || item.name || 'Product',
                            qty: item.quantity || 1,
                            price: parseFloat(item.price_per_unit || item.price || 0).toFixed(2),
                        })) : [],
                        shippingAddress: order.delivery_notes || '—',
                        delivery_option: order.delivery_option,
                        supplier_id: order.supplier_id,
                        consumer_id: order.consumer_id,
                        rejection_reason: order.rejection_reason,
                    }));
                    return { items: orders, hasMore: !!data.next };
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

    // Supplier actions: accept, reject, complete
    const handleAcceptOrder = async (orderId) => {
        if (!tokenFromContext || !orderId) return;
        setProcessingOrderId(orderId);
        try {
            const resp = await fetch(`https://swe-lab-1.onrender.com/orders/${orderId}/accept`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${tokenFromContext}`,
                    Accept: 'application/json',
                },
            });

            if (resp.ok) {
                Alert.alert('Success', 'Order accepted!');
                await onRefresh();
            } else {
                const text = await resp.text().catch(() => null);
                console.warn('Accept order failed', resp.status, text);
                Alert.alert('Error', 'Failed to accept order.');
            }
        } catch (err) {
            console.error('Accept order error', err);
            Alert.alert('Network Error', 'Could not accept order. Try again.');
        } finally {
            setProcessingOrderId(null);
        }
    };

    const handleRejectOrder = async (orderId) => {
        if (!tokenFromContext || !orderId) return;

        Alert.alert(
            'Reject Order',
            'Are you sure you want to reject this order?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessingOrderId(orderId);
                        try {
                            const resp = await fetch(`https://swe-lab-1.onrender.com/orders/${orderId}/reject`, {
                                method: 'POST',
                                headers: {
                                    Authorization: `Bearer ${tokenFromContext}`,
                                    Accept: 'application/json',
                                },
                            });

                            if (resp.ok) {
                                Alert.alert('Success', 'Order rejected.');
                                await onRefresh();
                            } else {
                                const text = await resp.text().catch(() => null);
                                console.warn('Reject order failed', resp.status, text);
                                Alert.alert('Error', 'Failed to reject order.');
                            }
                        } catch (err) {
                            console.error('Reject order error', err);
                            Alert.alert('Network Error', 'Could not reject order. Try again.');
                        } finally {
                            setProcessingOrderId(null);
                        }
                    },
                },
            ]
        );
    };

    const handleCompleteOrder = async (orderId) => {
        if (!tokenFromContext || !orderId) return;

        Alert.alert(
            'Complete Order',
            'Mark this order as completed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Complete',
                    onPress: async () => {
                        setProcessingOrderId(orderId);
                        try {
                            const resp = await fetch(`https://swe-lab-1.onrender.com/orders/${orderId}/complete`, {
                                method: 'POST',
                                headers: {
                                    Authorization: `Bearer ${tokenFromContext}`,
                                    Accept: 'application/json',
                                },
                            });

                            if (resp.ok) {
                                Alert.alert('Success', 'Order completed!');
                                await onRefresh();
                            } else {
                                const text = await resp.text().catch(() => null);
                                console.warn('Complete order failed', resp.status, text);
                                Alert.alert('Error', 'Failed to complete order.');
                            }
                        } catch (err) {
                            console.error('Complete order error', err);
                            Alert.alert('Network Error', 'Could not complete order. Try again.');
                        } finally {
                            setProcessingOrderId(null);
                        }
                    },
                },
            ]
        );
    };

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
        const orderId = (order.number ?? order.id ?? '').toString().substring(0, 5).toUpperCase();
        return (
            <TouchableOpacity style={styles.row} onPress={() => onPress(order)}>
                <View style={styles.rowLeft}>
                    <Text style={styles.orderNumber}>#{orderId}</Text>
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
                <Text style={styles.headerTitle}>
                    {isSupplier ? 'Incoming Orders' : 'Order History'}
                </Text>
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
                    {(isSupplier
                        ? ['All', 'Pending', 'Accepted', 'Completed', 'Rejected']
                        : ['All', 'Pending', 'Processing', 'Completed', 'Cancelled', 'Rejected']
                    ).map((s) => (
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
                            <Text style={styles.modalTitle}>
                                Order #{((selectedOrder?.number ?? selectedOrder?.id ?? '').toString().substring(0, 5).toUpperCase())}
                            </Text>
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

                            {selectedOrder?.delivery_option && (
                                <View style={styles.modalRow}>
                                    <Text style={styles.modalLabel}>Delivery Option</Text>
                                    <Text style={styles.modalValue}>{selectedOrder.delivery_option}</Text>
                                </View>
                            )}

                            <View style={{ marginTop: 12 }}>
                                <Text style={[styles.modalLabel, { marginBottom: 8 }]}>Items</Text>
                                {(selectedOrder?.items ?? []).length === 0 ? (
                                    <Text style={styles.modalValue}>No items listed</Text>
                                ) : (
                                    (selectedOrder?.items ?? []).map((it, index) => (
                                        <View key={`item-${index}-${it.id}`} style={styles.itemRow}>
                                            <Text style={styles.itemTitle}>{it.title}</Text>
                                            <Text style={styles.itemQty}>x{it.qty}</Text>
                                            <Text style={styles.itemPrice}>${Number(it.price).toFixed(2)}</Text>
                                        </View>
                                    ))
                                )}
                            </View>

                            <View style={{ marginTop: 12 }}>
                                <Text style={styles.modalLabel}>Delivery Notes</Text>
                                <Text style={styles.modalValue}>{selectedOrder?.shippingAddress ?? selectedOrder?.shipping_address ?? '—'}</Text>
                            </View>

                            {selectedOrder?.rejection_reason && (
                                <View style={{ marginTop: 12 }}>
                                    <Text style={styles.modalLabel}>Rejection Reason</Text>
                                    <Text style={[styles.modalValue, { color: '#e57373' }]}>{selectedOrder.rejection_reason}</Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            {isSupplier ? (
                                // Supplier action buttons based on order status
                                <>
                                    {selectedOrder?.status === 'Pending' && (
                                        <>
                                            <TouchableOpacity
                                                style={[styles.primaryBtn, { backgroundColor: '#10b981' }]}
                                                onPress={() => {
                                                    closeOrder();
                                                    handleAcceptOrder(selectedOrder.id);
                                                }}
                                                disabled={processingOrderId === selectedOrder?.id}
                                            >
                                                {processingOrderId === selectedOrder?.id ? (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                ) : (
                                                    <Text style={styles.primaryBtnText}>Accept</Text>
                                                )}
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.primaryBtn, { backgroundColor: '#ef4444', marginLeft: 8 }]}
                                                onPress={() => {
                                                    closeOrder();
                                                    handleRejectOrder(selectedOrder.id);
                                                }}
                                                disabled={processingOrderId === selectedOrder?.id}
                                            >
                                                <Text style={styles.primaryBtnText}>Reject</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}

                                    {selectedOrder?.status === 'Accepted' && (
                                        <TouchableOpacity
                                            style={[styles.primaryBtn, { backgroundColor: '#2563eb' }]}
                                            onPress={() => {
                                                closeOrder();
                                                handleCompleteOrder(selectedOrder.id);
                                            }}
                                            disabled={processingOrderId === selectedOrder?.id}
                                        >
                                            {processingOrderId === selectedOrder?.id ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text style={styles.primaryBtnText}>Mark as Complete</Text>
                                            )}
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity style={[styles.ghostBtn, { marginLeft: 8 }]} onPress={closeOrder}>
                                        <Text style={styles.ghostBtnText}>Close</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                // Consumer buttons
                                <>
                                    <TouchableOpacity
                                        style={styles.primaryBtn}
                                        onPress={() => {
                                            Alert.alert('Support', 'Contact support flow not implemented');
                                        }}
                                    >
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
                                </>
                            )}
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
