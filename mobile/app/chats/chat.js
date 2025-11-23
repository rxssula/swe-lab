// app/Chat.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-audio';
import * as FileSystem from 'expo-file-system';

// Optional: import upload helper if you want to upload to server
// import { uploadFileToServer } from './utils/uploadFile';

export default function Chat() {
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hello!', sender: 'other', type: 'text' },
    { id: '2', text: 'Hi! How are you?', sender: 'me', type: 'text' },
  ]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef(null);

  // Recording state
  const recordingRef = useRef(null); // Audio.Recording instance
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Playback state
  const soundRef = useRef(null); // Audio.Sound instance
  const [playingId, setPlayingId] = useState(null);

  // Auto-scroll when messages change
  useEffect(() => {
    // small delay to let layout update
    const t = setTimeout(() => {
      try {
        flatListRef.current?.scrollToEnd({ animated: true });
      } catch {
        // fallback for some RN versions
        try {
          const lastIndex = messages.length - 1;
          if (lastIndex >= 0) flatListRef.current?.scrollToIndex({ index: lastIndex, animated: true });
        } catch {}
      }
    }, 120);
    return () => clearTimeout(t);
  }, [messages]);

  // Clean up sound when component unmounts
  useEffect(() => {
    return () => {
      (async () => {
        if (soundRef.current) {
          try { await soundRef.current.unloadAsync(); } catch {}
          soundRef.current = null;
        }
        if (recordingRef.current) {
          try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
          recordingRef.current = null;
        }
      })();
    };
  }, []);

  const sendTextMessage = () => {
    if (!inputText.trim()) return;
    const newMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'me',
      type: 'text',
    };
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
  };

  // ======================
  // Voice recording (expo-av)
  // ======================
  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Microphone permission required', 'Please allow microphone access to record voice messages.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording) {
          setRecordingDuration(status.durationMillis || 0);
        }
      });
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (e) {
      console.warn('startRecording error', e);
      Alert.alert('Recording failed', 'Could not start recording.');
    }
  };

  const stopRecordingAndSend = async () => {
    try {
      const recording = recordingRef.current;
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const status = await recording.getStatusAsync();
      const durationMillis = status.durationMillis ?? 0;

      // Optional: upload to server and get URL here
      // const uploadRes = await uploadFileToServer(uri, `voice-${Date.now()}.m4a`, 'audio/m4a');
      // const remoteUrl = uploadRes.url;

      const newMessage = {
        id: Date.now().toString(),
        type: 'voice',
        uri, // local uri; if you uploaded, replace with remoteUrl
        duration: durationMillis,
        sender: 'me',
      };
      setMessages(prev => [...prev, newMessage]);

      // cleanup
      recordingRef.current = null;
      setIsRecording(false);
      setRecordingDuration(0);
    } catch (e) {
      console.warn('stopRecording error', e);
      Alert.alert('Recording failed', 'Could not stop recording or save the file.');
    }
  };

  // ======================
  // Playback for voice messages
  // ======================
  const playVoice = async (message) => {
    try {
      // stop previous
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch {}
        soundRef.current = null;
      }

      setPlayingId(message.id);
      const { sound } = await Audio.Sound.createAsync(
        { uri: message.uri },
        { shouldPlay: true }
      );
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate(status => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setPlayingId(null);
          (async () => {
            try { await sound.unloadAsync(); } catch {}
            soundRef.current = null;
          })();
        }
      });
    } catch (e) {
      console.warn('playVoice error', e);
      setPlayingId(null);
      Alert.alert('Playback error', 'Could not play this voice message.');
    }
  };

  // ======================
  // Document picker
  // ======================
  const pickDocumentAndSend = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (res.type === 'cancel') return;

      // If large file or you need to upload, do it here.
      const newMessage = {
        id: Date.now().toString(),
        type: 'file',
        uri: res.uri,
        name: res.name,
        mimeType: res.mimeType || 'application/octet-stream',
        sender: 'me',
      };
      setMessages(prev => [...prev, newMessage]);

      // Optional: upload right away
      // const uploadRes = await uploadFileToServer(res.uri, res.name, res.mimeType);
      // then set message.uri = uploadRes.url
    } catch (e) {
      console.warn('pickDocument error', e);
      Alert.alert('File error', 'Could not pick the document.');
    }
  };

  // open a file (document or audio)
  const openFile = async (item) => {
    try {
      // For local files, Linking can often open them; on Android content URIs may need special handling.
      await Linking.openURL(item.uri);
    } catch (e) {
      console.warn('openFile error', e);
      Alert.alert('Open file failed', 'Could not open this file.');
    }
  };

  // Render different message types
  const renderItem = ({ item }) => {
    const containerStyle = [
      styles.messageContainer,
      item.sender === 'me' ? styles.myMessage : styles.otherMessage,
    ];

    if (item.type === 'voice') {
      const seconds = Math.round((item.duration || 0) / 1000);
      return (
        <View style={containerStyle}>
          <TouchableOpacity onPress={() => playVoice(item)}>
            <Text style={styles.messageText}>
              {playingId === item.id ? 'Playing...' : `🎤 Voice • ${seconds}s`}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (item.type === 'file') {
      return (
        <View style={containerStyle}>
          <TouchableOpacity onPress={() => openFile(item)}>
            <Text style={styles.messageText}>📎 {item.name || 'Document'}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // default text
    return (
      <View style={containerStyle}>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        // extraData to re-render when playingId changes
        extraData={playingId}
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[styles.iconButton]}
          onPress={pickDocumentAndSend}
          accessibilityLabel="Attach document"
        >
          <Ionicons name="document-outline" size={22} color="#007bff" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
        />

        <TouchableOpacity
          style={[styles.iconButton, isRecording ? styles.recordingButton : null]}
          onPress={isRecording ? stopRecordingAndSend : startRecording}
          accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <Ionicons name={isRecording ? 'stop' : 'mic'} size={20} color={isRecording ? '#fff' : '#007bff'} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sendButton} onPress={sendTextMessage}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  messagesList: { padding: 12, paddingBottom: 6 },
  messageContainer: {
    maxWidth: '78%',
    padding: 10,
    borderRadius: 12,
    marginVertical: 6,
  },
  myMessage: {
    backgroundColor: '#007bff',
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#e0e0e0',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
  },
  messageText: { color: '#fff' }, // file/voice text uses white on blue; other blue messages are white
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f6f6f6',
    borderRadius: 25,
    paddingHorizontal: 15,
    fontSize: 16,
    height: 44,
  },
  sendButton: {
    backgroundColor: '#007bff',
    borderRadius: 20,
    padding: 10,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: '#dc3545',
    borderRadius: 20,
    padding: 8,
  },
});
