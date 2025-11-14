import { Stack } from "expo-router";
import { NativeBaseProvider } from 'native-base';
import './globals.css';

export default function RootLayout() {
  return (
    <NativeBaseProvider>
      <Stack />
      </NativeBaseProvider>
  );
}
