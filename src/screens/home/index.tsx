import React, { useState } from 'react';
import { ScrollView, Platform, TouchableOpacity, View, ActivityIndicator, PermissionsAndroid } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/lib/stores/authStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useContactSync } from '@/lib/hooks/useContactSync';
import { useCallOverlay } from '@/lib/hooks/useCallOverlay';
import { styles } from './styles';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { callDetection } from '@/lib/native/callDetection';
import Constants from 'expo-constants';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { hasSyncedContacts } = useSettingsStore();
  const { syncContacts, isSyncing } = useContactSync();
  const {
    permissions,
    requestDefaultCallerId,
    requestOverlayPermission,
    requestIgnoreBatteryOptimizations,
    requestRuntimePermission,
    openAppSettings,
    checkPermissionsStatus
  } = useCallOverlay();

  const [isRequestingDefault, setIsRequestingDefault] = useState(false);

  // --- Handlers ---
  const handleRequestDefault = async () => {
    if (__DEV__) console.log('[HomeScreen] handleRequestDefault called');
    setIsRequestingDefault(true);
    try {
      await requestDefaultCallerId();
      setTimeout(async () => {
        await checkPermissionsStatus();
        setIsRequestingDefault(false);
      }, 1500);
    } catch (e) {
      if (__DEV__) console.error('[HomeScreen] handleRequestDefault error:', e);
      setIsRequestingDefault(false);
    }
  };

  const handleRequestOverlay = async () => {
    if (__DEV__) console.log('[HomeScreen] handleRequestOverlay called');
    try {
      await requestOverlayPermission();
    } catch (e) {
      if (__DEV__) console.error('[HomeScreen] handleRequestOverlay error:', e);
    }
  };

  const handleRequestBattery = async () => {
    if (__DEV__) console.log('[HomeScreen] handleRequestBattery called');
    try {
      await requestIgnoreBatteryOptimizations();
    } catch (e) {
      if (__DEV__) console.error('[HomeScreen] handleRequestBattery error:', e);
    }
  };

  // --- Common Rationale ---
  const getRationale = (permName: string) => ({
    title: `Allow ${permName}`,
    message: `Meendah needs this permission to identify who is calling you.`,
    buttonPositive: 'Allow',
    buttonNegative: 'Not Now',
  });

  // --- Permission Configs ---
  const permissionsList = [
    {
      key: 'hasPostNotifications',
      title: 'Allow Notifications',
      desc: 'Show setup notifications to set Meendah as your caller ID app',
      icon: 'notifications',
      perm: PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      isGranted: permissions.hasPostNotifications,
      onRequest: async () => {
        await requestRuntimePermission(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, getRationale('Notifications'));
      },
      canOpenSettings: true,
    },
    {
      key: 'hasReadContacts',
      title: 'Read Contacts',
      desc: 'Identify callers saved in your contacts and show their names',
      icon: 'people',
      perm: PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      isGranted: permissions.hasReadContacts,
      onRequest: async () => {
        await requestRuntimePermission(PermissionsAndroid.PERMISSIONS.READ_CONTACTS, getRationale('Contacts'));
      },
      canOpenSettings: true,
    },
    {
      key: 'hasReadPhoneState',
      title: 'Read Phone State',
      desc: 'Required to detect incoming phone calls',
      icon: 'phone-portrait',
      perm: PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      isGranted: permissions.hasReadPhoneState,
      onRequest: async () => {
        await requestRuntimePermission(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE, getRationale('Phone State'));
      },
      canOpenSettings: true,
    },
    {
      key: 'hasReadCallLog',
      title: 'Read Call Log',
      desc: 'Help identify callers from your call history',
      icon: 'call',
      perm: PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      isGranted: permissions.hasReadCallLog,
      onRequest: async () => {
        await requestRuntimePermission(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG, getRationale('Call Log'));
      },
      canOpenSettings: true,
    },
    {
      key: 'hasReadPhoneNumbers',
      title: 'Read Phone Numbers',
      desc: 'Allow access to phone numbers to identify callers',
      icon: 'keypad',
      perm: PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
      isGranted: permissions.hasReadPhoneNumbers,
      onRequest: async () => {
        await requestRuntimePermission(PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS, getRationale('Phone Numbers'));
      },
      canOpenSettings: true,
    },
    {
      key: 'hasOverlayPermission',
      title: 'Display Over Other Apps',
      desc: 'Show the call overlay popup when a call comes in',
      icon: 'eye',
      isGranted: permissions.hasOverlayPermission,
      onRequest: handleRequestOverlay,
      needsSettings: true,
    },
    {
      key: 'isDefaultCallerId',
      title: 'Default Caller ID & Spam App',
      desc: 'This is the most important! Without this, nothing works!',
      icon: 'shield-checkmark',
      isGranted: permissions.isDefaultCallerId,
      onRequest: handleRequestDefault,
      isDefault: true,
    },
    {
      key: 'isIgnoringBattery',
      title: 'Ignore Battery Optimizations',
      desc: 'Allow Meendah to run in the background to detect calls',
      icon: 'battery-charging',
      isGranted: permissions.isIgnoringBattery,
      onRequest: handleRequestBattery,
      needsSettings: true,
    },
  ];

  const StatusIcon = ({ isGranted, isDefault, needsSettings }: { isGranted: boolean | null, isDefault?: boolean, needsSettings?: boolean }) => {
    if (isGranted === null) {
      return <ActivityIndicator size="small" color={theme.textSecondary} />;
    }
    return (
      <Ionicons
        name={isGranted ? 'checkmark-circle' : 'warning'}
        size={24}
        color={isGranted ? '#34C759' : (isDefault ? '#FF3B30' : '#FF9500')}
      />
    );
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

        {Platform.OS === 'android' && (
          <ThemedText type="subtitle" style={{ marginTop: Spacing.two }}>
            Required Permissions
          </ThemedText>
        )}

        {/* Render all permission cards */}
        {Platform.OS === 'android' && permissionsList.map((perm) => (
          <ThemedView
            key={perm.key}
            type="backgroundElement"
            style={[
              styles.card,
              styles.syncCard,
              {
                borderColor: perm.isGranted === false
                  ? (perm.isDefault ? 'rgba(255, 59, 48, 0.4)' : 'rgba(255, 149, 0, 0.4)')
                  : 'rgba(60, 135, 247, 0.2)',
                backgroundColor: perm.isGranted === false
                  ? (perm.isDefault ? 'rgba(255, 59, 48, 0.08)' : 'rgba(255, 149, 0, 0.08)')
                  : undefined,
              }
            ]}
          >
            <View style={styles.syncIconContainer}>
              <Ionicons
                name={perm.icon as any}
                size={24}
                color={perm.isGranted === false ? (perm.isDefault ? '#FF3B30' : '#FF9500') : '#3c87f7'}
              />
            </View>
            <View style={styles.syncContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                <ThemedText type="subtitle" style={{ fontSize: 15 }}>
                  {perm.title}
                </ThemedText>
                <StatusIcon
                  isGranted={perm.isGranted}
                  isDefault={perm.isDefault}
                  needsSettings={perm.needsSettings}
                />
              </View>
              <ThemedText themeColor="textSecondary" style={{ fontSize: 13, marginTop: 2 }}>
                {perm.desc}
              </ThemedText>

              {perm.isGranted === false && (
                <TouchableOpacity
                  style={[
                    styles.syncButton,
                    {
                      backgroundColor: perm.isDefault ? '#FF3B30' : '#FF9500',
                      marginTop: 10,
                    },
                  ]}
                  onPress={() => {
                    if (__DEV__) console.log('[HomeScreen] Tapped button for:', perm.key);
                    perm.onRequest();
                  }}
                  disabled={perm.isDefault && isRequestingDefault}
                >
                  {perm.isDefault && isRequestingDefault ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name={perm.needsSettings ? 'settings' : 'checkmark'}
                        size={18}
                        color="white"
                      />
                      <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                        {perm.needsSettings ? 'Open Settings' : 'Allow'}
                      </ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ThemedView>
        ))}

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
              {permissions.hasOverlayPermission === false ? (
                <TouchableOpacity
                  style={[styles.syncButton, { backgroundColor: '#FF9500', marginTop: 0, flex: 1 }]}
                  onPress={handleRequestOverlay}
                >
                  <Ionicons name="apps-outline" size={18} color="white" />
                  <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Allow Overlay First</ThemedText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.syncButton, { backgroundColor: '#3c87f7', marginTop: 0, flex: 1 }]}
                  onPress={() => callDetection.testShowOverlay('+201012345678')}
                >
                  <Ionicons name="call" size={18} color="white" />
                  <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Show Overlay</ThemedText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: '#8E8E98', marginTop: 0, flex: 1 }]}
                onPress={() => callDetection.testHideOverlay()}
              >
                <Ionicons name="close-circle" size={18} color="white" />
                <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>Hide</ThemedText>
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
                    <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>{t('contacts.syncButton')}</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ThemedView>
        )}

        {/* Version Number */}
        <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.four, fontSize: 12 }}>
          Version {Constants.expoConfig?.version || '1.0.0'}
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}