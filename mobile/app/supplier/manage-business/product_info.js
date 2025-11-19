import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    FlatList,
} from "react-native";

export default function ProductInfo() {
    const [categories, setCategories] = useState([""]);
    const [products, setProducts] = useState([
        { id: "1", name: "", unit: "", price: "", sku: "", availability: "", brand: "" },
    ]);

    const addCategory = () => setCategories([...categories, ""]);
    const updateCategory = (index, value) => {
        const newCats = [...categories];
        newCats[index] = value;
        setCategories(newCats);
    };

    const addProduct = () =>
        setProducts([
            ...products,
            { id: Date.now().toString(), name: "", unit: "", price: "", sku: "", availability: "", brand: "" },
        ]);
    const updateProduct = (id, key, value) =>
        setProducts(products.map((p) => (p.id === id ? { ...p, [key]: value } : p)));

    const renderProduct = ({ item }) => (
        <View style={styles.box}>
            <TextInput
                style={styles.input}
                placeholder="Name"
                value={item.name}
                onChangeText={(t) => updateProduct(item.id, "name", t)}
            />
            <TextInput
                style={styles.input}
                placeholder="Unit (kg, L, pcs)"
                value={item.unit}
                onChangeText={(t) => updateProduct(item.id, "unit", t)}
            />
            <TextInput
                style={styles.input}
                placeholder="Price"
                value={item.price}
                onChangeText={(t) => updateProduct(item.id, "price", t)}
            />
            <TextInput
                style={styles.input}
                placeholder="SKU"
                value={item.sku}
                onChangeText={(t) => updateProduct(item.id, "sku", t)}
            />
            <TextInput
                style={styles.input}
                placeholder="Availability"
                value={item.availability}
                onChangeText={(t) => updateProduct(item.id, "availability", t)}
            />
            <TextInput
                style={styles.input}
                placeholder="Brand"
                value={item.brand}
                onChangeText={(t) => updateProduct(item.id, "brand", t)}
            />
        </View>
    );

    return (
        <FlatList
            data={[{ key: "categories" }, { key: "products" }]}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => {
                if (item.key === "categories") {
                    return (
                        <View style={styles.sectionBox}>
                            <Text style={styles.sectionTitle}>Product Categories</Text>
                            {categories.map((cat, idx) => (
                                <TextInput
                                    key={idx}
                                    style={styles.input}
                                    placeholder="Category"
                                    value={cat}
                                    onChangeText={(t) => updateCategory(idx, t)}
                                />
                            ))}
                            <TouchableOpacity style={styles.addBtn} onPress={addCategory}>
                                <Text style={styles.addBtnText}>+ Add Category</Text>
                            </TouchableOpacity>
                        </View>
                    );
                } else if (item.key === "products") {
                    return (
                        <View style={styles.sectionBox}>
                            <Text style={styles.sectionTitle}>Products</Text>
                            <FlatList
                                data={products}
                                keyExtractor={(p) => p.id}
                                renderItem={renderProduct}
                                scrollEnabled={false}
                            />
                            <TouchableOpacity style={styles.addBtn} onPress={addProduct}>
                                <Text style={styles.addBtnText}>+ Add Product</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }
            }}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            ListFooterComponent={
                <TouchableOpacity style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                </TouchableOpacity>
            }
        />
    );
}

const styles = StyleSheet.create({
    sectionBox: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 12,
        color: "#333",
    },
    input: {
        backgroundColor: "#f2f4f7",
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    box: {
        backgroundColor: "#f7f9fc",
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    addBtn: {
        backgroundColor: "#e8f0fe",
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 5,
    },
    addBtnText: {
        color: "#2F80ED",
        fontWeight: "600",
    },
    saveBtn: {
        backgroundColor: "#2F80ED",
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 10,
        marginBottom: 50,
    },
    saveBtnText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
    },
});
