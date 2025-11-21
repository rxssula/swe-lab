// app/consumer/(tabs)/dashboard.js
import React, { useEffect, useState, useMemo } from "react";
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    RefreshControl,
    SafeAreaView,
    Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// --- Mock data (replace with real API) ---
const MOCK_ITEMS = Array.from({ length: 40 }).map((_, i) => ({
    id: String(i + 1),
    title: `Product ${i + 1}`,
    price: (Math.random() * 100).toFixed(2),
    unit: "kg",
    moq: Math.floor(Math.random() * 10) + 1,
    stock: Math.random() > 0.4, // true = available
    short: `Short description for product ${i + 1}`,
}));

export default function Dashboard() {
    const router = useRouter();

    // raw data & states
    const [items, setItems] = useState([]);
    const [query, setQuery] = useState("");
    const [displayQuery, setDisplayQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // modal
    const [selectedItem, setSelectedItem] = useState(null);

    // cart (local memory for now)
    const [cart, setCart] = useState([]);

    const openDetails = (item) => {
        setSelectedItem(item);
    };

    const addToCart = (product) => {
        setCart((prev) => {
            const exists = prev.find((p) => p.id === product.id);
            if (exists) {
                return prev.map((p) =>
                    p.id === product.id ? { ...p, qty: p.qty + 1 } : p
                );
            }
            return [...prev, { ...product, qty: 1 }];
        });

        alert("Added to cart!");
    };

    // Simulated API
    const fetchItems = async () => {
        setLoading(true);
        await new Promise((r) => setTimeout(r, 600));
        setItems(MOCK_ITEMS);
        setLoading(false);
    };

    useEffect(() => {
        fetchItems();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDisplayQuery(query.trim()), 300);
        return () => clearTimeout(t);
    }, [query]);

    const filtered = useMemo(() => {
        if (!displayQuery) return items;
        const q = displayQuery.toLowerCase();
        return items.filter(
            (it) =>
                it.title.toLowerCase().includes(q) ||
                it.short.toLowerCase().includes(q) ||
                it.price.toString().includes(q)
        );
    }, [items, displayQuery]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchItems();
        setRefreshing(false);
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => openDetails(item)}
            activeOpacity={0.8}
        >
            <View style={styles.cardLeft}>
                <View style={styles.thumbnail}>
                    <Text style={styles.thumbText}>{item.title.split(" ")[1]}</Text>
                </View>
            </View>

            <View style={styles.cardRight}>
                <Text style={styles.title}>{item.title}</Text>
                <Text numberOfLines={2} style={styles.short}>
                    {item.short}
                </Text>
                <View style={styles.row}>
                    <Text style={styles.price}>${item.price}</Text>
                    <TouchableOpacity
                        onPress={() => addToCart(item)}
                        style={styles.addBtn}
                    >
                        <Text style={styles.addText}>Add</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Catalog</Text>

                    {/* Cart button */}
                    <TouchableOpacity
                        onPress={() =>
                            router.push({
                                pathname: "/consumer/cart",
                                params: { cart: JSON.stringify(cart) },
                            })
                        }
                    >
                        <Ionicons name="cart-outline" size={28} color="#111" />
                        {cart.length > 0 && (
                            <View style={styles.cartBadge}>
                                <Text style={styles.cartBadgeText}>{cart.length}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={styles.searchWrap}>
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search products..."
                        style={styles.search}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                    />
                </View>

                {/* Content */}
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" />
                    </View>
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={(i) => i.id}
                        renderItem={renderItem}
                        contentContainerStyle={
                            filtered.length === 0 ? styles.flatEmpty : styles.flatList
                        }
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        ListEmptyComponent={
                            <View style={styles.center}>
                                <Text style={styles.emptyTitle}>No results</Text>
                                <Text style={styles.emptyText}>
                                    Try a different keyword or clear the search.
                                </Text>
                            </View>
                        }
                    />
                )}

                {/* PRODUCT DETAILS MODAL */}
                <Modal
                    visible={!!selectedItem}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setSelectedItem(null)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalBox}>
                            <Text style={styles.modalTitle}>{selectedItem?.title}</Text>

                            <Text style={styles.modalText}>Price: ${selectedItem?.price}</Text>
                            <Text style={styles.modalText}>Unit: {selectedItem?.unit}</Text>
                            <Text style={styles.modalText}>
                                MOQ: {selectedItem?.moq} {selectedItem?.unit}
                            </Text>
                            <Text style={[styles.modalText, { marginTop: 10 }]}>
                                Availability:{" "}
                                <Text style={{ fontWeight: "700" }}>
                                    {selectedItem?.stock ? "Available" : "Out of stock"}
                                </Text>
                            </Text>

                            <View style={{ flexDirection: "row", marginTop: 20 }}>
                                <TouchableOpacity
                                    style={[styles.addBtn, { flex: 1 }]}
                                    onPress={() => {
                                        addToCart(selectedItem);
                                        setSelectedItem(null);
                                    }}
                                >
                                    <Text style={styles.addText}>Add to Cart</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={() => setSelectedItem(null)}
                                style={{ marginTop: 14 }}
                            >
                                <Text style={{ textAlign: "center", color: "#6b7280" }}>
                                    Close
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
}

/* --- ORIGINAL STYLES + few additions --- */
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#fff" },
    container: { flex: 1, paddingHorizontal: 16 },

    headerRow: {
        paddingVertical: 14,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    headerTitle: { fontSize: 24, fontWeight: "700" },

    cartBadge: {
        position: "absolute",
        right: -6,
        top: -4,
        backgroundColor: "red",
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 10,
    },
    cartBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

    searchWrap: { marginBottom: 12 },
    search: {
        height: 44,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        paddingHorizontal: 12,
        backgroundColor: "#f8fafc",
    },

    flatList: { paddingBottom: 24 },
    flatEmpty: { flexGrow: 1, justifyContent: "center", alignItems: "center" },

    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
    emptyText: { fontSize: 14, color: "#6b7280" },

    card: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    cardLeft: { justifyContent: "center", alignItems: "center", marginRight: 12 },
    thumbnail: {
        width: 64,
        height: 64,
        borderRadius: 8,
        backgroundColor: "#eef2ff",
        justifyContent: "center",
        alignItems: "center",
    },
    thumbText: { fontWeight: "700", color: "#3730a3" },

    cardRight: { flex: 1, justifyContent: "space-between" },
    title: { fontSize: 16, fontWeight: "600" },
    short: { fontSize: 13, color: "#6b7280", marginTop: 6 },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 10,
    },
    price: { fontWeight: "700", color: "#111827" },

    addBtn: {
        backgroundColor: "#2563eb",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addText: { color: "#fff", fontWeight: "600", textAlign: "center" },

    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    modalBox: {
        width: "100%",
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 12,
    },
    modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 10 },
    modalText: { fontSize: 16, marginTop: 4 },
});
