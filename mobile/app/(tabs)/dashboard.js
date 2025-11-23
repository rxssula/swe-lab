// app/(tabs)/dashboard.js
import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    RefreshControl,
    Modal,
    Alert,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
    const auth = useAuth();
    const userType = auth?.user?.userType?.toLowerCase() || "consumer";

    if (userType === "supplier") return <SupplierDashboard token={auth.token} />;
    return <ConsumerDashboard token={auth.token} />;
}

/* ============================================================
   =================== SUPPLIER DASHBOARD ======================
   ============================================================ */

function SupplierDashboard({ token }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [query, setQuery] = useState("");
    const [displayQuery, setDisplayQuery] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [consumerRequests, setConsumerRequests] = useState([]);
    const [showRequestsModal, setShowRequestsModal] = useState(false);

    const PRODUCTS_URL = "https://swe-lab-1.onrender.com/supplier/products/";
    const CONSUMER_REQUESTS_URL = "https://swe-lab-1.onrender.com/supplier/consumer-requests/";

    const fetchProducts = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const resp = await fetch(PRODUCTS_URL, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            });
            const text = await resp.text();
            let data = null;
            try { data = text ? JSON.parse(text) : []; } catch {}
            if (resp.ok) setProducts(Array.isArray(data) ? data : []);
            else setProducts([]);
        } catch (err) {
            console.error(err);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchConsumerRequests = async () => {
        if (!token) return;
        try {
            const resp = await fetch(CONSUMER_REQUESTS_URL, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            });
            const text = await resp.text();
            let data = null;
            try { data = text ? JSON.parse(text) : []; } catch {}
            if (resp.ok) setConsumerRequests(Array.isArray(data) ? data : []);
            else setConsumerRequests([]);
        } catch (err) {
            console.error(err);
            setConsumerRequests([]);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchConsumerRequests();
    }, [token]);

    useEffect(() => {
        const t = setTimeout(() => setDisplayQuery(query.trim()), 300);
        return () => clearTimeout(t);
    }, [query]);

    const filteredProducts = useMemo(() => {
        if (!displayQuery) return products;
        const q = displayQuery.toLowerCase();
        return products.filter(
            (p) =>
                (p.name ?? "").toLowerCase().includes(q) ||
                (p.category ?? "").toLowerCase().includes(q)
        );
    }, [products, displayQuery]);

    const renderProduct = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => setSelectedProduct(item)}
        >
            <Text style={styles.title}>{item.name}</Text>
            <Text style={{ color: "#6b7280", marginTop: 6 }}>
                Quantity: {item.quantity} | Price: {item.price}
            </Text>
        </TouchableOpacity>
    );

    const renderConsumerRequest = ({ item }) => (
        <View style={styles.consumerCard} key={item.id}>
            <Text style={{ fontWeight: "600", fontSize: 16 }}>{item.name}</Text>
            <Text style={{ color: "#6b7280" }}>{item.description}</Text>
            {item.products?.map((p) => (
                <Text key={p.id} style={{ color: "#374151", marginTop: 4 }}>
                    {p.name} - Qty: {p.quantity}, Total: {p.totalPrice}, Date: {p.date}
                </Text>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={{ padding: 12  }}>
                <Text style={styles.headerTitle}>Supplier Dashboard</Text>


                {/* Search & Requests */}
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search by name or category..."
                        style={[styles.search, { flex: 1 }]}
                    />
                    <TouchableOpacity
                        style={{ marginLeft: 12 }}
                        onPress={() => setShowRequestsModal(true)}
                    >
                        <Ionicons name="people-outline" size={28} color="#111" />
                        {consumerRequests.length > 0 && (
                            <View style={styles.badge}>
                                <Text style={{ color: "#fff", fontSize: 12 }}>{consumerRequests.length}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" />
                ) : filteredProducts.length === 0 ? (
                    <Text style={{ color: "#6b7280" }}>No products found.</Text>
                ) : (
                    <FlatList
                        data={filteredProducts}
                        keyExtractor={(i) => String(i.id)}
                        renderItem={renderProduct}
                        scrollEnabled={false}
                    />
                )}

                {/* Product Modal */}
                <Modal
                    visible={!!selectedProduct}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setSelectedProduct(null)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalBox}>
                            <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
                            <Text style={styles.modalText}>Category: {selectedProduct?.category}</Text>
                            <Text style={styles.modalText}>Quantity: {selectedProduct?.quantity}</Text>
                            <Text style={styles.modalText}>MOQ: {selectedProduct?.minOrderQuantity}</Text>
                            <Text style={styles.modalText}>Price: {selectedProduct?.price}</Text>

                            <TouchableOpacity
                                style={[styles.connectBtn, { marginTop: 20 }]}
                                onPress={() => {
                                    Alert.alert("Edit Product", "Here you can implement editing logic.");
                                    setSelectedProduct(null);
                                }}
                            >
                                <Text style={styles.connectText}>Edit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{ marginTop: 12, alignSelf: "center" }}
                                onPress={() => setSelectedProduct(null)}
                            >
                                <Text style={{ color: "#6b7280" }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Consumer Requests Modal */}
                <Modal
                    visible={showRequestsModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowRequestsModal(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={[styles.modalBox, { maxHeight: "80%" }]}>
                            <Text style={styles.modalTitle}>Consumer Requests</Text>
                            <ScrollView style={{ marginTop: 12 }}>
                                {consumerRequests.length === 0 ? (
                                    <Text style={{ color: "#6b7280" }}>No requests yet.</Text>
                                ) : (
                                    consumerRequests.map(renderConsumerRequest)
                                )}
                            </ScrollView>

                            <TouchableOpacity
                                style={{ marginTop: 12, alignSelf: "center" }}
                                onPress={() => setShowRequestsModal(false)}
                            >
                                <Text style={{ color: "#6b7280" }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </SafeAreaView>
    );
}

/* ============================================================
   =================== CONSUMER DASHBOARD ======================
   ============================================================ */

// Keep your existing ConsumerDashboard function as-is
function ConsumerDashboard({ token }) {
    const router = useRouter();

    const COMPANIES_URL = "https://swe-lab-1.onrender.com/consumer/companies/";
    const CONNECT_URL = "https://swe-lab-1.onrender.com/consumer/connect/";

    const [companies, setCompanies] = useState([]);
    const [query, setQuery] = useState("");
    const [displayQuery, setDisplayQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [sendingConnect, setSendingConnect] = useState(false);

    const fetchCompanies = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const headers = { Accept: "application/json" };
            if (token) headers.Authorization = `Bearer ${token}`;

            const resp = await fetch(COMPANIES_URL, { headers });
            const text = await resp.text();
            let data = null;
            try {
                data = text ? JSON.parse(text) : null;
            } catch {}

            if (resp.ok) {
                if (Array.isArray(data)) setCompanies(data);
                else if (data?.results) setCompanies(data.results);
                else setCompanies([]);
            } else {
                setCompanies([]);
            }
        } catch {
            setCompanies([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, [token]);

    useEffect(() => {
        const t = setTimeout(() => setDisplayQuery(query.trim()), 300);
        return () => clearTimeout(t);
    }, [query]);

    const filtered = useMemo(() => {
        if (!displayQuery) return companies;
        const q = displayQuery.toLowerCase();
        return companies.filter((c) => {
            const name = (c.name ?? c.company_name ?? "").toLowerCase();
            const desc = (c.description ?? c.short ?? "").toLowerCase();
            return name.includes(q) || desc.includes(q);
        });
    }, [companies, displayQuery]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchCompanies();
        setRefreshing(false);
    };

    const handleConnect = async (company) => {
        if (!token) return;
        setSendingConnect(true);
        try {
            const resp = await fetch(CONNECT_URL, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ company_id: company.id }),
            });
            if (resp.ok) {
                Alert.alert("Request Sent", "Your connection request was sent.");
            } else {
                Alert.alert("Failed", "Could not send request.");
            }
        } catch (err) {
            Alert.alert("Network Error", "Try again.");
        } finally {
            setSendingConnect(false);
        }
    };

    const renderCompany = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => setSelectedCompany(item)}>
            <Text style={styles.title}>{item.name ?? item.company_name}</Text>
            <Text style={{ color: "#6b7280", marginTop: 6 }}>
                {item.description ?? item.short}
            </Text>

            <TouchableOpacity
                style={[styles.connectBtn, { marginTop: 12 }]}
                onPress={() => handleConnect(item)}
            >
                <Text style={styles.connectText}>Connect</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <View style={{ padding: 16 }}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Companies</Text>
                    <TouchableOpacity onPress={fetchCompanies}>
                        <Ionicons name="refresh-outline" size={24} color="#111" />
                    </TouchableOpacity>
                </View>

                <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search..."
                    style={styles.search}
                />

                {loading ? (
                    <ActivityIndicator size="large" />
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={(i) => String(i.id)}
                        renderItem={renderCompany}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                        contentContainerStyle={{ paddingVertical: 10 }}
                    />
                )}

                {/* MODAL */}
                <Modal
                    visible={!!selectedCompany}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setSelectedCompany(null)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalBox}>
                            <Text style={styles.modalTitle}>
                                {selectedCompany?.name ?? selectedCompany?.company_name}
                            </Text>
                            <Text style={styles.modalText}>
                                {selectedCompany?.description ?? selectedCompany?.short}
                            </Text>

                            <TouchableOpacity
                                style={[styles.connectBtn, { marginTop: 20 }]}
                                onPress={() => {
                                    handleConnect(selectedCompany);
                                    setSelectedCompany(null);
                                }}
                            >
                                <Text style={styles.connectText}>Connect</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{ marginTop: 12, alignSelf: "center" }}
                                onPress={() => setSelectedCompany(null)}
                            >
                                <Text style={{ color: "#6b7280" }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
}

