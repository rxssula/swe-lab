import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext'; // adjust path if needed

export default function AddWorker() {
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [role, setRole] = useState('sales');
  const [isSaving, setIsSaving] = useState(false);

  // try to get token from AuthProvider if available
  let tokenFromContext: string | null = null;
  try {
    // safe: if useAuth isn't available, this will throw — we catch below by try/catch
    // If you definitely have AuthProvider, you can just: const { token } = useAuth();
    // and remove the try-catch below.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const auth = useAuth();
    tokenFromContext = auth?.token ?? null;
  } catch {
    tokenFromContext = null;
  }

  const TOKEN_KEY = 'token'; // or 'userToken' if you use SecureStore / different key
  const WORKERS_URL = 'https://swe-lab-1.onrender.com/supplier/workers/'; // <- change to your API endpoint

  const getToken = async () => {
    if (tokenFromContext) return tokenFromContext;
    const t = await AsyncStorage.getItem(TOKEN_KEY);
    return t;
  };

  const validate = () => {
    if (!username.trim()) {
      Alert.alert('Validation', 'Username is required');
      return false;
    }
    if (!passcode) {
      Alert.alert('Validation', 'Passcode is required');
      return false;
    }
    // optional: add password rules, username format, etc.
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Auth', 'Not authenticated. Please log in.');
        return;
      }

      // Build payload — adapt field names to backend (username, password, role are common)
      const payload = {
        username: username.trim(),
        password: passcode,
        role, // e.g. 'sales' or 'manager'
        // add any extra fields required by your API here
      };

      const resp = await fetch(WORKERS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }

      if (resp.ok) {
        Alert.alert('Success', 'Worker added successfully');
        // reset form
        setUsername('');
        setPasscode('');
        setRole('sales');
        // optionally: navigate back or refresh list of workers
      } else {
        // show helpful error message
        const msg =
          (data?.detail && Array.isArray(data.detail)
            ? data.detail.map((d: any) => d.msg ?? JSON.stringify(d)).join('\n')
            : data?.detail ?? data?.message ?? text) || `Failed (${resp.status})`;
        Alert.alert('Save failed', String(msg));
        console.warn('AddWorker save failed', resp.status, text);
      }
    } catch (err) {
      console.error('AddWorker error', err);
      Alert.alert('Error', 'Network error or unexpected response. See console.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add New Worker</Text>

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter worker username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
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
        <Picker selectedValue={role} onValueChange={(value) => setRole(value)}>
          <Picker.Item label="Sales Representative" value="sales" />
          <Picker.Item label="Manager" value="manager" />
        </Picker>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Worker</Text>}
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
