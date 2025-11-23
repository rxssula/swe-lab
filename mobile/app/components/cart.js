import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useFocusEffect } from '@react-navigation/native';

export default function Cart() {
    const { token } = useAuth();
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [checkoutVisible, setCheckoutVisible] = useState(false);
    const [viewMode, setViewMode] = useState('browse'); // 'browse' or 'cart'
    const [deliveryOption, setDeliveryOption] = useState("DELIVERY");
    const [deliveryNotes, setDeliveryNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Fetch products from linked suppliers
    const fetchProducts = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const resp = await fetch('https://swe-lab-1.onrender.com/products/catalog/browse', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            console.log('Fetch products response status:', resp.status);

            if (!resp.ok) {
                const errorText = await resp.text().catch(() => 'Unknown error');
                console.error('Fetch products failed:', resp.status, errorText);
                throw new Error(`Failed to fetch products: ${resp.status} - ${errorText}`);
            }

            const text = await resp.text();
            console.log('Raw response:', text);

            let data = null;
            try {
                data = text ? JSON.parse(text) : [];
            } catch (parseErr) {
                console.error('JSON parse error:', parseErr);
                data = [];
            }

            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching products:', err);
            Alert.alert('Error', err.message || 'Failed to load products');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useFocusEffect(
        useCallback(() => {
            fetchProducts();
        }, [fetchProducts])
    );

    // Add product to cart
    const addToCart = (product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
        Alert.alert('Added', `${product.name} added to cart`);
    };

    // Update quantity in cart
    const updateQuantity = (productId, delta) => {
        setCart((prev) =>
            prev
                .map((item) =>
                    item.id === productId
                        ? { ...item, quantity: Math.max(item.minimum_order_quantity || 1, item.quantity + delta) }
                        : item
                )
                .filter((item) => item.quantity > 0)
        );
    };

    // Remove item from cart
    const removeFromCart = (productId) => {
        setCart((prev) => prev.filter((item) => item.id !== productId));
    };

    // Group cart items by supplier
    const cartBySupplier = cart.reduce((acc, item) => {
        const supplierId = item.supplier_id;
        if (!acc[supplierId]) {
            acc[supplierId] = {
                supplier_id: supplierId,
                supplier_name: item.supplier_name,
                items: [],
            };
        }
        acc[supplierId].items.push(item);
        return acc;
    }, {});

    const suppliers = Object.values(cartBySupplier);

    // Calculate total
    const calculateTotal = () => {
        return cart.reduce((sum, item) => {
            const price = parseFloat(item.price_per_unit) || 0;
            return sum + price * item.quantity;
        }, 0);
    };

    // Submit order for each supplier
    const submitOrders = async () => {
        if (cart.length === 0) {
            Alert.alert('Empty Cart', 'Your cart is empty');
            return;
        }

        if (!deliveryOption) {
            Alert.alert('Missing Info', 'Please select a delivery option');
            return;
        }

        setSubmitting(true);
        try {
            // Create an order for each supplier
            const orderPromises = suppliers.map(async (supplier) => {
                const orderData = {
                    delivery_notes: deliveryNotes || '',
                    delivery_option: deliveryOption,
                    supplier_id: supplier.supplier_id,
                    items: supplier.items.map((item) => ({
                        product_id: item.id,
                        quantity: item.quantity,
                    })),
                };

                const resp = await fetch('https://swe-lab-1.onrender.com/orders/', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    body: JSON.stringify(orderData),
                });

                if (!resp.ok) {
                    const errorText = await resp.text();
                    throw new Error(`Order failed for ${supplier.supplier_name}: ${errorText}`);
                }

                return await resp.json();
            });

            await Promise.all(orderPromises);

            Alert.alert(
                'Success!',
                `${suppliers.length} order${suppliers.length > 1 ? 's' : ''} placed successfully`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setCart([]);
                            setCheckoutVisible(false);
                            setDeliveryNotes('');
                            setViewMode('browse');
                        },
                    },
                ]
            );
        } catch (err) {
            console.error('Error submitting orders:', err);
            Alert.alert('Error', err.message || 'Failed to place order');
        } finally {
            setSubmitting(false);
        }
    };

    // Render product item for browsing
    const renderProductItem = ({ item }) => {
        const inCart = cart.find((c) => c.id === item.id);
        const price = parseFloat(item.price_per_unit) || 0;

        return (
            <View style={styles.productCard}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productSupplier}>{item.supplier_name}</Text>
                    <Text style={styles.productCategory}>{item.category_name}</Text>
                    <Text style={styles.productPrice}>${price.toFixed(2)} / {item.unit}</Text>
                    <Text style={styles.productStock}>
                        Stock: {item.stock_level} | MOQ: {item.minimum_order_quantity}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.addBtn, inCart && styles.addedBtn]}
                    onPress={() => addToCart(item)}
                >
                    <Ionicons
                        name={inCart ? "checkmark" : "add"}
                        size={20}
                        color="#fff"
                    />
                </TouchableOpacity>
            </View>
        );
    };

    // Render cart item
    const renderCartItem = ({ item }) => {
        const price = parseFloat(item.price_per_unit) || 0;
        const subtotal = price * item.quantity;

        return (
            <View style={styles.cartCard}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemSupplier}>{item.supplier_name}</Text>
                    <Text style={styles.cartItemPrice}>
                        ${price.toFixed(2)} x {item.quantity} = ${subtotal.toFixed(2)}
                    </Text>
                </View>

                <View style={styles.qtyControls}>
                    <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.id, -1)}
                    >
                        <Text style={styles.qtyText}>-</Text>
                    </TouchableOpacity>

                    <Text style={styles.qtyNumber}>{item.quantity}</Text>

                    <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.id, 1)}
                    >
                        <Text style={styles.qtyText}>+</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                    <Ionicons name="trash-outline" size={22} color="#ef4444" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                {/* Header with tabs */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={[styles.tab, viewMode === 'browse' && styles.activeTab]}
                        onPress={() => setViewMode('browse')}
                    >
                        <Ionicons name="storefront-outline" size={20} color={viewMode === 'browse' ? '#2563eb' : '#6b7280'} />
                        <Text style={[styles.tabText, viewMode === 'browse' && styles.activeTabText]}>
                            Browse
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tab, viewMode === 'cart' && styles.activeTab]}
                        onPress={() => setViewMode('cart')}
                    >
                        <Ionicons name="cart-outline" size={20} color={viewMode === 'cart' ? '#2563eb' : '#6b7280'} />
                        <Text style={[styles.tabText, viewMode === 'cart' && styles.activeTabText]}>
                            Cart ({cart.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#2563eb" />
                    </View>
                ) : viewMode === 'browse' ? (
                    // Browse Products
                    <FlatList
                        data={products}
                        keyExtractor={(item) => item.id}
                        renderItem={renderProductItem}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.center}>
                                <Ionicons name="basket-outline" size={64} color="#ccc" />
                                <Text style={styles.emptyText}>No products available</Text>
                                <Text style={styles.emptySubtext}>
                                    Link with suppliers to browse their products
                                </Text>
                            </View>
                        }
                    />
                ) : (
                    // Cart View
                    <>
                        {cart.length === 0 ? (
                            <View style={styles.center}>
                                <Ionicons name="cart-outline" size={64} color="#ccc" />
                                <Text style={styles.emptyText}>Your cart is empty</Text>
                                <Text style={styles.emptySubtext}>
                                    Browse products and add them to cart
                                </Text>
                            </View>
                        ) : (
                            <>
                                <FlatList
                                    data={cart}
                                    keyExtractor={(item) => item.id}
                                    renderItem={renderCartItem}
                                    contentContainerStyle={{ paddingBottom: 140 }}
                                />

                                {/* Total Bar */}
                                <View style={styles.totalBar}>
                                    <Text style={styles.totalText}>Total:</Text>
                                    <Text style={styles.totalValue}>
                                        ${calculateTotal().toFixed(2)}
                                    </Text>
                                </View>

                                {/* Checkout Button */}
                                <TouchableOpacity
                                    style={styles.checkoutBtn}
                                    onPress={() => setCheckoutVisible(true)}
                                >
                                    <Text style={styles.checkoutText}>Checkout</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </>
                )}

                {/* Checkout Modal */}
                <Modal
                    visible={checkoutVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setCheckoutVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Checkout</Text>

                            <ScrollView>
                                {/* Delivery Options */}
                                <Text style={styles.sectionLabel}>Delivery Option</Text>
                                <View style={styles.row}>
                                    <TouchableOpacity
                                        onPress={() => setDeliveryOption("DELIVERY")}
                                        style={[
                                            styles.selectBtn,
                                            deliveryOption === "DELIVERY" && styles.selectedBtn,
                                        ]}
                                    >
                                        <Text
                                            style={
                                                deliveryOption === "DELIVERY"
                                                    ? styles.selectedBtnText
                                                    : styles.selectBtnText
                                            }
                                        >
                                            Delivery
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => setDeliveryOption("PICKUP")}
                                        style={[
                                            styles.selectBtn,
                                            deliveryOption === "PICKUP" && styles.selectedBtn,
                                        ]}
                                    >
                                        <Text
                                            style={
                                                deliveryOption === "PICKUP"
                                                    ? styles.selectedBtnText
                                                    : styles.selectBtnText
                                            }
                                        >
                                            Pickup
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Delivery Notes */}
                                <Text style={styles.sectionLabel}>Delivery Notes (Optional)</Text>
                                <TextInput
                                    placeholder="Add any special instructions..."
                                    value={deliveryNotes}
                                    onChangeText={setDeliveryNotes}
                                    style={styles.input}
                                    multiline
                                    numberOfLines={3}
                                />

                                {/* Order Summary */}
                                <Text style={styles.summaryTitle}>Order Summary</Text>
                                {suppliers.map((supplier) => {
                                    const supplierTotal = supplier.items.reduce((sum, item) => {
                                        return sum + parseFloat(item.price_per_unit) * item.quantity;
                                    }, 0);

                                    return (
                                        <View key={supplier.supplier_id} style={styles.supplierSection}>
                                            <Text style={styles.supplierName}>{supplier.supplier_name}</Text>
                                            {supplier.items.map((item) => (
                                                <Text key={item.id} style={styles.summaryItem}>
                                                    • {item.name} x{item.quantity} = $
                                                    {(parseFloat(item.price_per_unit) * item.quantity).toFixed(2)}
                                                </Text>
                                            ))}
                                            <Text style={styles.supplierTotal}>
                                                Subtotal: ${supplierTotal.toFixed(2)}
                                            </Text>
                                        </View>
                                    );
                                })}

                                <Text style={styles.grandTotal}>
                                    Grand Total: ${calculateTotal().toFixed(2)}
                                </Text>

                                {/* Submit Button */}
                                <TouchableOpacity
                                    style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                                    onPress={submitOrders}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.submitText}>Place Order</Text>
                                    )}
                                </TouchableOpacity>

                                {/* Cancel Button */}
                                <TouchableOpacity onPress={() => setCheckoutVisible(false)}>
                                    <Text style={styles.closeText}>Cancel</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#f5f5f5" },
    container: { flex: 1 },

    header: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        gap: 8,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: "#2563eb",
    },
    tabText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#6b7280",
    },
    activeTabText: {
        color: "#2563eb",
    },

    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
    emptyText: { fontSize: 18, fontWeight: "600", color: "#333", marginTop: 16 },
    emptySubtext: { fontSize: 14, color: "#6b7280", marginTop: 8, textAlign: "center" },

    listContent: { padding: 16 },

    productCard: {
        flexDirection: "row",
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        alignItems: "center",
    },
    productName: { fontSize: 16, fontWeight: "600", color: "#111" },
    productSupplier: { fontSize: 13, color: "#6b7280", marginTop: 2 },
    productCategory: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
    productPrice: { fontSize: 15, fontWeight: "700", color: "#2563eb", marginTop: 6 },
    productStock: { fontSize: 12, color: "#6b7280", marginTop: 4 },

    addBtn: {
        backgroundColor: "#10b981",
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    addedBtn: {
        backgroundColor: "#059669",
    },

    cartCard: {
        flexDirection: "row",
        backgroundColor: "#fff",
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        alignItems: "center",
    },
    cartItemName: { fontSize: 16, fontWeight: "600" },
    cartItemSupplier: { fontSize: 13, color: "#6b7280", marginTop: 2 },
    cartItemPrice: { fontSize: 14, color: "#374151", marginTop: 4 },

    qtyControls: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 12,
    },
    qtyBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#cbd5e1",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8fafc",
    },
    qtyText: { fontSize: 18, fontWeight: "700", color: "#374151" },
    qtyNumber: { width: 40, textAlign: "center", fontSize: 16, fontWeight: "600" },

    totalBar: {
        position: "absolute",
        bottom: 70,
        left: 16,
        right: 16,
        backgroundColor: "#fff",
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    totalText: { fontSize: 18, fontWeight: "600", color: "#374151" },
    totalValue: { fontSize: 20, fontWeight: "700", color: "#2563eb" },

    checkoutBtn: {
        position: "absolute",
        bottom: 20,
        left: 16,
        right: 16,
        backgroundColor: "#2563eb",
        paddingVertical: 16,
        borderRadius: 12,
    },
    checkoutText: {
        color: "#fff",
        fontWeight: "700",
        textAlign: "center",
        fontSize: 16,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        padding: 24,
        borderTopRightRadius: 20,
        borderTopLeftRadius: 20,
        maxHeight: "90%",
    },
    modalTitle: { fontSize: 24, fontWeight: "700", marginBottom: 20 },

    sectionLabel: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, marginTop: 12 },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
        gap: 12,
    },

    selectBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#cbd5e1",
        paddingVertical: 12,
        borderRadius: 10,
    },
    selectBtnText: { textAlign: "center", fontSize: 16, color: "#374151" },
    selectedBtn: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
    selectedBtnText: { color: "#fff", textAlign: "center", fontSize: 16, fontWeight: "600" },

    input: {
        borderWidth: 1,
        borderColor: "#cbd5e1",
        padding: 12,
        borderRadius: 10,
        marginBottom: 16,
        fontSize: 15,
        textAlignVertical: "top",
    },

    summaryTitle: { fontSize: 18, fontWeight: "700", marginTop: 16, marginBottom: 12 },
    supplierSection: {
        backgroundColor: "#f8fafc",
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
    },
    supplierName: { fontSize: 16, fontWeight: "600", color: "#2563eb", marginBottom: 8 },
    summaryItem: { fontSize: 14, color: "#374151", marginBottom: 4 },
    supplierTotal: { fontSize: 14, fontWeight: "600", color: "#111", marginTop: 8 },
    grandTotal: { fontSize: 20, fontWeight: "700", color: "#2563eb", marginTop: 12, textAlign: "right" },

    submitBtn: {
        backgroundColor: "#16a34a",
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 24,
    },
    submitBtnDisabled: {
        opacity: 0.6,
    },
    submitText: { color: "#fff", textAlign: "center", fontWeight: "700", fontSize: 16 },

    closeText: {
        textAlign: "center",
        color: "#ef4444",
        fontSize: 16,
        fontWeight: "600",
        marginTop: 16,
    },
});
