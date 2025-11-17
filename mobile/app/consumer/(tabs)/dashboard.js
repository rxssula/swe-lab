// app/catalog/index.js
import React, { useEffect, useState, useMemo } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';

// --- Mock data (replace with real API) ---
const MOCK_ITEMS = Array.from({ length: 40 }).map((_, i) => ({
  id: String(i + 1),
  title: `Product ${i + 1}`,
  price: (Math.random() * 100).toFixed(2),
  short: `Short description for product ${i + 1}`,
}));

export default function Catalog() {
  const router = useRouter();

  // raw data & states
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [displayQuery, setDisplayQuery] = useState(''); // debounced value used for filtering
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Simulate fetching from API
  const fetchItems = async () => {
    setLoading(true);
    // simulate network delay
    await new Promise((r) => setTimeout(r, 600));
    setItems(MOCK_ITEMS);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // debounce search (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDisplayQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // derived filtered items
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

  // pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/catalog/${item.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.cardLeft}>
        <View style={styles.thumbnail}>
          <Text style={styles.thumbText}>{item.title.split(' ')[1]}</Text>
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
            onPress={() => alert(`Added ${item.title} to cart (demo).`)}
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Catalog</Text>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search products, price, description..."
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 16 },
  header: { paddingVertical: 14 },
  headerTitle: { fontSize: 24, fontWeight: '700' },

  searchWrap: {
    marginBottom: 12,
  },
  search: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
  },

  flatList: { paddingBottom: 24 },
  flatEmpty: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#6b7280' },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardLeft: { justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbText: { fontWeight: '700', color: '#3730a3' },

  cardRight: { flex: 1, justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '600' },
  short: { fontSize: 13, color: '#6b7280', marginTop: 6 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  price: { fontWeight: '700', color: '#111827' },

  addBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addText: { color: '#fff', fontWeight: '600' },
});
