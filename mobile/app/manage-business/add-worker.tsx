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
import { useAuth } from '../context/AuthContext'; 

export default function AddWorker() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { user, token, signOut } = useAuth();
  if (!token) signOut();
  console.log(user);
 
  const WORKERS_URL = `https://swe-lab-1.onrender.com/${user.userType}s/${user.id}/staff`;

  let roleOptionsArray: { label: string; value: string }[] = [];
  if (user?.role === "OWNER") {
    roleOptionsArray =
      user.userType === "consumer"
        ? [
            { label: "Staff", value: "STAFF" },
            { label: "Manager", value: "MANAGER" },
          ]
        : [
            { label: "Sales Representative", value: "SALES" },
            { label: "Manager", value: "MANAGER" },
          ];
  } 
  else if (user?.role === "MANAGER") {
    roleOptionsArray =
      user.userType === "consumer"
        ? [{ label: "Staff", value: "STAFF" }]
        : [{ label: "Sales Representative", value: "SALES" }];
  }
  const [role, setRole] = useState<string>(roleOptionsArray[0]?.value || "");

  const validate = () => {
    if (!email.trim()) {
      Alert.alert('Validation', 'Email is required');
      return false;
    }
    if (!password) {
      Alert.alert('Validation', 'Password is required');
      return false;
    }
    if (!phone) {
      Alert.alert('Validation', 'Phone is required');
      return false;
    }
    if (!name) {
      Alert.alert('Validation', 'Name is required');
      return false;
    }
    if (!role) {
      Alert.alert('Validation', 'Position is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      if (!token) {
        Alert.alert('Auth', 'Not authenticated. Please log in.');
        signOut();
        return;
      }

      const payload = {
        email: email.trim(),
        password: password,
        role: role,
        phone_number: phone,
        name: name,
      };
      console.log("payload:", payload);

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
        setEmail('');
        setPassword('');
        setRole(role);
        setName('');
        setPhone('');
      } else {
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

      <Text style={styles.label}>Worker Full Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter worker name"
        value={name}
        onChangeText={setName}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter worker email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Phone</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter worker phone"
        value={phone}
        onChangeText={setPhone}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter worker password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {roleOptionsArray.length > 1 ? (<>
        <Text style={styles.label}>Position</Text>
        <Picker selectedValue={role} onValueChange={(value) => setRole(value)}>
          {roleOptionsArray.map((opt) => (
            <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
          ))}
        </Picker>
      </>
      ): (
        <Text style={styles.label}>
          Position: {roleOptionsArray[0]?.label || "N/A"}
        </Text>
      )}


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
