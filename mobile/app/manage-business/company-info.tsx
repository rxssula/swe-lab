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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export default function CompanyInfo() {
  const { token, signOut } = useAuth(); 

  const PROFILE_URL = "https://swe-lab-1.onrender.com/auth/me";
  const SAVE_URL = "https://swe-lab-1.onrender.com/supplier/company/";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const fillFromProfile = (p: any) => {
    setBusinessName(p.business_name ?? "");
    setBusinessType(p.business_type ?? "");
    setCountry(p.country ?? "");
    setCity(p.city ?? "");
    setAddress(p.address ?? "");
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        if (!token) {
          signOut();
          return;
        }
        const resp = await fetch(PROFILE_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        const text = await resp.text();
        let data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }
        console.log("Data:", data)

        if (!mounted) return;

        let assoc = data.consumer_associations[0] ? data.consumer_associations[0].consumer : data.supplier_associations[0].supplier;

        if (resp.ok && data) {
          console.log("Data:", assoc)
          fillFromProfile(assoc);
        } else {
          console.warn("Failed to load company profile", resp.status, data);
        }
      } catch (err) {
        console.error("Error loading company profile", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  const buildPayload = () => {
    return {
      business_name: businessName,
      business_type: businessType,
      city,
      country,
      address,
    };
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!token) {
        Alert.alert("Error", "Not authenticated");
        return;
      }
      const payload = buildPayload();
      const resp = await fetch(SAVE_URL, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (resp.ok) {
        Alert.alert("Success", "Company info saved");
        if (data) fillFromProfile(data);
      } else {
        console.warn("Save failed", resp.status, data ?? text);
        const msg =
          (data?.detail && Array.isArray(data.detail) ? data.detail.map((d: any) => d.msg ?? JSON.stringify(d)).join("\n") : data?.detail) ??
          data?.message ??
          text ??
          `Failed to save (status ${resp.status})`;
        Alert.alert("Save failed", String(msg));
      }
    } catch (err) {
      console.error("Save error", err);
      Alert.alert("Error", "Network error while saving");
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (label: string, value: string, setter: (v: string) => void) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setter}
        placeholder={value ?? `Enter ${label}`}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
        <Text>Loading company data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Basic Business Information</Text>
          {renderInput("Business Name", businessName, setBusinessName)}
          {renderInput("Business Type", businessType, setBusinessType)}
          {renderInput("Country", country, setCountry)}
          {renderInput("City", city, setCity)}
          {renderInput("Address", address, setAddress)}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
    color: "#555",
  },
  subLabel: {
    fontSize: 15,
    marginVertical: 10,
    fontWeight: "600",
    color: "#444",
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
