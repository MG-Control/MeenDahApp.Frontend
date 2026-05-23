import React from 'react';
import { ScrollView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/lib/stores/authStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useContactSync } from '@/lib/hooks/useContactSync';
import { TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { hasSyncedContacts } = useSettingsStore();
  const { syncContacts, isSyncing } = useContactSync();

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

        {!hasSyncedContacts && (
          <ThemedView type="backgroundElement" style={[styles.card, styles.syncCard]}>
            <View style={styles.syncIconContainer}>
              <Ionicons name="people-outline" size={32} color="#3c87f7" />
            </View>
            <View style={styles.syncContent}>
              <ThemedText type="subtitle">{t('contacts.syncTitle')}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.syncDesc}>
                {t('contacts.syncDesc')}
              </ThemedText>
              <TouchableOpacity 
                style={[styles.syncButton, { backgroundColor: '#3c87f7' }]} 
                onPress={() => syncContacts()}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="sync" size={18} color="white" />
                    <ThemedText style={styles.syncButtonText}>{t('contacts.syncButton')}</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ThemedView>
        )}
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
  syncCard: {
    flexDirection: 'row',
    gap: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(60, 135, 247, 0.2)',
  },
  syncIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(60, 135, 247, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncContent: {
    flex: 1,
    gap: Spacing.two,
  },
  syncDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: Spacing.two,
  },
  syncButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
