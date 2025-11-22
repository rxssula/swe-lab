// app/.../chats.js
import React, { useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    StyleSheet,
    TextInput,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Existing chat list
const chats = [
    {
        id: '1',
        name: 'Alice Johnson',
        lastMessage: 'Hey! Are you coming to the party?',
        time: '12:45 PM',
        avatar: 'https://i.pravatar.cc/150?img=1',
    },
    {
        id: '2',
        name: 'Bob Smith',
        lastMessage: 'Sure, let’s meet tomorrow.',
        time: '11:30 AM',
        avatar: 'https://i.pravatar.cc/150?img=2',
    },
    {
        id: '3',
        name: 'Charlie Davis',
        lastMessage: 'Did you check the document I sent?',
        time: 'Yesterday',
        avatar: 'https://i.pravatar.cc/150?img=3',
    },
];

// Fake linked suppliers/consumers
// Replace with your API later
const linkedContacts = [
    { id: '10', name: 'Supplier A', avatar: 'https://i.pravatar.cc/150?img=11' },
    { id: '11', name: 'Supplier B', avatar: 'https://i.pravatar.cc/150?img=12' },
    { id: '12', name: 'Supplier C', avatar: 'https://i.pravatar.cc/150?img=13' },
];

export default function ChatsList() {
    const router = useRouter();

    const [modalVisible, setModalVisible] = useState(false);
    const [search, setSearch] = useState('');

    const filteredContacts = linkedContacts.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    const openNewChat = (contact) => {
        setModalVisible(false);
        router.push(`/chats/chat`);
    };

    const renderChatRow = ({ item }) => (
        <TouchableOpacity
            style={styles.chatRow}
            onPress={() => router.push(`/chats/chat`)}
        >
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.time}>{item.time}</Text>
                </View>
                <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.lastMessage}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>

            {/* Header with search bar + new chat icon */}
            <View style={styles.topRow}>
                <TextInput
                    placeholder="Search chats..."
                    style={styles.searchBar}
                />
                <TouchableOpacity
                    style={styles.newChatBtn}
                    onPress={() => setModalVisible(true)}
                >
                    <Ionicons name="chatbubble-ellipses-outline" size={26} color="#333" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={chats}
                keyExtractor={(item) => item.id}
                renderItem={renderChatRow}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />

            {/* NEW CHAT POPUP */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.popupWindow}>

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Start New Chat</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={26} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {/* Search inside modal */}
                        <TextInput
                            placeholder="Search contacts..."
                            value={search}
                            onChangeText={setSearch}
                            style={styles.modalSearch}
                        />

                        <FlatList
                            data={filteredContacts}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.contactRow}
                                    onPress={() => openNewChat(item)}
                                >
                                    <Image
                                        source={{ uri: item.avatar }}
                                        style={styles.modalAvatar}
                                    />
                                    <Text style={styles.contactName}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f2f2f2' },

    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#fff',
    },

    searchBar: {
        flex: 1,
        backgroundColor: '#eee',
        padding: 10,
        borderRadius: 10,
        fontSize: 14,
    },

    newChatBtn: {
        marginLeft: 12,
        padding: 5,
    },

    chatRow: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
    chatInfo: { flex: 1 },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    name: { fontSize: 16, fontWeight: 'bold' },
    time: { fontSize: 12, color: '#888' },
    lastMessage: { fontSize: 14, color: '#555' },
    separator: { height: 1, backgroundColor: '#eee', marginLeft: 80 },

    /* Modal styles */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    popupWindow: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    modalSearch: {
        backgroundColor: '#eee',
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    modalAvatar: {
        width: 45,
        height: 45,
        borderRadius: 22,
        marginRight: 12,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '500',
    },
});
