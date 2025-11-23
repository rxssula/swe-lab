import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function Complaints() {
    const router = useRouter();
    const params = useLocalSearchParams(); 
    const orderId = params.orderId;

    const [complaintText, setComplaintText] = useState('');
    const [photo, setPhoto] = useState(null);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
        });
        if (!result.canceled) setPhoto(result.assets[0].uri);
    };

    const submitComplaint = () => {
        if (!complaintText.trim()) {
            Alert.alert('Error', 'Please enter your complaint.');
            return;
        }
        Alert.alert('Success', 'Complaint submitted successfully!');
        router.back();
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.title}>Report a problem for order {orderId}</Text>

            <Text style={styles.label}>Describe the issue</Text>
            <TextInput
                style={styles.input}
                multiline
                numberOfLines={5}
                placeholder="Write your complaint..."
                value={complaintText}
                onChangeText={setComplaintText}
            />

            <Text style={styles.label}>Attach photo (optional)</Text>
            <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                <Text style={styles.photoBtnText}>Pick Photo</Text>
            </TouchableOpacity>
            {photo && <Image source={{ uri: photo }} style={styles.photoPreview} />}

            <TouchableOpacity style={styles.submitBtn} onPress={submitComplaint}>
                <Text style={styles.submitBtnText}>Submit Complaint</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f7f7f7' },
    title: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
    label: { fontWeight: '600', marginBottom: 6 },
    input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 16, textAlignVertical: 'top' },
    photoBtn: { backgroundColor: '#eee', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
    photoBtnText: { color: '#333', fontWeight: '600' },
    photoPreview: { width: '100%', height: 200, marginBottom: 16, borderRadius: 8 },
    submitBtn: { backgroundColor: '#e74c3c', padding: 14, borderRadius: 8, alignItems: 'center' },
    submitBtnText: { color: '#fff', fontWeight: '700' },
});
