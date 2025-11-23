// app/_layout.js
import React from 'react';
import { Stack } from 'expo-router';
import './globals.css';
import { AuthProvider } from './context/AuthContext';


export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        {/* The (tabs) group contains your bottom tabs */}

        {/* Auth screens are separate stack screens, not tabs */}
        <Stack.Screen name="auth" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
