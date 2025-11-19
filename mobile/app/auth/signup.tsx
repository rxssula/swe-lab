import { useState } from "react";
import { Text, View, TextInput, Pressable, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";

export default function Signup() {
    const [businessName, setBusinessName] = useState("");
    const [businessType, setBusinessType] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [country, setCountry] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [role, setRole] = useState<"consumer" | "supplier" | "">("");

    const router = useRouter();

    const handleSignUp = async () => {
        // Validation
        if (!businessName || !email || !password || !role) {
            Alert.alert("Error", "Please fill in all required fields");
            return;
        }

        try {
            const response = await fetch(`https://swe-lab-1.onrender.com/auth/signup/consumer/`, {
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
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to sign up");
            }

            const data = await response.json();
            Alert.alert("Success", "Account created successfully!");

            // Route to dashboard
            router.push("/consumer/(tabs)/dashboard");
        } catch (error) {
            Alert.alert("Error", (error as Error).message);
        }
    };

    return (
        <ScrollView className="flex-1 bg-gradient-to-b from-blue-50 to-white">
            <View className="px-6 pt-16 pb-8">
                {/* Header */}
                <View className="mb-8">
                    <Text className="text-4xl font-bold text-gray-800 text-center mb-2">
                        Create Account
                    </Text>
                </View>

                {/* Role Selection */}
                <View className="mb-6">
                    <Text className="text-lg font-semibold text-gray-700 mb-3">
                        Select Your Role *
                    </Text>
                    <View className="flex-row gap-3">
                        <Pressable
                            onPress={() => setRole("consumer")}
                            className={`flex-1 py-4 rounded-xl border-2 items-center ${
                                role === "consumer"
                                    ? "bg-blue-500 border-blue-500"
                                    : "bg-white border-gray-300"
                            }`}
                        >
                            <Text
                                className={`font-semibold text-base ${
                                    role === "consumer" ? "text-white" : "text-gray-700"
                                }`}
                            >
                                🛒 Consumer
                            </Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setRole("supplier")}
                            className={`flex-1 py-4 rounded-xl border-2 items-center ${
                                role === "supplier"
                                    ? "bg-blue-500 border-blue-500"
                                    : "bg-white border-gray-300"
                            }`}
                        >
                            <Text
                                className={`font-semibold text-base ${
                                    role === "supplier" ? "text-white" : "text-gray-700"
                                }`}
                            >
                                📦 Supplier
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* Form Fields */}
                <View className="space-y-4">
                    {/* Business Name */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 mb-2">
                            Business Name *
                        </Text>
                        <TextInput
                            value={businessName}
                            onChangeText={setBusinessName}
                            placeholder="Enter your business name"
                            className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-base"
                        />
                    </View>

                    {/* Business Type */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 mb-2">
                            Business Type
                        </Text>
                        <TextInput
                            value={businessType}
                            onChangeText={setBusinessType}
                            placeholder="e.g., Restaurant, Retail, Wholesale"
                            className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-base"
                        />
                    </View>

                    {/* Email */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 mb-2">
                            Email *
                        </Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="your@email.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-base"
                        />
                    </View>

                    {/* Password */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 mb-2">
                            Password *
                        </Text>
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Create a strong password"
                            secureTextEntry
                            className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-base"
                        />
                    </View>

                    {/* Phone Number */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 mb-2">
                            Phone Number
                        </Text>
                        <TextInput
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            placeholder="+1 (555) 000-0000"
                            keyboardType="phone-pad"
                            className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-base"
                        />
                    </View>

                    {/* Address */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 mb-2">
                            Address
                        </Text>
                        <TextInput
                            value={address}
                            onChangeText={setAddress}
                            placeholder="Street address"
                            className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-base"
                        />
                    </View>

                    {/* City & Country */}
                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <Text className="text-sm font-medium text-gray-700 mb-2">
                                City
                            </Text>
                            <TextInput
                                value={city}
                                onChangeText={setCity}
                                placeholder="City"
                                className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-base"
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-sm font-medium text-gray-700 mb-2">
                                Country
                            </Text>
                            <TextInput
                                value={country}
                                onChangeText={setCountry}
                                placeholder="Country"
                                className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-base"
                            />
                        </View>
                    </View>
                </View>

                {/* Sign Up Button */}
                <Pressable
                    onPress={handleSignUp}
                    className="bg-blue-500 rounded-xl py-4 items-center mt-8 mb-4 shadow-lg"
                    style={({ pressed }) => ({
                        opacity: pressed ? 0.8 : 1,
                    })}
                >
                    <Text className="text-white font-bold text-lg">
                        Create Account
                    </Text>
                </Pressable>

                {/* Sign In Link */}
                <View className="flex-row justify-center mb-8">
                    <Text className="text-gray-600">Already have an account? </Text>
                    <Pressable onPress={() => router.push("/auth/login")}>
                        <Text className="text-blue-500 font-semibold">Sign In</Text>
                    </Pressable>
                </View>
            </View>
        </ScrollView>
    );
}