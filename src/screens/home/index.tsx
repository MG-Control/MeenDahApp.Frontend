import React, { useState } from 'react';
import { ScrollView, Platform, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/lib/stores/authStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useContactSync } from '@/lib/hooks/useContactSync';
import { useCallOverlay } from '@/lib/hooks/useCallOverlay';
import { callDetection } from '@/lib/native/callDetection';
import { styles } from './styles';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { hasSyncedContacts } = useSettingsStore();
  const { syncContacts, isSyncing } = useContactSync();
  const { isDefaultCallerId, requestDefaultCallerId, checkDefaultStatus } = useCallOverlay();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestDefault = async () => {
    setIsRequesting(true);
    await requestDefaultCallerId();
    await checkDefaultStatus();
    setIsRequesting(false);
  };

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
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}
    >
      <ThemedView style={styles.container}>
        <ThemedText type="title">{t('common.appName')}</ThemedText>
        <ThemedText style={styles.welcomeText}>
          {t('auth.welcome')}, {user?.displayName || user?.email || 'User'}!
        </ThemedText>

        {/* Caller ID Setup Card - Most Important */}
        {Platform.OS === 'android' && (
          <ThemedView type="backgroundElement" style={[styles.card, styles.syncCard, {
            borderColor: isDefaultCallerId === false ? 'rgba(255, 59, 48, 0.3)' : 'rgba(60, 135, 247, 0.2)',
            backgroundColor: isDefaultCallerId === false ? 'rgba(255, 59, 48, 0.05)' : undefined,
          }]}>
            <View style={[styles.syncIconContainer, {
              backgroundColor: isDefaultCallerId === false ? 'rgba(255, 59, 48, 0.1)' : 'rgba(60, 135, 247, 0.1)',
            }]}>
              <Ionicons
                name={isDefaultCallerId ? 'checkmark-circle' : 'warning'}
                size={28}
                color={isDefaultCallerId === false ? '#FF3B30' : '#3c87f7'}
              />
            </View>
            <View style={styles.syncContent}>
              <ThemedText type="subtitle">
                {isDefaultCallerId ? 'Caller ID Enabled' : 'Enable Caller ID'}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.syncDesc}>
                {isDefaultCallerId
                  ? 'Great! Meendah will show you who is calling.'
                  : 'Set Meendah as your default caller ID app to see who is calling.'}
              </ThemedText>
              {isDefaultCallerId === false && (
                <TouchableOpacity
                  style={[styles.syncButton, { backgroundColor: '#FF3B30' }]}
                  onPress={handleRequestDefault}
                  disabled={isRequesting}
                >
                  {isRequesting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={18} color="white" />
                      <ThemedText style={styles.syncButtonText}>Enable Now</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ThemedView>
        )}

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">{t('home.dashboard')}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {t('home.dashboardDesc')}
          </ThemedText>
        </ThemedView>

        {/* Test Buttons - For Development */}
        {__DEV__ && Platform.OS === 'android' && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="subtitle">🛠️ Test Overlay</ThemedText>
            <ThemedText themeColor="textSecondary" style={{ marginBottom: 12 }}>
              Test the incoming call overlay without waiting for a call.
            </ThemedText>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: '#3c87f7', marginTop: 0, flex: 1 }]}
                onPress={() => callDetection.testShowOverlay('+201012345678')}
              >
                <Ionicons name="call" size={18} color="white" />
                <ThemedText style={styles.syncButtonText}>Show Overlay</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: '#8E8E98', marginTop: 0, flex: 1 }]}
                onPress={() => callDetection.testHideOverlay()}
              >
                <Ionicons name="close-circle" size={18} color="white" />
                <ThemedText style={styles.syncButtonText}>Hide</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        )}

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
