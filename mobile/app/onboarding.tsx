import { useState } from "react";
import { Text, View, TextInput, Pressable, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";

export default function Onboarding() {
    const [businessName, setBusinessName] = useState("");
    const [businessType, setBusinessType] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [country, setCountry] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");

    const router = useRouter();

    const handleSignIn = async () => {
        try {
            const response = await fetch("http://127.0.0.1:8000/auth/signup/consumer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    business_name: businessName,
                    business_type: businessType,
                    address,
                    city,
                    country,
                    email,
                    password,
                    phone_number: phoneNumber,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to sign up");
            }

            const data = await response.json();

            // route based on backend role
            if (data.role === "consumer") {
                router.push("/user_role/consumer");
            } else if (data.role === "supplier") {
                router.push("/user_role/supplier");
            } else {
                Alert.alert("Info", "Signed in successfully, but role unknown.");
            }
        } catch (error) {
            Alert.alert("Error", (error as Error).message);
        }
    };

    return (
        <ScrollView className="flex-1 bg-gray-100 px-6 pt-12">
            <Text className="text-3xl font-bold text-center mb-6">Sign In</Text>

            <View className="space-y-4">
                <TextInput
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder="Business Name"
                    className="border border-gray-400 rounded-md px-4 py-2 w-full bg-white"
                />
                <TextInput
                    value={businessType}
                    onChangeText={setBusinessType}
                    placeholder="Business Type"
                    className="border border-gray-400 rounded-md px-4 py-2 w-full bg-white"
                />
                <TextInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Address"
                    className="border border-gray-400 rounded-md px-4 py-2 w-full bg-white"
                />
                <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="City"
                    className="border border-gray-400 rounded-md px-4 py-2 w-full bg-white"
                />
                <TextInput
                    value={country}
                    onChangeText={setCountry}
                    placeholder="Country"
                    className="border border-gray-400 rounded-md px-4 py-2 w-full bg-white"
                />
                <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="border border-gray-400 rounded-md px-4 py-2 w-full bg-white"
                />
                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    secureTextEntry
                    className="border border-gray-400 rounded-md px-4 py-2 w-full bg-white"
                />
                <TextInput
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="Phone Number"
                    keyboardType="phone-pad"
                    className="border border-gray-400 rounded-md px-4 py-2 w-full bg-white"
                />
            </View>

            <Pressable
                onPress={handleSignIn}
                className="bg-blue-500 rounded-md py-3 w-full items-center mt-6 mb-6"
            >
                <Text className="text-white font-bold text-lg">Sign In</Text>
            </Pressable>
        </ScrollView>
    );
}
