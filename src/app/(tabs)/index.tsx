import React from 'react';
import { ScrollView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/lib/stores/authStore';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top + Spacing.four,
      paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">{t('common.appName')}</ThemedText>
        <ThemedText style={styles.welcomeText}>
          {t('auth.welcome')}, {user?.displayName || user?.email || 'User'}!
        </ThemedText>
        
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">{t('home.dashboard')}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {t('home.dashboardDesc')}
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.four,
  },
  container: {
    gap: Spacing.four,
  },
  welcomeText: {
    fontSize: 18,
    opacity: 0.8,
  },
  card: {
    padding: Spacing.four,
    borderRadius: 20,
    marginTop: Spacing.two,
  },
});
