import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../context/AuthContext";

type CategoryItem = { id: string; name: string };
type Category = { 
  description: string;
  name: string;
};
type Product = {
  name: string;
  description: string;
  category_id: string;
  unit: string;
  price_per_unit: number;
  stock_level: number;
  minimum_order_quantity: number;
  is_active: boolean;
};

export default function ProductInfo() {
  const { token, signOut, user } = useAuth();
  if (!token) {
    console.log("user", user);
    signOut();
  }

  const CATEGORY_URL = "https://swe-lab-1.onrender.com/categories/";
  const PRODUCT_URL = "https://swe-lab-1.onrender.com/products/";

  const [category, setCategory] = useState<Category>({
    name: "",
    description: ""
  });
  const [product, setProduct] = useState<Product>({
    name: "",
    description: "",
    unit: "",
    price_per_unit: 0,
    stock_level: 0,
    minimum_order_quantity: 1,
    category_id: "",
    is_active: true,
  });


  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [categoriesList, setCategoriesList] = useState<CategoryItem[]>([]);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        console.log("token:", token)
        const headers: any = { Accept: "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const resp = await fetch(CATEGORY_URL, { headers });
        const text = await resp.text();
        let data: any = null;
        try { data = text ? JSON.parse(text) : null; } catch {}

        if (mounted && Array.isArray(data)) {
          const mappedCats = data.map((c: any) => ({ id: c.id, name: c.name ?? "" }));
          setCategoriesList(mappedCats);
          if (mappedCats.length > 0) {
            setProduct(prev => ({ ...prev, category_id: mappedCats[0].id }));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch categories", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [token]);

  const handleSaveCategory = async () => {
    if (!token || !category.name.trim()) return Alert.alert("Error", "Enter a category name.");

    setSavingCategory(true);
    try {
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const resp = await fetch(CATEGORY_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(category),
      });
      if (resp.ok) Alert.alert("Success", "Category saved!");
      else Alert.alert("Error", "Failed to save category.");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Network error while saving category.");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!token || !product.name.trim()) return Alert.alert("Error", "Enter a product name.");

    setSavingProduct(true);
    try {
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const resp = await fetch(PRODUCT_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(product),
      });
      if (resp.ok) Alert.alert("Success", "Product saved!");
      else Alert.alert("Error", "Failed to save product.");
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Network error while saving product.");
    } finally {
      setSavingProduct(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1, justifyContent: "center", alignItems: "center" }} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Manage Category</Text>
        <TextInput
          style={styles.input}
          placeholder="Category Name"
          value={category.name}
          onChangeText={(t) => setCategory({ ...category, name: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Category Description"
          value={category.description}
          onChangeText={(t) => setCategory({ ...category, description: t })}
        />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: "#2F80ED" }]}
          onPress={handleSaveCategory}
          disabled={savingCategory}
        >
          {savingCategory ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Category</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.sectionBox}>
        <Text style={styles.sectionTitle}>Manage Product</Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={product.name}
          onChangeText={(t) => setProduct({ ...product, name: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Description"
          value={product.description}
          onChangeText={(t) => setProduct({ ...product, description: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Unit"
          value={product.unit}
          onChangeText={(t) => setProduct({ ...product, unit: t })}
        />
        <TextInput
          style={styles.input}
          placeholder="Price per unit"
          keyboardType="numeric"
          value={product.price_per_unit}
          onChangeText={(t) => setProduct({ ...product, price_per_unit: Number(t) })}
        />
        <TextInput
          style={styles.input}
          placeholder="Stock level"
          value={product.stock_level}
          onChangeText={(t) => setProduct({ ...product, stock_level: Number(t) })}
        />
        <TextInput
          style={styles.input}
          placeholder="Minimum order quantity"
          value={product.minimum_order_quantity}
          onChangeText={(t) => setProduct({ ...product, minimum_order_quantity: Number(t) })}
        />

        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={product.category_id || (categoriesList[0] || "")}
            onValueChange={(val) => setProduct({ ...product, category_id: val })}
          >
            {categoriesList.map((c) => (
              <Picker.Item key={c.id} label={c.name} value={c.id} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: "#16A34A" }]}
          onPress={handleSaveProduct}
          disabled={savingProduct}
        >
          {savingProduct ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Product</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionBox: { backgroundColor: "white", borderRadius: 12, padding: 16, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12, color: "#333" },
  input: { backgroundColor: "#f2f4f7", padding: 12, borderRadius: 8, marginBottom: 10 },
  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
  saveBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
  pickerWrap: { backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: "#e6e6e6", marginTop: 8 },
});
