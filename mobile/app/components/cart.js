// app/cart.js
import React, { useState } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    Alert,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";

// --- Mock cart (replace with global/cartContext later) ---
const INITIAL_CART = [
    {
        id: "1",
        title: "Product 1",
        price: 12.5,
        qty: 2,
        supplier: "Supplier A",
    },
    {
        id: "2",
        title: "Product 2",
        price: 8.9,
        qty: 1,
        supplier: "Supplier B",
    },
];

export default function Cart() {
    const [cart, setCart] = useState(INITIAL_CART);
    const [checkoutVisible, setCheckoutVisible] = useState(false);
    const [deliveryType, setDeliveryType] = useState("delivery");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");

    // Update quantity
    const updateQty = (id, delta) => {
        setCart((prev) =>
            prev
                .map((item) =>
                    item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
                )
                .filter((it) => it.qty > 0)
        );
    };

    // Delete item
    const removeItem = (id) => {
        setCart((prev) => prev.filter((item) => item.id !== id));
    };

    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    const submitOrder = () => {
        if (!date || !time) {
            Alert.alert("Missing info", "Please choose date and time.");
            return;
        }

        Alert.alert("Order placed!", "Your order has been submitted.");
        setCheckoutVisible(false);
    };

    const renderItem = ({ item }) => (
        <View style={styles.itemCard}>
            <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.supplier}>Supplier: {item.supplier}</Text>
                <Text style={styles.price}>${item.price.toFixed(2)}</Text>
            </View>

            {/* Qty controls */}
            <View style={styles.qtyWrap}>
                <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQty(item.id, -1)}
                >
                    <Text style={styles.qtyText}>-</Text>
                </TouchableOpacity>

                <Text style={styles.qtyNumber}>{item.qty}</Text>

                <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQty(item.id, 1)}
                >
                    <Text style={styles.qtyText}>+</Text>
                </TouchableOpacity>
            </View>

            {/* Delete */}
            <TouchableOpacity onPress={() => removeItem(item.id)}>
                <Ionicons name="trash-outline" size={22} color="red" />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <Text style={styles.header}>Your Cart</Text>

                {cart.length === 0 ? (
                    <View style={styles.center}>
                        <Text style={{ fontSize: 16, color: "#6b7280" }}>
                            Your cart is empty
                        </Text>
                    </View>
                ) : (
                    <>
                        <FlatList
                            data={cart}
                            keyExtractor={(i) => i.id}
                            renderItem={renderItem}
                            contentContainerStyle={{ paddingBottom: 120 }}
                        />

                        {/* Total */}
                        <View style={styles.totalBar}>
                            <Text style={styles.totalText}>Total:</Text>
                            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
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

                {/* CHECKOUT MODAL */}
                <Modal
                    visible={checkoutVisible}
                    animationType="slide"
                    transparent={true}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Checkout</Text>

                            {/* Delivery type */}
                            <View style={styles.row}>
                                <TouchableOpacity
                                    onPress={() => setDeliveryType("delivery")}
                                    style={[
                                        styles.selectBtn,
                                        deliveryType === "delivery" && styles.selectedBtn,
                                    ]}
                                >
                                    <Text
                                        style={
                                            deliveryType === "delivery"
                                                ? styles.selectedBtnText
                                                : styles.selectBtnText
                                        }
                                    >
                                        Delivery
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setDeliveryType("pickup")}
                                    style={[
                                        styles.selectBtn,
                                        deliveryType === "pickup" && styles.selectedBtn,
                                    ]}
                                >
                                    <Text
                                        style={
                                            deliveryType === "pickup"
                                                ? styles.selectedBtnText
                                                : styles.selectBtnText
                                        }
                                    >
                                        Pickup
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Date + Time */}
                            <TextInput
                                placeholder="Select date (YYYY-MM-DD)"
                                value={date}
                                onChangeText={setDate}
                                style={styles.input}
                            />
                            <TextInput
                                placeholder="Select time (HH:MM)"
                                value={time}
                                onChangeText={setTime}
                                style={styles.input}
                            />

                            {/* Summary */}
                            <Text style={styles.summaryTitle}>Order Summary</Text>
                            {cart.map((item) => (
                                <Text key={item.id} style={styles.summaryItem}>
                                    {item.title} x{item.qty} — ${item.price * item.qty}
                                </Text>
                            ))}

                            {/* Submit */}
                            <TouchableOpacity style={styles.submitBtn} onPress={submitOrder}>
                                <Text style={styles.submitText}>Submit Order</Text>
                            </TouchableOpacity>

                            {/* Close */}
                            <TouchableOpacity onPress={() => setCheckoutVisible(false)}>
                                <Text style={styles.closeText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#fff" },
    container: { flex: 1, padding: 16 },

    header: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },

    itemCard: {
        flexDirection: "row",
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        marginBottom: 12,
        alignItems: "center",
    },

    title: { fontSize: 16, fontWeight: "600" },
    supplier: { fontSize: 13, color: "#6b7280" },
    price: { fontWeight: "700", marginTop: 4 },

    qtyWrap: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 12,
    },
    qtyBtn: {
        width: 28,
        height: 28,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
        borderColor: "#cbd5e1",
    },
    qtyText: { fontSize: 18, fontWeight: "700" },
    qtyNumber: { width: 30, textAlign: "center", fontSize: 16 },

    totalBar: {
        position: "absolute",
        bottom: 70,
        left: 16,
        right: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 12,
    },
    totalText: { fontSize: 18, fontWeight: "600" },
    totalValue: { fontSize: 18, fontWeight: "700" },

    checkoutBtn: {
        position: "absolute",
        bottom: 20,
        left: 16,
        right: 16,
        backgroundColor: "#2563eb",
        paddingVertical: 14,
        borderRadius: 10,
    },
    checkoutText: {
        color: "#fff",
        fontWeight: "700",
        textAlign: "center",
        fontSize: 16,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        padding: 20,
        borderTopRightRadius: 20,
        borderTopLeftRadius: 20,
    },
    modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 20 },

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 14,
    },

    selectBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#cbd5e1",
        paddingVertical: 10,
        borderRadius: 10,
        marginHorizontal: 6,
    },
    selectBtnText: { textAlign: "center", fontSize: 16 },
    selectedBtn: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
    selectedBtnText: { color: "#fff", textAlign: "center", fontSize: 16 },

    input: {
        borderWidth: 1,
        borderColor: "#cbd5e1",
        padding: 10,
        borderRadius: 10,
        marginBottom: 12,
    },

    summaryTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
    summaryItem: { fontSize: 14, color: "#374151" },

    submitBtn: {
        backgroundColor: "#16a34a",
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 20,
    },
    submitText: { color: "#fff", textAlign: "center", fontWeight: "700" },

    closeText: {
        textAlign: "center",
        color: "#ef4444",
        fontSize: 15,
        marginTop: 12,
    },
});
