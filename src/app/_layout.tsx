import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/authStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';

const queryClient = new QueryClient();

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const { theme } = useSettingsStore();
  const { accessToken } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  const currentTheme = theme === 'system' 
    ? (systemColorScheme === 'dark' ? DarkTheme : DefaultTheme)
    : (theme === 'dark' ? DarkTheme : DefaultTheme);

  useEffect(() => {
    // Redirect logic
    const inAuthGroup = segments[0] === 'welcome';

    if (!accessToken && !inAuthGroup) {
      // Redirect to welcome if not logged in
      router.replace('/welcome');
    } else if (accessToken && inAuthGroup) {
      // Redirect to home if logged in and trying to access welcome
      router.replace('/');
    }
  }, [accessToken, segments]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={currentTheme}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
          <Stack.Screen 
            name="phone/[number]" 
            options={{ 
              headerShown: false,
              presentation: 'card'
            }} 
          />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
