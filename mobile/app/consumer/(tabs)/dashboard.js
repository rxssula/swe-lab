// app/consumer/(tabs)/dashboard.js
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
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext"; // adjust path if needed

export default function Dashboard() {
  const router = useRouter();

  // Try to get token from context; fallback later to AsyncStorage
  let tokenFromContext = null;
  try {
    const auth = useAuth();
    tokenFromContext = auth?.token ?? null;
  } catch {
    tokenFromContext = null;
  }
  const TOKEN_KEY = "token";

  const getToken = async () => {
    if (tokenFromContext) return tokenFromContext;
    return await AsyncStorage.getItem(TOKEN_KEY);
  };

  // ====== Replace these with your real API endpoints ======
  const COMPANIES_URL = "https://swe-lab-1.onrender.com/consumer/companies/"; // GET list of companies
  const CONNECT_URL = "https://swe-lab-1.onrender.com/consumer/connect/"; // POST { company_id }
  // ========================================================

  const [companies, setCompanies] = useState([]);
  const [query, setQuery] = useState("");
  const [displayQuery, setDisplayQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [sendingConnect, setSendingConnect] = useState(false);

  // fetch companies
  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const headers = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const resp = await fetch(COMPANIES_URL, { headers });
      const text = await resp.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch {}
      if (!resp.ok) {
        console.warn("Companies fetch error", resp.status, data ?? text);
        Alert.alert("Error", "Failed to load companies.");
        setCompanies([]);
        return;
      }

      // Expecting an array of company objects — adapt mapping if necessary
      if (Array.isArray(data)) {
        setCompanies(data);
      } else if (data && Array.isArray(data.results)) {
        // common paginated shape
        setCompanies(data.results);
      } else {
        setCompanies([]);
      }
    } catch (err) {
      console.error("fetchCompanies error", err);
      Alert.alert("Error", "Network error while loading companies.");
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDisplayQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    if (!displayQuery) return companies;
    const q = displayQuery.toLowerCase();
    return companies.filter((c) => {
      const name = (c.name ?? c.company_name ?? "").toString().toLowerCase();
      const city = (c.city ?? "").toString().toLowerCase();
      const desc = (c.description ?? c.short ?? "").toString().toLowerCase();
      const contact = (c.contact_person ?? c.manager ?? c.email ?? "").toString().toLowerCase();
      return name.includes(q) || city.includes(q) || desc.includes(q) || contact.includes(q);
    });
  }, [companies, displayQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompanies();
    setRefreshing(false);
  };

  // Send connect/link request to company's manager
  const handleConnect = async (company) => {
    setSendingConnect(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Not authenticated", "Please log in to send connect requests.");
        return;
      }
      const resp = await fetch(CONNECT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ company_id: company.id }),
      });
      const text = await resp.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch {}

      if (resp.ok) {
        Alert.alert("Request sent", `Your request to ${company.name ?? company.company_name} was sent.`);
      } else {
        const msg = data?.detail ?? data?.message ?? text ?? `Failed (${resp.status})`;
        Alert.alert("Failed to send request", String(msg));
      }
    } catch (err) {
      console.error("connect error", err);
      Alert.alert("Error", "Network error while sending request.");
    } finally {
      setSendingConnect(false);
    }
  };

  const renderCompany = ({ item }) => {
    const name = item.name ?? item.company_name ?? "—";
    const city = item.city ?? "—";
    const short = item.short ?? item.description ?? "";
    const contact = item.contact_person ?? item.manager ?? item.contact ?? "—";

    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelectedCompany(item)} activeOpacity={0.85}>
        <View style={styles.cardLeft}>
          <View style={styles.thumbnail}>
            <Text style={styles.thumbText}>{(name.split(" ")[0] ?? "").slice(0, 2).toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.title}>{name}</Text>
          <Text numberOfLines={2} style={styles.short}>{short}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>City: {city}</Text>
            <Text style={styles.metaText}>Contact: {contact}</Text>
          </View>

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.connectBtn]}
              onPress={() => handleConnect(item)}
              disabled={sendingConnect}
            >
              {sendingConnect ? <ActivityIndicator color="#fff" /> : <Text style={styles.connectText}>Connect</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Companies</Text>

          <TouchableOpacity onPress={() => fetchCompanies()}>
            <Ionicons name="refresh-outline" size={24} color="#111" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search companies..."
            style={styles.search}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => String(i.id ?? i.pk ?? i.company_id ?? Math.random())}
            renderItem={renderCompany}
            contentContainerStyle={filtered.length === 0 ? styles.flatEmpty : styles.flatList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyTitle}>No companies found</Text>
                <Text style={styles.emptyText}>Try a different keyword or pull to refresh.</Text>
              </View>
            }
          />
        )}

        {/* DETAILS MODAL */}
        <Modal visible={!!selectedCompany} transparent animationType="slide" onRequestClose={() => setSelectedCompany(null)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>{selectedCompany?.name ?? selectedCompany?.company_name}</Text>
              <Text style={styles.modalText}>{selectedCompany?.description ?? selectedCompany?.short}</Text>
              <Text style={[styles.modalText, { marginTop: 8 }]}>City: {selectedCompany?.city ?? "—"}</Text>
              <Text style={styles.modalText}>Contact person: {selectedCompany?.contact_person ?? selectedCompany?.manager ?? "—"}</Text>
              <Text style={styles.modalText}>Email: {selectedCompany?.email ?? selectedCompany?.contact_email ?? "—"}</Text>

              <View style={{ flexDirection: "row", marginTop: 18 }}>
                <TouchableOpacity
                  style={[styles.connectBtn, { flex: 1 }]}
                  onPress={() => {
                    handleConnect(selectedCompany);
                    setSelectedCompany(null);
                  }}
                >
                  <Text style={styles.connectText}>Connect</Text>
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

/* styles (mostly reused + small additions) */
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

  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  metaText: { fontSize: 12, color: "#6b7280" },

  row: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 10,
  },

  connectBtn: {
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  connectText: { color: "#fff", fontWeight: "700" },

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
