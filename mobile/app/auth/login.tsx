import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { Text, View, TextInput, Pressable, ActivityIndicator, Alert } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "../context/AuthContext";

export default function Index() {
  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const { signIn, isLoading } = useAuth();   

  const onLogin = async () => {
    if (!username || !passcode) {
      Alert.alert("Error", "Please enter username and passcode");
      return;
    }

    try {
      await signIn(username, passcode); 
    } catch (error: any) {
      Alert.alert("Login failed", error.message ?? "Unknown error");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}>
      <View className="flex-1 items-center bg-white px-6">
        <Text className="mt-16 text-7xl text-black font-bold text-center">Welcome BRO</Text>

        <View className="flex-1 w-full justify-center items-center">
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            className="border border-gray-400 rounded-md px-4 py-2 w-full mb-4"
          />

          <TextInput
            value={passcode}
            onChangeText={setPasscode}
            placeholder="Passcode"
            secureTextEntry
            className="border border-gray-400 rounded-md px-4 py-2 w-full mb-6"
          />

          <Pressable
            onPress={onLogin}
            className="bg-blue-500 rounded-md py-3 w-full items-center mb-4"
            disabled={isLoading}
          >
            {isLoading 
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white font-bold text-lg">Log in</Text>
            }
          </Pressable>

          <Link href="/auth/signup" className="text-blue-500 text-lg">Sign up</Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
