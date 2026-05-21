import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/authStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import WelcomeScreen from './welcome';

const queryClient = new QueryClient();

function TabLayout() {
  const systemColorScheme = useColorScheme();
  const { theme } = useSettingsStore();
  const { accessToken } = useAuthStore();

  const currentTheme = theme === 'system' 
    ? (systemColorScheme === 'dark' ? DarkTheme : DefaultTheme)
    : (theme === 'dark' ? DarkTheme : DefaultTheme);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={currentTheme}>
        <AnimatedSplashOverlay />
        {!accessToken ? <WelcomeScreen /> : <AppTabs />}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default TabLayout;
