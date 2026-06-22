import React, { useState } from 'react';
import { Alert, ScrollView, Platform, TouchableOpacity, View, ActivityIndicator, PermissionsAndroid } from 'react-native';
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
      // Try the native overlay settings first
      await requestOverlayPermission();
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (__DEV__) console.error('[HomeScreen] handleRequestOverlay error:', errMsg);
      Alert.alert(t('home.overlayPermErrorTitle'), t('home.overlayPermErrorMessage', { error: errMsg }));
    }
    // Always also open app settings as fallback (like notifications permission does)
    try {
      await openAppSettings();
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (__DEV__) console.error('[HomeScreen] openAppSettings error:', errMsg);
      Alert.alert(t('home.appSettingsErrorTitle'), t('home.appSettingsErrorMessage', { error: errMsg }));
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
    title: t('home.allowPermission', { permName }),
    message: t('home.permissionRationaleMessage'),
    buttonPositive: t('common.allow'),
    buttonNegative: t('common.notNow'),
  });

  // --- Permission Configs ---
  const permissionsList = [
    {
      key: 'hasPostNotifications',
      title: t('home.permAllowNotifications'),
      desc: t('home.permDescNotifications'),
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
      title: t('home.permReadContacts'),
      desc: t('home.permDescReadContacts'),
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
      title: t('home.permReadPhoneState'),
      desc: t('home.permDescReadPhoneState'),
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
      title: t('home.permReadCallLog'),
      desc: t('home.permDescReadCallLog'),
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
      title: t('home.permReadPhoneNumbers'),
      desc: t('home.permDescReadPhoneNumbers'),
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
      title: t('home.permDisplayOverOtherApps'),
      desc: t('home.permDescOverlay'),
      icon: 'eye',
      isGranted: permissions.hasOverlayPermission,
      onRequest: handleRequestOverlay,
      needsSettings: true,
    },
    {
      key: 'isDefaultCallerId',
      title: t('home.permDefaultCallerId'),
      desc: t('home.permDescDefaultCallerId'),
      icon: 'shield-checkmark',
      isGranted: permissions.isDefaultCallerId,
      onRequest: handleRequestDefault,
      isDefault: true,
    },
    {
      key: 'isIgnoringBattery',
      title: t('home.permIgnoreBattery'),
      desc: t('home.permDescIgnoreBattery'),
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
          {t('auth.welcome')}, {user?.displayName || user?.email || t('auth.defaultUserName')}!
        </ThemedText>

        {Platform.OS === 'android' && (
          <ThemedText type="subtitle" style={{ marginTop: Spacing.two }}>
            {t('home.requiredPermissions')}
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
                        {perm.needsSettings ? t('home.openSettings') : t('common.allow')}
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
            <ThemedText type="subtitle">{t('home.testOverlay')}</ThemedText>
            <ThemedText themeColor="textSecondary" style={{ marginBottom: 12 }}>
              {t('home.testOverlayDesc')}
            </ThemedText>
            {/* Show/Hide Overlay (existing) */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {permissions.hasOverlayPermission === false ? (
                <TouchableOpacity
                  style={[styles.syncButton, { backgroundColor: '#FF9500', marginTop: 0, flex: 1 }]}
                  onPress={handleRequestOverlay}
                >
                  <Ionicons name="apps-outline" size={18} color="white" />
                  <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>{t('home.allowOverlayFirst')}</ThemedText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.syncButton, { backgroundColor: '#3c87f7', marginTop: 0, flex: 1 }]}
                  onPress={async () => {
                    try {
                      await callDetection.testShowOverlay('+201012345678');
                    } catch (e) {
                      const errMsg = e instanceof Error ? e.message : String(e);
                      Alert.alert(t('home.testOverlayErrorTitle'), t('home.testOverlayErrorMessage', { error: errMsg }));
                    }
                  }}
                >
                  <Ionicons name="call" size={18} color="white" />
                  <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>{t('home.showOverlay')}</ThemedText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: '#8E8E98', marginTop: 0, flex: 1 }]}
                onPress={() => callDetection.testHideOverlay()}
              >
                <Ionicons name="close-circle" size={18} color="white" />
                <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>{t('home.hideOverlay')}</ThemedText>
              </TouchableOpacity>
            </View>

            {/* Separator */}
            <View style={{ height: 1, backgroundColor: theme.textSecondary + '30', marginVertical: 12 }} />

            {/* Current Status */}
            <ThemedText type="subtitle" style={{ fontSize: 14, marginBottom: 8 }}>
              Status: {permissions.hasOverlayPermission === null ? 'Checking...' :
                permissions.hasOverlayPermission ? 'Enabled (granted)' : 'Disabled (not granted)'}
            </ThemedText>

            {/* Experimental: Multiple overlay settings methods */}
            <ThemedText type="subtitle" style={{ fontSize: 14, marginBottom: 8, color: '#FF9500' }}>
              -- Experimental Overlay Openers --
            </ThemedText>
            <View style={{ gap: 8 }}>
              {/* 1. Action: Open overlay settings directly */}
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: '#5856D6', marginTop: 0 }]}
                onPress={() => callDetection.openOverlayMethodSettingsAction()}
              >
                <Ionicons name="settings-outline" size={18} color="white" />
                <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 13, flex: 1 }}>
                  {t('home.experimentalMethod1')}
                </ThemedText>
              </TouchableOpacity>

              {/* 2. Action: Special app access */}
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: '#FF2D55', marginTop: 0 }]}
                onPress={() => callDetection.openOverlayMethodSpecialAccess()}
              >
                <Ionicons name="settings-outline" size={18} color="white" />
                <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 13, flex: 1 }}>
                  {t('home.experimentalMethod2')}
                </ThemedText>
              </TouchableOpacity>

              {/* 3. Action: All apps that can draw overlay */}
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: '#30D158', marginTop: 0 }]}
                onPress={() => callDetection.openOverlayMethodAllAppsDrawOver()}
              >
                <Ionicons name="settings-outline" size={18} color="white" />
                <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 13, flex: 1 }}>
                  {t('home.experimentalMethod3')}
                </ThemedText>
              </TouchableOpacity>

              {/* 4. Action: App details deep link */}
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: '#007AFF', marginTop: 0 }]}
                onPress={() => callDetection.openOverlayMethodAppDetailsDeepLink()}
              >
                <Ionicons name="settings-outline" size={18} color="white" />
                <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 13, flex: 1 }}>
                  {t('home.experimentalMethod4')}
                </ThemedText>
              </TouchableOpacity>

              {/* 5. Action: Xiaomi specific */}
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: '#FF6482', marginTop: 0 }]}
                onPress={() => callDetection.openOverlayMethodXiaomi()}
              >
                <Ionicons name="settings-outline" size={18} color="white" />
                <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 13, flex: 1 }}>
                  {t('home.experimentalMethod5')}
                </ThemedText>
              </TouchableOpacity>

              {/* 6. Open App Settings (the original button - kept as is) */}
              <TouchableOpacity
                style={[styles.syncButton, { backgroundColor: '#8E8E98', marginTop: 0 }]}
                onPress={handleRequestOverlay}
              >
                <Ionicons name="apps-outline" size={18} color="white" />
                <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 13, flex: 1 }}>
                  {t('home.openAppSettings')}
                </ThemedText>
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