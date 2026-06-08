import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login/index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="register/index" options={{ presentation: 'card' }} />
      <Stack.Screen name="forgot-password/index" options={{ presentation: 'card' }} />
    </Stack>
  );
}
