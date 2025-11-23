import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ManageBusiness() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Manage Your Business</Text>

            <TouchableOpacity
                style={styles.button}
                onPress={() => router.push('manage-business/add-worker')}
            >
                <Ionicons name="people-outline" size={24} color="#fff" />
                <Text style={styles.btnText}>Add / Manage Workers</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.button}
                onPress={() => router.push('manage-business/company-info')}
            >
                <Ionicons name="business-outline" size={24} color="#fff" />
                <Text style={styles.btnText}>Company Information</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.button}
                onPress={() => router.push('manage-business/product_info')}
            >
                <Ionicons name="cube-outline" size={24} color="#fff" />
                <Text style={styles.btnText}>Product management</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
    title: { fontSize: 24, fontWeight: '700', marginBottom: 30 },
    button: {
        backgroundColor: '#007bff',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    btnText: { color: '#fff', fontSize: 18, marginLeft: 12, fontWeight: '600' },
});
