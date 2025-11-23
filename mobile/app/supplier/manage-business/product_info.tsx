import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../../context/AuthContext"; // adjust path if needed

type Product = {
  id: string;
  name: string;
  unit: string;
  price: string;
  sku: string;
  availability: string;
  brand: string;
  category?: string;
  _isNew?: boolean;
  _isDirty?: boolean;
};

export default function ProductInfo() {
  // try to get token from context; if useAuth not present, fallback to null
  const { token: tokenFromContext } = (() => {
    try {
      return useAuth();
    } catch {
      return { token: null };
    }
  })() as any;

  const TOKEN_KEY = "token";
  const getToken = async () => {
    if (tokenFromContext) return tokenFromContext;
    return await AsyncStorage.getItem(TOKEN_KEY);
  };

  // endpoints — replace with your real API routes
  const CATEGORIES_URL = "https://swe-lab-1.onrender.com/supplier/categories/"; // GET, POST
  const PRODUCTS_URL = "https://swe-lab-1.onrender.com/supplier/products/"; // GET, POST, PATCH

  const [categories, setCategories] = useState<string[]>([""]);
  const [products, setProducts] = useState<Product[]>([
    { id: "local-1", name: "", unit: "", price: "", sku: "", availability: "", brand: "", category: "", _isNew: true },
  ]);

  const [loading, setLoading] = useState(true);
  const [savingCategories, setSavingCategories] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const headers: any = { Accept: "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const [catsResp, prodsResp] = await Promise.all([
          fetch(CATEGORIES_URL, { headers }),
          fetch(PRODUCTS_URL, { headers }),
        ]);

        const catsText = await catsResp.text();
        const prodsText = await prodsResp.text();

        let catsData: any = null;
        let prodsData: any = null;
        try { catsData = catsText ? JSON.parse(catsText) : null; } catch {}
        try { prodsData = prodsText ? JSON.parse(prodsText) : null; } catch {}

        if (!mounted) return;

        if (catsResp.ok && Array.isArray(catsData)) {
          const mappedCats = catsData.map((c: any) => (typeof c === "string" ? c : c.name ?? c.title ?? String(c)));
          setCategories(mappedCats.length ? mappedCats : [""]);
        } else {
          console.warn("Categories fetch failed", catsResp.status, catsData ?? catsText);
          setCategories([""]);
        }

        if (prodsResp.ok && Array.isArray(prodsData)) {
          const mappedProds: Product[] = prodsData.map((p: any) => ({
            id: String(p.id ?? p._id ?? Date.now().toString()),
            name: p.name ?? "",
            unit: p.unit ?? "",
            price: String(p.price ?? ""),
            sku: p.sku ?? "",
            availability: p.availability ?? "",
            brand: p.brand ?? "",
            category: p.category ?? p.category_name ?? "",
            _isNew: false,
            _isDirty: false,
          }));
          setProducts(mappedProds.length ? mappedProds : [{ id: Date.now().toString(), name: "", unit: "", price: "", sku: "", availability: "", brand: "", category: "", _isNew: true }]);
        } else {
          console.warn("Products fetch failed", prodsResp.status, prodsData ?? prodsText);
          setProducts([{ id: Date.now().toString(), name: "", unit: "", price: "", sku: "", availability: "", brand: "", category: "", _isNew: true }]);
        }
      } catch (err) {
        console.error("Load error", err);
        Alert.alert("Error", "Failed to load products/categories. Check connection.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const addCategory = () => setCategories([...categories, ""]);
  const updateCategory = (index: number, value: string) => {
    const copy = [...categories];
    copy[index] = value;
    setCategories(copy);
  };

  const addProduct = () => setProducts([
    ...products,
    { id: Date.now().toString(), name: "", unit: "", price: "", sku: "", availability: "", brand: "", category: categories[0] ?? "", _isNew: true }
  ]);

  const updateProduct = (id: string, key: keyof Product, value: string) => {
    setProducts(products.map(p => p.id === id ? { ...p, [key]: value, _isDirty: !p._isNew } : p));
  };

  // Save categories only
  const handleSaveCategories = async () => {
    setSavingCategories(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Auth", "Not authenticated. Please login.");
        setSavingCategories(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" };

      // POST each non-empty category (you can optimize by deduping or checking existing server-side)
      for (const cat of categories.map(c => c.trim()).filter(Boolean)) {
        try {
          const resp = await fetch(CATEGORIES_URL, {
            method: "POST",
            headers,
            body: JSON.stringify({ name: cat }),
          });
          const text = await resp.text();
          let data = null;
          try { data = text ? JSON.parse(text) : null; } catch {}
          if (!resp.ok && resp.status !== 409) {
            console.warn("Category create failed", resp.status, data ?? text);
          }
        } catch (err) {
          console.warn("Category create error", err);
        }
      }

      Alert.alert("Success", "Categories saved / synced.");
      // optionally reload categories from server
    } finally {
      setSavingCategories(false);
    }
  };

  // Save products only
  const handleSaveProducts = async () => {
    setSavingProducts(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Auth", "Not authenticated. Please login.");
        setSavingProducts(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" };

      for (const p of products) {
        if (!p.name.trim()) continue; // skip empty product rows

        if (p._isNew) {
          try {
            const resp = await fetch(PRODUCTS_URL, {
              method: "POST",
              headers,
              body: JSON.stringify({
                name: p.name,
                unit: p.unit,
                price: p.price === "" ? null : Number(p.price),
                sku: p.sku,
                availability: p.availability,
                brand: p.brand,
                category: p.category,
              }),
            });
            const text = await resp.text();
            let data = null;
            try { data = text ? JSON.parse(text) : null; } catch {}
            if (resp.ok) {
              const serverId = String(data?.id ?? data?.pk ?? data?.product_id ?? Date.now().toString());
              setProducts(prev => prev.map(x => x === p ? { ...x, id: serverId, _isNew: false, _isDirty: false } : x));
            } else {
              console.warn("Product create failed", resp.status, data ?? text);
              Alert.alert("Product save failed", `Failed to create product "${p.name}".`);
            }
          } catch (err) {
            console.error("Product create error", err);
            Alert.alert("Error", "Network error while creating product.");
          }
        } else if (p._isDirty) {
          try {
            const url = PRODUCTS_URL.endsWith("/") ? `${PRODUCTS_URL}${p.id}/` : `${PRODUCTS_URL}/${p.id}/`;
            const resp = await fetch(url, {
              method: "PATCH",
              headers,
              body: JSON.stringify({
                name: p.name,
                unit: p.unit,
                price: p.price === "" ? null : Number(p.price),
                sku: p.sku,
                availability: p.availability,
                brand: p.brand,
                category: p.category,
              }),
            });
            const text = await resp.text();
            let data = null;
            try { data = text ? JSON.parse(text) : null; } catch {}
            if (resp.ok) {
              setProducts(prev => prev.map(x => x.id === p.id ? { ...x, _isDirty: false } : x));
            } else {
              console.warn("Product update failed", resp.status, data ?? text);
              Alert.alert("Product update failed", `Failed to update "${p.name}".`);
            }
          } catch (err) {
            console.error("Product update error", err);
            Alert.alert("Error", "Network error while updating product.");
          }
        }
      }

      Alert.alert("Success", "Products saved / synced.");
      // optionally reload products from server
    } finally {
      setSavingProducts(false);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
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
        keyboardType="numeric"
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

      {/* Category picker */}
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={item.category ?? (categories.length ? categories[0] : "")}
          onValueChange={(val) => updateProduct(item.id, "category", val)}
        >
          {categories.map((c, i) => (
            <Picker.Item key={i} label={c || "—"} value={c} />
          ))}
        </Picker>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
        <Text>Loading products & categories...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
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

        {/* Save categories button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: "#2F80ED", marginTop: 12 }]}
          onPress={handleSaveCategories}
          disabled={savingCategories}
        >
          {savingCategories ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Categories</Text>}
        </TouchableOpacity>
      </View>

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

        {/* Save products button */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: "#16A34A", marginTop: 12 }]}
          onPress={handleSaveProducts}
          disabled={savingProducts}
        >
          {savingProducts ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Products</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  pickerWrap: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    marginTop: 8,
  },
});
