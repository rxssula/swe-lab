import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, isLoading, signOut, token } = useAuth();
  const router = useRouter();

  if (isLoading || !user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  
  const email = user.email ?? '—';
  const phone = user.phone ?? '—';
  const avatar = user.avatar_url ?? user.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}`;
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [manager, setManager] = useState('');
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [linkedUsers, setLinkedUsers] = useState([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        signOut();
        return;
      }
      try {
        const resp = await fetch('https://swe-lab-1.onrender.com/auth/me', {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (!resp.ok) throw new Error('Failed to fetch user info');
        const data = await resp.json();
        console.log("data:", data)

        const assoc = data.supplier_associations?.[0] || data.consumer_associations?.[0];
        setBusinessName(assoc?.supplier?.business_name || assoc?.consumer?.business_name || '');
        setBusinessType(assoc?.supplier?.business_type || assoc?.consumer?.business_type || '');
        setManager(assoc?.manager || '');
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to load user info');
      }
    };

    fetchUser();
  }, [token]);

  const fetchLinkedUsers = async () => {
    if (!token) return;

    setLoadingLinks(true);
    try {
      const resp = await fetch('https://swe-lab-1.onrender.com/links/my-links', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      if (!resp.ok) throw new Error('Failed to fetch linked users');

      const data = await resp.json();
      setLinkedUsers(Array.isArray(data) ? data : []);
      setShowLinksModal(true);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load linked users');
    } finally {
      setLoadingLinks(false);
    }
  };

  const handleDeleteLink = async (linkId, linkName) => {
    if (!token || !linkId) return;

    Alert.alert(
      'Remove Link',
      `Are you sure you want to remove the link with ${linkName}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const url = `https://swe-lab-1.onrender.com/links/requests/${linkId}`;
              const resp = await fetch(url, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                  Accept: 'application/json',
                },
              });

              if (resp.ok) {
                Alert.alert('Success', 'Link removed successfully!');
                setLinkedUsers(prev => prev.filter(link => link.id !== linkId));
              } else {
                const text = await resp.text().catch(() => null);
                console.warn('Delete link failed', resp.status, text);
                Alert.alert('Error', 'Failed to remove link.');
              }
            } catch (err) {
              console.error('Delete link error', err);
              Alert.alert('Network Error', 'Could not remove link. Try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          <TouchableOpacity style={styles.editAvatar}>
            <Ionicons name="pencil" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.infoRight}>
              <Text style={styles.infoText}>{email}</Text>
              <TouchableOpacity style={styles.editButton}>
                <Ionicons name="pencil" size={16} color="#007bff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone</Text>
            <View style={styles.infoRight}>
              <Text style={styles.infoText}>{phone}</Text>
              <TouchableOpacity style={styles.editButton}>
                <Ionicons name="pencil" size={16} color="#007bff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Business Name</Text>
            <View style={styles.infoRight}>
              <Text style={styles.infoText}>{businessName}</Text>
              <TouchableOpacity style={styles.editButton}>
                <Ionicons name="pencil" size={16} color="#007bff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Business type</Text>
            <View style={styles.infoRight}>
              <Text style={styles.infoText}>{businessType}</Text>
              <TouchableOpacity style={styles.editButton}>
                <Ionicons name="pencil" size={16} color="#007bff" />
              </TouchableOpacity>
            </View>
          </View>

          {user.role === 'SALES' | user.role === 'STAFF' ? (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Manager:</Text>
              <View style={styles.infoRight}>
                <Text style={styles.infoText}>{manager}</Text>
                <TouchableOpacity style={styles.editButton}>
                  <Ionicons name="pencil" size={16} color="#007bff" />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        {(user?.role === "MANAGER" || user?.role === "OWNER") && (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => router.push('manage-business')}
          >
            <Ionicons name="business-outline" size={22} color="#fff" />
            <Text style={styles.manageButtonText}>Manage Business</Text>
          </TouchableOpacity>
        )}

        {user?.userType?.toLowerCase() === 'consumer' && (
          <TouchableOpacity
            style={styles.linksButton}
            onPress={fetchLinkedUsers}
            disabled={loadingLinks}
          >
            {loadingLinks ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="link-outline" size={22} color="#fff" />
                <Text style={styles.linksButtonText}>My Linked Users</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.bottomButton, { backgroundColor: '#ff4d4d' }]}
          onPress={signOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={[styles.bottomButtonText, { color: '#fff' }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showLinksModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLinksModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>My Linked Users</Text>
            <ScrollView style={styles.modalScroll}>
              {linkedUsers.length === 0 ? (
                <Text style={styles.emptyText}>No linked users yet.</Text>
              ) : (
                linkedUsers.map((link) => {
                  const userType = user?.userType?.toLowerCase() || 'consumer';
                  const userName = userType === 'supplier'
                    ? (link.consumer_name || 'Unknown Consumer')
                    : (link.supplier_name || 'Unknown Supplier');
                  const userRole = userType === 'supplier' ? 'Consumer' : 'Supplier';

                  const linkDate = link.responded_at || link.requested_at;
                  const formattedDate = linkDate
                    ? new Date(linkDate).toLocaleDateString()
                    : 'N/A';

                  return (
                    <View key={link.id} style={styles.linkCard}>
                      <View style={styles.linkCardContent}>
                        <View style={styles.linkInfo}>
                          <View style={styles.linkHeader}>
                            <Ionicons
                              name="person-circle-outline"
                              size={24}
                              color="#007bff"
                            />
                            <View style={styles.linkNameContainer}>
                              <Text style={styles.linkName}>{userName}</Text>
                              <Text style={styles.linkRole}>{userRole}</Text>
                            </View>
                          </View>
                          <View style={styles.linkDetails}>
                            <Text style={styles.linkDetail}>
                              Status: <Text style={styles.linkStatus}>{link.status}</Text>
                            </Text>
                            <Text style={styles.linkDetail}>
                              Date: {formattedDate}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteLinkButton}
                          onPress={() => handleDeleteLink(link.id, userName)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowLinksModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    linksButton: {
        backgroundColor: '#10b981',
        paddingVertical: 14,
        borderRadius: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    linksButtonText: {
        color: '#fff',
        fontSize: 18,
        marginLeft: 8,
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalBox: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 16,
        color: '#333',
    },
    modalScroll: {
        maxHeight: 400,
    },
    emptyText: {
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
    },
    linkCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    linkCardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    linkInfo: {
        flex: 1,
    },
    linkHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    linkNameContainer: {
        flex: 1,
        marginLeft: 8,
    },
    linkName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    linkRole: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
    },
    linkDetails: {
        marginTop: 4,
    },
    linkDetail: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    linkStatus: {
        fontWeight: '600',
        color: '#10b981',
        textTransform: 'capitalize',
    },
    modalCloseButton: {
        marginTop: 16,
        backgroundColor: '#e5e7eb',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalCloseText: {
        fontSize: 16,
        color: '#374151',
        fontWeight: '600',
    },
    deleteLinkButton: {
        backgroundColor: '#ef4444',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
});
