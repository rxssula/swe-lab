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
import { useAuth } from "../../context/AuthContext"; // adjust path if needed

export default function CompanyInfo() {
  const { token, signOut } = useAuth(); // expects your AuthProvider to expose token
  // Replace these with your real endpoints:
  const PROFILE_URL = "https://swe-lab-1.onrender.com/supplier/company/"; // GET existing company info
  const SAVE_URL = "https://swe-lab-1.onrender.com/supplier/company/"; // PATCH/PUT to save changes

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [bin, setBin] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [regionCoverage, setRegionCoverage] = useState("");

  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [salesPhone, setSalesPhone] = useState("");
  const [salesEmail, setSalesEmail] = useState("");

  const [warehouses, setWarehouses] = useState([{ id: "1", address: "" }]);
  const addWarehouse = () =>
    setWarehouses([...warehouses, { id: Date.now().toString(), address: "" }]);
  const updateWarehouse = (id: string, value: string) =>
    setWarehouses(warehouses.map((w) => (w.id === id ? { ...w, address: value } : w)));

  const [moa, setMoa] = useState("");
  const [deliveryMethods, setDeliveryMethods] = useState("");
  const [deliverySchedule, setDeliverySchedule] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  const [businessCert, setBusinessCert] = useState("");
  const [taxCert, setTaxCert] = useState("");
  const [license, setLicense] = useState("");
  const [iban, setIban] = useState("");

  const [yearsInBusiness, setYearsInBusiness] = useState("");
  const [customerRatings, setCustomerRatings] = useState("");
  const [popularCategories, setPopularCategories] = useState("");
  const [deliveryScore, setDeliveryScore] = useState("");
  const [salesVolume, setSalesVolume] = useState("");

  // Helper to map backend shape -> local state
  const fillFromProfile = (p: any) => {
    setCompanyName(p.company_name ?? p.business_name ?? "");
    setLegalName(p.legal_name ?? "");
    setBin(p.bin ?? p.vat ?? "");
    setCompanyType(p.company_type ?? "");
    setDescription(p.description ?? "");
    setIndustry(p.industry ?? "");
    setCity(p.city ?? "");
    setRegionCoverage(p.region_coverage ?? "");

    setContactPerson(p.contact_person ?? "");
    setPhone(p.phone ?? p.phone_number ?? "");
    setEmail(p.email ?? "");
    setSalesPhone(p.sales_phone ?? "");
    setSalesEmail(p.sales_email ?? "");

    // warehouses: backend might return an array of addresses
    if (Array.isArray(p.warehouses) && p.warehouses.length > 0) {
      setWarehouses(p.warehouses.map((addr: string, i: number) => ({ id: String(i + 1), address: addr })));
    } else {
      setWarehouses([{ id: "1", address: "" }]);
    }

    setMoa(String(p.moa ?? ""));
    setDeliveryMethods(p.delivery_methods ?? "");
    setDeliverySchedule(p.delivery_schedule ?? "");
    setLeadTime(p.lead_time ?? "");
    setPaymentTerms(p.payment_terms ?? "");

    setBusinessCert(p.business_certificate ?? "");
    setTaxCert(p.tax_certificate ?? "");
    setLicense(p.license ?? "");
    setIban(p.iban ?? "");

    setYearsInBusiness(String(p.years_in_business ?? ""));
    setCustomerRatings(String(p.customer_ratings ?? ""));
    setPopularCategories((p.popular_categories && p.popular_categories.join?.(", ")) ?? p.popular_categories ?? "");
    setDeliveryScore(String(p.delivery_score ?? ""));
    setSalesVolume(String(p.sales_volume ?? ""));
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        if (!token) {
          // no token — handle according to your app (redirect to login elsewhere)
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

        if (!mounted) return;

        if (resp.ok && data) {
          fillFromProfile(data);
        } else {
          console.warn("Failed to load company profile", resp.status, data);
          // optionally alert user
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

  // Build payload based on what backend expects
  const buildPayload = () => {
    return {
      company_name: companyName,
      legal_name: legalName,
      bin,
      company_type: companyType,
      description,
      industry,
      city,
      region_coverage: regionCoverage,

      contact_person: contactPerson,
      phone,
      email,
      sales_phone: salesPhone,
      sales_email: salesEmail,

      warehouses: warehouses.map((w) => w.address).filter(Boolean),

      moa,
      delivery_methods: deliveryMethods,
      delivery_schedule: deliverySchedule,
      lead_time: leadTime,
      payment_terms: paymentTerms,

      business_certificate: businessCert,
      tax_certificate: taxCert,
      license,
      iban,

      years_in_business: yearsInBusiness,
      customer_ratings: customerRatings,
      popular_categories: popularCategories ? popularCategories.split(",").map(s => s.trim()) : [],
      delivery_score: deliveryScore,
      sales_volume: salesVolume,
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
        method: "PATCH", // or PUT depending on backend
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
        // optionally refresh local state from server response
        if (data) fillFromProfile(data);
      } else {
        console.warn("Save failed", resp.status, data ?? text);
        // Try to show validation errors if backend returns them
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

  const renderInput = (label: string, value: string, setter: (v: string) => void, placeholder?: string) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setter}
        placeholder={placeholder ?? `Enter ${label}`}
      />
    </View>
  );

  const renderWarehouse = ({ item }: { item: { id: string; address: string } }) => (
    <View style={styles.box}>
      <TextInput
        style={styles.input}
        placeholder="Warehouse address"
        value={item.address}
        onChangeText={(val) => updateWarehouse(item.id, val)}
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
          {renderInput("Company Name", companyName, setCompanyName)}
          {renderInput("Company Legal Name", legalName, setLegalName)}
          {renderInput("BIN", bin, setBin)}
          {renderInput("Company Type", companyType, setCompanyType)}
          {renderInput("Business Description", description, setDescription)}
          {renderInput("Industry Category", industry, setIndustry)}
          {renderInput("Head Office City", city, setCity)}
          {renderInput("Business Region Coverage", regionCoverage, setRegionCoverage)}
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          {renderInput("Primary Contact Person", contactPerson, setContactPerson)}
          {renderInput("Phone", phone, setPhone)}
          {renderInput("Email", email, setEmail)}
          {renderInput("Sales Department Phone", salesPhone, setSalesPhone)}
          {renderInput("Sales Department Email", salesEmail, setSalesEmail)}

          <Text style={styles.subLabel}>Warehouse Addresses</Text>
          <FlatList data={warehouses} keyExtractor={(i) => i.id} renderItem={renderWarehouse} scrollEnabled={false} />
          <TouchableOpacity style={styles.addBtn} onPress={addWarehouse}>
            <Text style={styles.addBtnText}>+ Add Warehouse</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Supplier Operational Info</Text>
          {renderInput("Minimum Order Amount (MOA)", moa, setMoa)}
          {renderInput("Delivery Methods", deliveryMethods, setDeliveryMethods)}
          {renderInput("Delivery Schedule", deliverySchedule, setDeliverySchedule)}
          {renderInput("Lead Time", leadTime, setLeadTime)}
          {renderInput("Payment Terms", paymentTerms, setPaymentTerms)}
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Legal & Verification Documents</Text>
          {renderInput("Business Registration Certificate", businessCert, setBusinessCert)}
          {renderInput("Tax Certificate", taxCert, setTaxCert)}
          {renderInput("License", license, setLicense)}
          {renderInput("Bank Account (IBAN)", iban, setIban)}
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Business Performance Info</Text>
          {renderInput("Years in Business", yearsInBusiness, setYearsInBusiness)}
          {renderInput("Customer Ratings", customerRatings, setCustomerRatings)}
          {renderInput("Popular Product Categories (comma separated)", popularCategories, setPopularCategories)}
          {renderInput("Delivery Reliability Score", deliveryScore, setDeliveryScore)}
          {renderInput("Sales Volume", salesVolume, setSalesVolume)}
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
