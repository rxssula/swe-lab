import { Text, View } from "react-native";
import { Link } from "expo-router";

export default function Index() {
  return (
    <View className="flex-1 justify-center items-center">

      <Text className={"text-5xl text-blue-500 font-bold"} >Welcome bro!</Text>
      <Link href="./auth/login">
        <Text style={{ color: 'blue', marginTop: 20 }}>Go to Login</Text>
      </Link>

    </View>
  );
}