/* ============================================================
   ========================== STYLES ===========================
   ============================================================ */

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#fff" },
    headerTitle: { fontSize: 24, fontWeight: "700" },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    search: {
        height: 44,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        backgroundColor: "#f8fafc",
        borderRadius: 10,
        paddingHorizontal: 12,
        marginBottom: 10,
    },
    card: {
        padding: 14,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 10,
        marginBottom: 12,
        backgroundColor: "#fff",
    },
    title: { fontSize: 16, fontWeight: "600" },
    connectBtn: {
        backgroundColor: "#10b981",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    connectText: { color: "#fff", fontWeight: "600" },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: "center",
        padding: 20,
    },
    modalBox: { backgroundColor: "#fff", padding: 20, borderRadius: 12 },
    modalTitle: { fontSize: 20, fontWeight: "700" },
    modalText: { fontSize: 14, color: "#6b7280", marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 20, marginBottom: 10 },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 10,
        backgroundColor: "#f3f4f6",
        marginBottom: 12,
    },
    actionText: { marginLeft: 10, fontSize: 16, fontWeight: "500" },
    consumerCard: {
        padding: 14,
        backgroundColor: "#fff",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        marginBottom: 10,
    },
    smallBtn: {
        marginTop: 10,
        alignSelf: "flex-start",
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: "#3b82f6",
        borderRadius: 8,
    },
    smallBtnText: { color: "#fff", fontWeight: "600" },
    badge: {
        position: "absolute",
        top: -6,
        right: -6,
        backgroundColor: "#ef4444",
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: "center",
        alignItems: "center",
    },
});
