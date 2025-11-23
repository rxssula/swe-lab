import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    Alert,
    Image,
    Modal,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const SAMPLE_NOTIFS = [
    {
        id: 'n1',
        title: 'Order Shipped',
        body: 'Your order ORD-1001 has been shipped...',
        time: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        unread: true,
        type: 'order',
        sender: 'Supplier #12',
        supplierId: 'supplier12',
        avatar: 'https://i.pravatar.cc/80?img=5',
    },
    {
        id: 'n2',
        title: 'New Message from Support',
        body: "Hi! We're checking your refund request...",
        time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        unread: true,
        type: 'message',
        sender: 'Support Team',
        supplierId: 'support',
        avatar: 'https://i.pravatar.cc/80?img=6',
    },
    {
        id: 'n3',
        title: 'Discount Coupon',
        body: 'Use SAVE20 to get 20% off...',
        time: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        unread: false,
        type: 'promo',
        sender: 'Marketing',
        supplierId: null,
        avatar: 'https://i.pravatar.cc/80?img=7',
    },

    {
        id: 'n4',
        title: 'Request Accepted',
        body: 'Supplier approved your link request.',
        time: new Date().toISOString(),
        unread: true,
        type: 'accepted_request',
        sender: 'Supplier A',
        supplierId: 'supplierA123',
        avatar: 'https://i.pravatar.cc/80?img=9',
    },
];

function timeAgo(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

function NotificationRow({ item, onPress, onLongPress, onToggleRead, onDelete }) {
    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onPress(item)}
            onLongPress={() => onLongPress(item)}
            style={[styles.row, item.unread && styles.rowUnread]}
        >
            <Image source={{ uri: item.avatar }} style={styles.avatar} />

            <View style={styles.content}>
                <View style={styles.rowTop}>
                    <Text style={[styles.title, item.unread && styles.titleUnread]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={styles.time}>{timeAgo(item.time)}</Text>
                </View>

                <View style={styles.rowBottom}>
                    <Text style={[styles.body, item.unread && styles.bodyUnread]} numberOfLines={1}>
                        {item.body}
                    </Text>

                    <View style={styles.actions}>
                        <TouchableOpacity onPress={() => onToggleRead(item)} style={styles.iconBtn}>
                            <Ionicons
                                name={item.unread ? 'mail-unread-outline' : 'mail-open-outline'}
                                size={18}
                                color={item.unread ? '#007bff' : '#666'}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => onDelete(item)} style={styles.iconBtn}>
                            <Ionicons name="trash-outline" size={18} color="#d9534f" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {item.unread ? <View style={styles.unreadDot} /> : null}
        </TouchableOpacity>
    );
}

