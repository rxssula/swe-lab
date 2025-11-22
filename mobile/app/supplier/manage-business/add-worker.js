import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export default function AddWorker() {
    const [username, setUsername] = useState('');
    const [passcode, setPasscode] = useState('');
    const [role, setRole] = useState('sales');

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Add New Worker</Text>

            <Text style={styles.label}>Username</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter worker username"
                value={username}
                onChangeText={setUsername}
            />

            <Text style={styles.label}>Passcode</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter worker passcode"
                secureTextEntry
                value={passcode}
                onChangeText={setPasscode}
            />

            <Text style={styles.label}>Position</Text>
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={role}
                    onValueChange={(value) => setRole(value)}
                >
                    <Picker.Item label="Sales Representative" value="sales" />
                    <Picker.Item label="Manager" value="manager" />
                </Picker>
            </View>

            <TouchableOpacity style={styles.saveBtn}>
                <Text style={styles.saveText}>Save Worker</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
    label: { fontSize: 16, marginTop: 10 },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 12,
        borderRadius: 10,
        marginTop: 5,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        marginTop: 5,
    },
    saveBtn: {
        backgroundColor: '#007bff',
        padding: 14,
        borderRadius: 12,
        marginTop: 25,
        alignItems: 'center',
    },
    saveText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
