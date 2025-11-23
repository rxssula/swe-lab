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

function SupplierDashboard({ token }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [query, setQuery] = useState("");
    const [displayQuery, setDisplayQuery] = useState("");
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [consumerRequests, setConsumerRequests] = useState([]);
    const [showRequestsModal, setShowRequestsModal] = useState(false);
    const [processingRequestId, setProcessingRequestId] = useState(null);

    const PRODUCTS_URL = "https://swe-lab-1.onrender.com/products/my-products";
    const CONSUMER_REQUESTS_URL = "https://swe-lab-1.onrender.com/links/requests";

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

    const handleAcceptRequest = async (requestId) => {
        if (!token || !requestId) return;

        setProcessingRequestId(requestId);
        try {
            const url = `https://swe-lab-1.onrender.com/links/requests/${requestId}/accept`;
            const resp = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });

            if (resp.ok) {
                Alert.alert("Success", "Connection request accepted!");
                await fetchConsumerRequests();
            } else {
                const text = await resp.text().catch(() => null);
                console.warn("Accept request failed", resp.status, text);
                Alert.alert("Error", "Failed to accept request.");
            }
        } catch (err) {
            console.error("Accept request error", err);
            Alert.alert("Network Error", "Could not accept request. Try again.");
        } finally {
            setProcessingRequestId(null);
        }
    };

    const handleRejectRequest = async (requestId) => {
        if (!token || !requestId) return;

        setProcessingRequestId(requestId);
        try {
            const url = `https://swe-lab-1.onrender.com/links/requests/${requestId}/reject`;
            const resp = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
            });
            console.log(resp)

            if (resp.ok) {
                Alert.alert("Success", "Connection request rejected.");
                await fetchConsumerRequests();
            } else {
                const text = await resp.text().catch(() => null);
                console.warn("Reject request failed", resp.status, text);
                Alert.alert("Error", "Failed to reject request.");
            }
        } catch (err) {
            console.error("Reject request error", err);
            Alert.alert("Network Error", "Could not reject request. Try again.");
        } finally {
            setProcessingRequestId(null);
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!token || !productId) return;

        Alert.alert(
            "Delete Product",
            "Are you sure you want to delete this product? This action cannot be undone.",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const url = `https://swe-lab-1.onrender.com/products/${productId}`;
                            const resp = await fetch(url, {
                                method: "DELETE",
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                    Accept: "application/json",
                                },
                            });

                            if (resp.ok) {
                                Alert.alert("Success", "Product deleted successfully!");
                                setProducts(prev => prev.filter(p => p.id !== productId));
                                setSelectedProduct(null);
                            } else {
                                const text = await resp.text().catch(() => null);
                                console.warn("Delete product failed", resp.status, text);
                                Alert.alert("Error", "Failed to delete product.");
                            }
                        } catch (err) {
                            console.error("Delete product error", err);
                            Alert.alert("Network Error", "Could not delete product. Try again.");
                        }
                    },
                },
            ]
        );
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

    const renderProduct = ({ item }) => {
        console.log(item);
        return (
        
        <TouchableOpacity
            style={styles.card}
            onPress={() => setSelectedProduct(item)}
        >
            <Text style={styles.title}>{item.name}</Text>
            <Text style={{ color: "#6b7280", marginTop: 6 }}>
                Quantity: {item.quantity} | Price: {item.price}
            </Text>
        </TouchableOpacity>
    )};

    const renderConsumerRequest = ({ item }) => {
        const isProcessing = processingRequestId === item.id;
        const requestDate = item.requested_at
            ? new Date(item.requested_at).toLocaleDateString()
            : "N/A";

        return (
            <View style={styles.consumerCard} key={item.id}>
                <Text style={{ fontWeight: "600", fontSize: 16 }}>
                    {item.consumer_name || "Unknown Consumer"}
                </Text>
                <Text style={{ color: "#6b7280", marginTop: 4 }}>
                    Status: {item.status}
                </Text>
                <Text style={{ color: "#6b7280", marginTop: 2 }}>
                    Requested: {requestDate}
                </Text>

                <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
                    <TouchableOpacity
                        style={[styles.acceptBtn, isProcessing && { opacity: 0.5 }]}
                        onPress={() => handleAcceptRequest(item.id)}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={{ color: "#fff", fontWeight: "600" }}>Accept</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.rejectBtn, isProcessing && { opacity: 0.5 }]}
                        onPress={() => handleRejectRequest(item.id)}
                        disabled={isProcessing}
                    >
                        <Text style={{ color: "#fff", fontWeight: "600" }}>Reject</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView contentContainerStyle={{ padding: 12  }}>
                <Text style={styles.headerTitle}>Supplier Dashboard</Text>

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
                        {consumerRequests.filter(r => r.status === 'pending').length > 0 && (
                            <View style={styles.badge}>
                                <Text style={{ color: "#fff", fontSize: 12 }}>{consumerRequests.filter(r => r.status === 'pending').length}</Text>
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

                <Modal
                    visible={!!selectedProduct}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setSelectedProduct(null)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalBox}>
                            <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
                            <Text style={styles.modalText}>Category: {selectedProduct?.category_name}</Text>
                            <Text style={styles.modalText}>Stock level: {selectedProduct?.stock_level}</Text>
                            <Text style={styles.modalText}>MOQ: {selectedProduct?.minimum_order_quantity}</Text>
                            <Text style={styles.modalText}>Price per unit: {selectedProduct?.price_per_unit}</Text>

                            <TouchableOpacity
                                style={[styles.deleteBtn, { marginTop: 20 }]}
                                onPress={() => handleDeleteProduct(selectedProduct?.id)}
                            >
                                <Text style={styles.connectText}>Delete</Text>
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
                                {consumerRequests.filter(r => r.status === 'pending').length === 0 ? (
                                    <Text style={{ color: "#6b7280" }}>No pending requests.</Text>
                                ) : (
                                    consumerRequests.filter(r => r.status === 'pending').map((item) => renderConsumerRequest({ item }))
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

function ConsumerDashboard({ token }) {
  const router = useRouter();

  const COMPANIES_URL = "https://swe-lab-1.onrender.com/suppliers/search"; 
  const CONNECT_URL = "https://swe-lab-1.onrender.com/links/request";

  const [companies, setCompanies] = useState([]); 
  const [query, setQuery] = useState("");
  const [displayQuery, setDisplayQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [sendingConnect, setSendingConnect] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDisplayQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const doSearch = async () => {
      if (!displayQuery) {
        setCompanies([]);
        return;
      }
      if (!token) {
        Alert.alert("Auth", "You must be logged in to search.");
        return;
      }

      setLoading(true);
      try {
        const headers = { Accept: "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const url = `${COMPANIES_URL}?search=${encodeURIComponent(displayQuery)}`;
        const resp = await fetch(url, { headers });
        const text = await resp.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch {}

        if (!resp.ok) {
          console.warn("Search error", resp.status, data ?? text);
          Alert.alert("Error", "Search failed.");
          setCompanies([]);
          return;
        }

        if (Array.isArray(data)) {
          const mapped = data.map((c) => ({
            id: c.supplier_id ?? c.id ?? null,
            name: c.business_name ?? c.name ?? "—",
            type: c.business_type ?? "",
            city: c.city ?? "",
            country: c.country ?? "",
            productsInCategory: c.product_count_in_category ?? 0,
            totalActive: c.total_active_products ?? 0,
            is_linked: !!c.is_linked,
            link_status: c.link_status ?? null,
            raw: c,
          })).filter(Boolean);
          setCompanies(mapped);
        } else {
          setCompanies([]);
        }
      } catch (err) {
        console.error("searchCompanies error", err);
        Alert.alert("Network error", "Failed to search companies. Check your connection.");
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    };

    doSearch();
  }, [displayQuery, token]);

  const onRefresh = async () => {
    if (!displayQuery) return;
    setRefreshing(true);
    try {
      const headers = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const url = `${COMPANIES_URL}?search=${encodeURIComponent(displayQuery)}`;
      const resp = await fetch(url, { headers });
      const data = await resp.json().catch(() => null);
      if (Array.isArray(data)) {
        const mapped = data.map((c) => ({
          id: c.supplier_id ?? c.id ?? null,
          name: c.business_name ?? c.name ?? "—",
          type: c.business_type ?? "",
          city: c.city ?? "",
          country: c.country ?? "",
          productsInCategory: c.product_count_in_category ?? 0,
          totalActive: c.total_active_products ?? 0,
          is_linked: !!c.is_linked,
          link_status: c.link_status ?? null,
          raw: c,
        })).filter(Boolean);
        setCompanies(mapped);
      } else {
        setCompanies([]);
      }
    } catch (err) {
      console.error("refresh error", err);
      Alert.alert("Network error", "Failed to refresh results.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleConnect = async (company) => {
    if (!token) {
      Alert.alert("Auth", "Please login to send connect requests.");
      return;
    }
    if (!company?.id) {
      Alert.alert("Error", "Invalid company selected.");
      return;
    }

    setSendingConnect(true);
    try {
      const resp = await fetch(CONNECT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ supplier_id: company.id }),
      });
      if (resp.ok) {
        Alert.alert("Request Sent", "Your connection request was sent.");
        setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, is_linked: true } : c));
      } else {
        const text = await resp.text().catch(() => null);
        console.warn("connect failed", resp.status, text);
        Alert.alert("Failed", "Could not send request.");
      }
    } catch (err) {
      console.error("connect error", err);
      Alert.alert("Network Error", "Try again.");
    } finally {
      setSendingConnect(false);
    }
  };

  const renderCompany = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelectedCompany(item)} activeOpacity={0.85}>
      <Text style={styles.title}>{item.name}</Text>
      <Text style={{ color: "#6b7280", marginTop: 6 }}>{item.type} • {item.city}{item.country ? `, ${item.country}` : ""}</Text>
      <Text style={{ color: "#6b7280", marginTop: 6 }}>Products in category: {item.productsInCategory} • Active products: {item.totalActive}</Text>

      <TouchableOpacity
        style={[styles.connectBtn, { marginTop: 12 }]}
        onPress={() => handleConnect(item)}
        disabled={sendingConnect || item.is_linked}
      >
        <Text style={styles.connectText}>{item.is_linked ? (item.link_status || "Linked") : "Connect"}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={{ padding: 16 }}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Companies</Text>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => setDisplayQuery(prev => prev)} style={{ marginRight: 18 }}>
              <Ionicons name="refresh-outline" size={24} color="#111" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/components/cart")}>
              <Ionicons name="cart-outline" size={26} color="#111" />
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search companies by name, city or product..."
          style={styles.search}
        />

        {loading ? (
          <View style={{ marginTop: 24 }}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FlatList
            data={companies}
            keyExtractor={(i) => String(i.id)}
            renderItem={renderCompany}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={companies.length === 0 ? styles.flatEmpty : { paddingVertical: 10 }}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyTitle}>No companies found</Text>
                <Text style={styles.emptyText}>Try a different keyword.</Text>
              </View>
            }
          />
        )}

        <Modal visible={!!selectedCompany} transparent animationType="slide" onRequestClose={() => setSelectedCompany(null)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>{selectedCompany?.name}</Text>
              <Text style={styles.modalText}>{selectedCompany?.type}</Text>
              <Text style={styles.modalText}>City: {selectedCompany?.city}</Text>
              <Text style={styles.modalText}>Active products: {selectedCompany?.totalActive}</Text>

              <View style={{ flexDirection: "row", marginTop: 18 }}>
                <TouchableOpacity
                  style={[styles.connectBtn, { flex: 1 }]}
                  onPress={() => {
                    handleConnect(selectedCompany);
                    setSelectedCompany(null);
                  }}
                >
                  <Text style={styles.connectText}>{selectedCompany?.is_linked ? (selectedCompany?.link_status || "Linked") : "Connect"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ flex: 1, marginLeft: 8, justifyContent: "center", alignItems: "center" }} onPress={() => setSelectedCompany(null)}>
                  <Text style={{ color: "#6b7280" }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

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
    acceptBtn: {
        flex: 1,
        backgroundColor: "#10b981",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 40,
    },
    rejectBtn: {
        flex: 1,
        backgroundColor: "#ef4444",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    deleteBtn: {
        backgroundColor: "#ef4444",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: "center",
    },
});