export default function Notifications() {
    const [notifs, setNotifs] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedNotif, setSelectedNotif] = useState(null);

    useEffect(() => {
        setTimeout(() => setNotifs(SAMPLE_NOTIFS), 200);
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await new Promise((r) => setTimeout(r, 600));

        setNotifs((prev) => [
            {
                id: `n${Date.now()}`,
                title: 'Welcome back!',
                body: 'This is a new notification...',
                time: new Date().toISOString(),
                unread: true,
                sender: 'System',
                supplierId: 'system',
                type: 'info',
                avatar: 'https://i.pravatar.cc/80?img=12',
            },
            ...prev,
        ]);

        setRefreshing(false);
    }, []);

    const openNotification = (item) => {
        setNotifs((prev) => prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n)));
        setSelectedNotif(item);
        setModalVisible(true);
    };

    const longPressAction = (item) => {
        Alert.alert(
            'Notification',
            'Choose an option',
            [
                { text: item.unread ? 'Mark as read' : 'Mark as unread', onPress: () => toggleRead(item) },
                { text: 'Archive', onPress: () => archiveNotification(item) },
                { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(item) },
                { text: 'Cancel', style: 'cancel' },
            ],
            { cancelable: true }
        );
    };

    const toggleRead = (item) => {
        setNotifs((prev) => prev.map((n) => (n.id === item.id ? { ...n, unread: !n.unread } : n)));
    };

    const deleteNotification = (item) => {
        setNotifs((prev) => prev.filter((n) => n.id !== item.id));
    };

    const archiveNotification = (item) => {
        setNotifs((prev) => prev.filter((n) => n.id !== item.id));
        Alert.alert('Archived', 'Notification archived.');
    };

    const markAllRead = () => {
        setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })));
    };

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={markAllRead} style={styles.headerBtn}>
                        <Ionicons name="mail-open-outline" size={20} color="#007bff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setNotifs([])} style={styles.headerBtn}>
                        <Ionicons name="trash-outline" size={20} color="#d9534f" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={notifs}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <NotificationRow
                        item={item}
                        onPress={openNotification}
                        onLongPress={longPressAction}
                        onToggleRead={toggleRead}
                        onDelete={deleteNotification}
                    />
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                contentContainerStyle={
                    notifs.length === 0 ? styles.flatEmptyContainer : styles.flatContainer
                }
                ListEmptyComponent={() => (
                    <View style={styles.empty}>
                        <Ionicons name="notifications-off-outline" size={56} color="#bbb" />
                        <Text style={styles.emptyTitle}>No notifications</Text>
                        <Text style={styles.emptySub}>You're all caught up.</Text>
                    </View>
                )}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />

            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        {selectedNotif && (
                            <>
                                <Text style={styles.modalTitle}>{selectedNotif.title}</Text>
                                <Text style={styles.modalSender}>From: {selectedNotif.sender}</Text>
                                <Text style={styles.modalDate}>
                                    Date: {new Date(selectedNotif.time).toLocaleString()}
                                </Text>

                                <ScrollView style={styles.modalScroll}>
                                    <Text style={styles.modalBody}>{selectedNotif.body}</Text>
                                </ScrollView>

                                {selectedNotif.type === 'accepted_request' &&
                                    selectedNotif.supplierId && (
                                        <TouchableOpacity
                                            style={styles.chatBtn}
                                            onPress={() => {
                                                setModalVisible(false);
                                                router.push(
                                                    `/chats/chat?supplier=${selectedNotif.supplierId}`
                                                );
                                            }}
                                        >
                                            <Ionicons
                                                name="chatbubble-ellipses-outline"
                                                size={18}
                                                color="#fff"
                                            />
                                            <Text style={styles.chatBtnText}>Chat with Supplier</Text>
                                        </TouchableOpacity>
                                    )}

                                <TouchableOpacity
                                    style={styles.closeBtn}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.closeBtnText}>Close</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const AVATAR = 48;
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f7f7f7' },

    header: {
        height: 56,
        paddingHorizontal: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    headerRight: { flexDirection: 'row' },
    headerBtn: { padding: 8, marginLeft: 6 },

    flatContainer: { paddingVertical: 8 },
    flatEmptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    row: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    rowUnread: { backgroundColor: '#eef7ff' },
    avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, marginRight: 12 },

    content: { flex: 1 },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
    title: { fontSize: 15, color: '#222' },
    titleUnread: { fontWeight: '700' },
    time: { fontSize: 12, color: '#888' },

    rowBottom: { flexDirection: 'row', marginTop: 6 },
    body: { flex: 1, color: '#666' },
    bodyUnread: { color: '#333' },

    actions: { flexDirection: 'row', marginLeft: 8 },
    iconBtn: { paddingHorizontal: 6 },

    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 10,
        backgroundColor: '#007bff',
        marginLeft: 8,
    },

    separator: { height: 8, backgroundColor: '#f7f7f7' },

    empty: { alignItems: 'center', padding: 40 },
    emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '600' },
    emptySub: { marginTop: 6, color: '#aaa' },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        padding: 20,
    },
    modalBox: {
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 12,
        maxHeight: '80%',
    },
    modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6, color: '#222' },
    modalSender: { fontSize: 14, color: '#444', marginBottom: 4 },
    modalDate: { fontSize: 13, color: '#777', marginBottom: 10 },

    modalScroll: { maxHeight: 250, marginBottom: 16 },
    modalBody: { fontSize: 15, color: '#333', lineHeight: 22 },

    chatBtn: {
        flexDirection: 'row',
        backgroundColor: '#007bff',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    chatBtnText: { color: '#fff', fontSize: 15, marginLeft: 6, fontWeight: '600' },

    closeBtn: {
        backgroundColor: '#ddd',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    closeBtnText: { fontSize: 15, color: '#333', fontWeight: '600' },
});
