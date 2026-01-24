import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Import Buffer polyfill
import { Buffer } from 'buffer';
global.Buffer = Buffer;

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="pay-confirm" options={{ title: 'Confirm Payment', headerBackTitle: 'Back' }} />
        <Stack.Screen name="success" options={{ title: 'Payment Success', headerBackTitle: 'Back' }} />
        <Stack.Screen name="fail" options={{ title: 'Payment Failed', headerBackTitle: 'Back' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
