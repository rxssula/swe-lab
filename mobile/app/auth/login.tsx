import { useState } from "react";
import { Text, View, TextInput, Pressable } from "react-native";
import { Link, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";


export default function Index() {
    const [username, setUsername] = useState("");
    const [passcode, setPasscode] = useState("");
    const router = useRouter();

    // const handleLogin = () => {
    //     if (passcode === "1234") {
    //         router.push("/consumer/(tabs)/dashboard");
    //     } else if (passcode === "5678") {
    //         router.push("/supplier/(tabs)/dashboard");
    //     } else {
    //         alert("Please enter a valid code number");
    //     }
    // };

    const handleLogin = async () => {
        if (passcode === "1234") {
            router.push("/consumer/(tabs)/dashboard");
        } else if (passcode === "5678") {
            router.push("/supplier/(tabs)/dashboard");
        } else {
            alert("Please enter a valid code number");
        }

        if (!username || !passcode) {
        alert("Please enter username and passcode");
        return;
    }
    const temp = JSON.stringify({ username, password: passcode });
    console.log(temp);
    try {
        const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", passcode);

        const response = await fetch("https://swe-lab-1.onrender.com/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // optional: "Accept": "application/json"
      },
      body: form.toString(),
    });

       const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log("Non-JSON response:", text);
      throw new Error("Server returned non-JSON response");
    }

    console.log("Response data:", data);

    // Adjust to whatever your backend returns:
    // common FastAPI OAuth returns: { "access_token": "...", "token_type": "bearer" }
    if (response.ok && (data.access_token || data.token)) {
      const token = data.access_token ?? data.token;
      await AsyncStorage.setItem("token", token);

      // if backend returns userType/role:
      if (data.userType === "consumer") {
        router.push("/consumer/(tabs)/dashboard");
      } else if (data.userType === "supplier") {
        router.push("/supplier/(tabs)/dashboard");
      } else {
        // fallback: if server doesn't return role, go to a default or call /me
        router.push("/consumer/(tabs)/dashboard");
      }
    } else {
      // server responded with 4xx, show message if provided
      const msg = data.detail ?? data.message ?? "Invalid username or password";
      alert(JSON.stringify(msg));
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Something went wrong. Check console.");
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
                    Sign up
                </Link>

                <Link href="/consumer/(tabs)/dashboard" className="text-blue-500 text-lg">
                    Catalog page test
                </Link>
            </View>
        </View>
    );
}
