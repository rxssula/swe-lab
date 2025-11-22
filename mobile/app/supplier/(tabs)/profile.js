import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from "../../context/AuthContext"; 

export default function Profile() {
    const { signOut } = useAuth();
    const router = useRouter();
    const user = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1 234 567 890',
        avatar: 'https://i.pravatar.cc/150?img=3',
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    <Image source={{ uri: user.avatar }} style={styles.avatar} />
                    <TouchableOpacity style={styles.editAvatar}>
                        <Ionicons name="pencil" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* User Info */}
                <View style={styles.infoContainer}>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Name</Text>
                        <View style={styles.infoRight}>
                            <Text style={styles.infoText}>{user.name}</Text>
                            <TouchableOpacity style={styles.editButton}>
                                <Ionicons name="pencil" size={16} color="#007bff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Email</Text>
                        <View style={styles.infoRight}>
                            <Text style={styles.infoText}>{user.email}</Text>
                            <TouchableOpacity style={styles.editButton}>
                                <Ionicons name="pencil" size={16} color="#007bff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Phone</Text>
                        <View style={styles.infoRight}>
                            <Text style={styles.infoText}>{user.phone}</Text>
                            <TouchableOpacity style={styles.editButton}>
                                <Ionicons name="pencil" size={16} color="#007bff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* NEW — Manage Business Button */}
                <TouchableOpacity
                    style={styles.manageButton}
                    onPress={() => router.push('/supplier/manage-business')}
                >
                    <Ionicons name="business-outline" size={22} color="#fff" />
                    <Text style={styles.manageButtonText}>Manage Business</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Bottom Buttons */}
            <View style={styles.bottomButtons}>
                <TouchableOpacity style={styles.bottomButton}>
                    <Ionicons name="settings-outline" size={20} color="#007bff" />
                    <Text style={styles.bottomButtonText}>Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.bottomButton, { backgroundColor: '#ff4d4d' }]}
                    onPress={signOut}
                >
                    <Ionicons name="log-out-outline" size={20} color="#fff" />
                    <Text style={[styles.bottomButtonText, { color: '#fff' }]}>Logout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    scrollContainer: { padding: 20, paddingBottom: 120 },
    avatarContainer: { alignItems: 'center', marginBottom: 30 },
    avatar: { width: 120, height: 120, borderRadius: 60 },
    editAvatar: {
        position: 'absolute',
        bottom: 0,
        right: 120 / 2 - 15,
        backgroundColor: '#007bff',
        padding: 8,
        borderRadius: 20,
    },
    infoContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        marginBottom: 25,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    label: { fontSize: 16, color: '#888' },
    infoRight: { flexDirection: 'row', alignItems: 'center' },
    infoText: { fontSize: 16, marginRight: 10 },
    editButton: { padding: 4 },

    // NEW
    manageButton: {
        backgroundColor: '#007bff',
        paddingVertical: 14,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    manageButtonText: {
        color: '#fff',
        fontSize: 18,
        marginLeft: 8,
        fontWeight: '600',
    },

    bottomButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 15,
        borderTopWidth: 1,
        borderColor: '#ddd',
        backgroundColor: '#fff',
    },
    bottomButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        backgroundColor: '#e6f0ff',
    },
    bottomButtonText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#007bff',
        fontWeight: 'bold',
    },
});
