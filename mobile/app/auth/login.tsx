import { useState } from "react";
import { Text, View, TextInput, Pressable } from "react-native";
import { Link, useRouter } from "expo-router";

export default function Index() {
    const [username, setUsername] = useState("");
    const [passcode, setPasscode] = useState("");
    const router = useRouter();

    const handleLogin = () => {
        if (passcode === "1234") {
            router.push("./(tabs)/catalog");
        } else if (passcode === "5678") {
            router.push("/user_role/supplier");
        } else {
            alert("Please enter a valid code number");
        }
    };

    return (
        <View className="flex-1 items-center bg-white px-6">
            {/* Welcome message */}
            <Text className="mt-16 text-7xl text-black font-bold text-center">
                Welcome BRO
            </Text>

            {/* Input fields */}
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

                {/* Login button */}
                <Pressable
                    onPress={handleLogin}
                    className="bg-blue-500 rounded-md py-3 w-full items-center mb-4"
                >
                    <Text className="text-white font-bold text-lg">Log in</Text>
                </Pressable>

                {/* Sign in link */}
                <Link href="/auth/signup" className="text-blue-500 text-lg">
                    Sign in
                </Link>
            </View>
        </View>
    );
}
