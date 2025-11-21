import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    FlatList,
} from "react-native";

export default function CompanyInfo() {

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
    const updateWarehouse = (id, value) =>
        setWarehouses(
            warehouses.map((w) => (w.id === id ? { ...w, address: value } : w))
        );


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


    const renderInput = (label, value, setter) => (
        <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={setter}
                placeholder={`Enter ${label}`}
            />
        </View>
    );

    const renderWarehouse = ({ item }) => (
        <View style={styles.box}>
            <TextInput
                style={styles.input}
                placeholder="Warehouse address"
                value={item.address}
                onChangeText={(val) => updateWarehouse(item.id, val)}
            />
        </View>
    );

    const sections = [
        {
            key: "basic",
            title: "Basic Business Information",
            content: (
                <>
                    {renderInput("Company Name", companyName, setCompanyName)}
                    {renderInput("Company Legal Name", legalName, setLegalName)}
                    {renderInput("BIN", bin, setBin)}
                    {renderInput("Company Type", companyType, setCompanyType)}
                    {renderInput("Business Description", description, setDescription)}
                    {renderInput("Industry Category", industry, setIndustry)}
                    {renderInput("Head Office City", city, setCity)}
                    {renderInput("Business Region Coverage", regionCoverage, setRegionCoverage)}
                </>
            ),
        },
        {
            key: "contact",
            title: "Contact Information",
            content: (
                <>
                    {renderInput("Primary Contact Person", contactPerson, setContactPerson)}
                    {renderInput("Phone", phone, setPhone)}
                    {renderInput("Email", email, setEmail)}
                    {renderInput("Sales Department Phone", salesPhone, setSalesPhone)}
                    {renderInput("Sales Department Email", salesEmail, setSalesEmail)}

                    <Text style={styles.subLabel}>Warehouse Addresses</Text>
                    <FlatList
                        data={warehouses}
                        keyExtractor={(i) => i.id}
                        renderItem={renderWarehouse}
                        scrollEnabled={false}
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={addWarehouse}>
                        <Text style={styles.addBtnText}>+ Add Warehouse</Text>
                    </TouchableOpacity>

                    {renderInput("Working Hours", "", () => {})}
                </>
            ),
        },
        {
            key: "ops",
            title: "Supplier Operational Info",
            content: (
                <>
                    {renderInput("Minimum Order Amount (MOA)", moa, setMoa)}
                    {renderInput("Delivery Methods", deliveryMethods, setDeliveryMethods)}
                    {renderInput("Delivery Schedule", deliverySchedule, setDeliverySchedule)}
                    {renderInput("Lead Time", leadTime, setLeadTime)}
                    {renderInput("Payment Terms", paymentTerms, setPaymentTerms)}
                </>
            ),
        },
        {
            key: "legal",
            title: "Legal & Verification Documents",
            content: (
                <>
                    {renderInput("Business Registration Certificate", businessCert, setBusinessCert)}
                    {renderInput("Tax Certificate", taxCert, setTaxCert)}
                    {renderInput("License", license, setLicense)}
                    {renderInput("Bank Account (IBAN)", iban, setIban)}
                </>
            ),
        },
        {
            key: "performance",
            title: "Business Performance Info",
            content: (
                <>
                    {renderInput("Years in Business", yearsInBusiness, setYearsInBusiness)}
                    {renderInput("Customer Ratings", customerRatings, setCustomerRatings)}
                    {renderInput("Popular Product Categories", popularCategories, setPopularCategories)}
                    {renderInput("Delivery Reliability Score", deliveryScore, setDeliveryScore)}
                    {renderInput("Sales Volume", salesVolume, setSalesVolume)}
                </>
            ),
        },
    ];

    return (
        <FlatList
            data={sections}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
                <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>{item.title}</Text>
                    {item.content}
                </View>
            )}
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
