import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import '@/lib/i18n';
import { useCallOverlay } from '@/lib/hooks/useCallOverlay';
import { useAuthStore } from '@/lib/stores/authStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';

const queryClient = new QueryClient();

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const { theme } = useSettingsStore();
  const { accessToken, _hasHydrated, setTokens, setUser } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useCallOverlay();

  const currentTheme = theme === 'system'
    ? (systemColorScheme === 'dark' ? DarkTheme : DefaultTheme)
    : (theme === 'dark' ? DarkTheme : DefaultTheme);

  useEffect(() => {
    console.log('[Layout] hydrated:', _hasHydrated, 'accessToken:', !!accessToken, 'segments:', segments);
    if (!_hasHydrated) return;

    // Get the first segment without the /index part
    const inAuthGroup = segments[0] === '(auth)';

    if (!accessToken && !inAuthGroup) {
      router.replace('/login');
    } else if (accessToken && inAuthGroup) {
      router.replace('/');
    }
  }, [accessToken, segments, _hasHydrated]);

  if (!_hasHydrated) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={currentTheme}>
          <AnimatedSplashOverlay />
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={currentTheme}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen
            name="contact-picker"
            options={{
              headerShown: false,
              presentation: 'card',
            }}
          />
          <Stack.Screen 
            name="phone/[number]" 
            options={{ 
              headerShown: false,
              presentation: 'card'
            }} 
          />
          <Stack.Screen
            name="tags"
            options={{
              headerShown: false,
              presentation: 'card',
            }}
          />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
