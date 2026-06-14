import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, AppState, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Constants from 'expo-constants';
import { callDetection } from '@/lib/native/callDetection';
import { useAuthStore } from '@/lib/stores/authStore';

const BASE_URL = (
  __DEV__
    ? process.env.EXPO_PUBLIC_API_URL_DEV
    : process.env.EXPO_PUBLIC_API_URL_PROD
) ?? 'https://meendah.mg-control.com';

interface PermissionsState {
  hasPostNotifications: boolean | null;
  hasReadPhoneState: boolean | null;
  hasReadCallLog: boolean | null;
  hasReadPhoneNumbers: boolean | null;
  hasOverlayPermission: boolean | null;
  isDefaultCallerId: boolean | null;
  isIgnoringBattery: boolean | null;
}

export function useCallOverlay() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const permissionsRequested = useRef(false);
  const [permissions, setPermissions] = useState<PermissionsState>({
    hasPostNotifications: null,
    hasReadPhoneState: null,
    hasReadCallLog: null,
    hasReadPhoneNumbers: null,
    hasOverlayPermission: null,
    isDefaultCallerId: null,
    isIgnoringBattery: null,
  });
  const appState = useRef(AppState.currentState);

  // Check all permissions status
  const checkPermissionsStatus = async () => {
    if (Platform.OS !== 'android') return;
    if (__DEV__) console.log('[CallOverlay] checkPermissionsStatus() called');

    // Check Android runtime permissions
    const hasPostNotifications = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    const hasReadPhoneState = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE);
    const hasReadCallLog = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
    const hasReadPhoneNumbers = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS);

    // Check permissions via native module
    const isDefaultCallerId = await callDetection.isDefaultCallerIdApp();
    const hasOverlayPermission = await callDetection.hasOverlayPermission();
    const isIgnoringBattery = await callDetection.isIgnoringBatteryOptimizations();

    if (__DEV__) {
      console.log('[CallOverlay] checkPermissionsStatus() results:');
      console.log('  hasPostNotifications:', hasPostNotifications);
      console.log('  hasReadPhoneState:', hasReadPhoneState);
      console.log('  hasReadCallLog:', hasReadCallLog);
      console.log('  hasReadPhoneNumbers:', hasReadPhoneNumbers);
      console.log('  hasOverlayPermission:', hasOverlayPermission);
      console.log('  isDefaultCallerId:', isDefaultCallerId);
      console.log('  isIgnoringBattery:', isIgnoringBattery);
    }

    setPermissions({
      hasPostNotifications,
      hasReadPhoneState,
      hasReadCallLog,
      hasReadPhoneNumbers,
      hasOverlayPermission,
      isDefaultCallerId,
      isIgnoringBattery,
    });
  };

  // Open app settings
  const openAppSettings = async () => {
    if (Platform.OS === 'android') {
      try {
        if (__DEV__) console.log('[CallOverlay] Opening app settings via Linking.openSettings()');
        await Linking.openSettings();
      } catch (e2) {
        if (__DEV__) console.error('[CallOverlay] Linking.openSettings error:', e2);
      }
    }
  };

  // Request a specific runtime permission
  const requestRuntimePermission = async (
    permission: typeof PermissionsAndroid.PERMISSIONS[keyof typeof PermissionsAndroid.PERMISSIONS],
    rationale: { title: string; message: string; buttonPositive: string; buttonNegative: string }
  ) => {
    if (__DEV__) console.log('[CallOverlay] requestRuntimePermission:', permission);
    try {
      const result = await PermissionsAndroid.request(permission, rationale);
      if (__DEV__) console.log('[CallOverlay] requestRuntimePermission result:', result);
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        if (__DEV__) console.log('[CallOverlay] Got NEVER_ASK_AGAIN, opening app settings');
        await openAppSettings();
      }
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      if (__DEV__) console.error('[CallOverlay] requestRuntimePermission error:', e);
      return false;
    } finally {
      await checkPermissionsStatus();
    }
  };

  // Set API base URL once
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    callDetection.setApiBaseUrl(BASE_URL.replace(/\/+$/, ''));
  }, []);

  // Set Theme and Version on mount and when colorScheme changes
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const resolvedScheme = colorScheme ?? 'light';
    const appTheme = resolvedScheme === 'dark' ? 'dark' : 'light';
    const version = Constants.expoConfig?.version ?? '1.0.0';
    if (__DEV__) {
      console.log('[CallOverlay] Setting theme:', appTheme, '(raw colorScheme:', colorScheme, ')');
      console.log('[CallOverlay] Setting version:', version);
    }
    callDetection.setTheme(appTheme);
    callDetection.setVersion(version);
  }, [colorScheme]);

  // Also set theme and version when auth changes (just in case)
  useEffect(() => {
    if (Platform.OS !== 'android' || !accessToken) return;
    const resolvedScheme = colorScheme ?? 'light';
    const appTheme = resolvedScheme === 'dark' ? 'dark' : 'light';
    const version = Constants.expoConfig?.version ?? '1.0.0';
    if (__DEV__) {
      console.log('[CallOverlay] (Auth) Setting theme:', appTheme);
      console.log('[CallOverlay] (Auth) Setting version:', version);
    }
    callDetection.setTheme(appTheme);
    callDetection.setVersion(version);
  }, [accessToken]);

  // Sync auth token
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (accessToken) {
      callDetection.setAuthToken(accessToken);
    } else {
      callDetection.clearAuthToken();
      permissionsRequested.current = false;
    }
  }, [accessToken]);

  // Request permissions every time app starts (or when user logs in)
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!_hasHydrated || !accessToken) return;

    if (__DEV__) console.log('[CallOverlay] Triggering permission request...');
    
    // Always try to ensure permissions when the app is open and user is logged in!
    ensurePermissions({
      phoneStateTitle: t('common.callOverlayPermTitle'),
      phoneStateMessage: t('common.callOverlayPermMessage'),
      callLogTitle: t('common.callLogPermTitle'),
      callLogMessage: t('common.callLogPermMessage'),
      allow: t('common.allow'),
      notNow: t('common.notNow'),
    });
  }, [_hasHydrated, accessToken]);

  // Check status on app foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkPermissionsStatus();
      }
      appState.current = nextAppState;
    });

    checkPermissionsStatus(); // Check on mount

    return () => {
      subscription.remove();
    };
  }, []);

  // Show/hide persistent notification based on whether we're the default caller ID
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!_hasHydrated || !accessToken) return;

    if (__DEV__) {
      console.log('[CallOverlay] isDefaultCallerId changed:', permissions.isDefaultCallerId);
    }

    if (permissions.isDefaultCallerId === false) {
      if (__DEV__) console.log('[CallOverlay] Showing persistent notification');
      callDetection.showPersistentNotification();
    } else {
      if (__DEV__) console.log('[CallOverlay] Hiding persistent notification');
      callDetection.hidePersistentNotification();
    }
  }, [permissions.isDefaultCallerId, _hasHydrated, accessToken]);

  return {
    permissions,
    requestDefaultCallerId: callDetection.requestDefaultCallerIdApp,
    requestOverlayPermission: callDetection.requestOverlayPermission,
    requestIgnoreBatteryOptimizations: callDetection.requestIgnoreBatteryOptimizations,
    openDefaultAppsSettings: callDetection.openDefaultAppsSettings,
    requestRuntimePermission,
    openAppSettings,
    openAppDetailsSettings: callDetection.openAppDetailsSettings,
    checkPermissionsStatus,
  };
}

interface Strings {
  phoneStateTitle: string;
  phoneStateMessage: string;
  callLogTitle: string;
  callLogMessage: string;
  allow: string;
  notNow: string;
}

async function ensurePermissions(s: Strings) {
  try {
    if (__DEV__) console.log('[CallOverlay] Starting permission request flow...');

    // 0. POST_NOTIFICATIONS — required for notifications on Android 13+
    if (__DEV__) console.log('[CallOverlay] Requesting POST_NOTIFICATIONS...');
    await requestIfNeeded(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      { title: 'Allow notifications', message: 'Allow Meendah to show setup notifications',
        buttonPositive: s.allow, buttonNegative: s.notNow }
    );

    // 1. READ_PHONE_STATE — required on all Android versions
    if (__DEV__) console.log('[CallOverlay] Requesting READ_PHONE_STATE...');
    const phoneStateGranted = await requestIfNeeded(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      { title: s.phoneStateTitle, message: s.phoneStateMessage,
        buttonPositive: s.allow, buttonNegative: s.notNow }
    );
    if (__DEV__) console.log('[CallOverlay] READ_PHONE_STATE granted:', phoneStateGranted);
    
    // 2. READ_CALL_LOG — needed on Android 9+ to get the incoming number
    if (__DEV__) console.log('[CallOverlay] Requesting READ_CALL_LOG...');
    await requestIfNeeded(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      { title: s.callLogTitle, message: s.callLogMessage,
        buttonPositive: s.allow, buttonNegative: s.notNow }
    );

    // 3. READ_PHONE_NUMBERS — needed on some devices
    if (__DEV__) console.log('[CallOverlay] Requesting READ_PHONE_NUMBERS...');
    await requestIfNeeded(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
      { title: s.phoneStateTitle, message: 'Allow access to phone numbers to identify callers.',
        buttonPositive: s.allow, buttonNegative: s.notNow }
    );

    // 4. SYSTEM_ALERT_WINDOW (overlay) — must be granted via Settings on Android 6+
    const hasOverlay = await callDetection.hasOverlayPermission();
    if (__DEV__) console.log('[CallOverlay] Has overlay permission:', hasOverlay);

    // 5. طلب تعيين الـ app كـ default caller ID / screening app (Android 10+)
    // ده الأهم — بدونه CallScreeningService مش بيشتغل خالص
    if (__DEV__) console.log('[CallOverlay] Requesting default caller ID app...');
    await requestDefaultCallerIdApp();

    // 6. Battery Optimizations — لمنع قتل الخدمة في الخلفية
    const isIgnoringBattery = await callDetection.isIgnoringBatteryOptimizations();
    if (!isIgnoringBattery) {
      if (__DEV__) console.log('[CallOverlay] Requesting battery optimization ignore...');
      callDetection.requestIgnoreBatteryOptimizations();
    }

    if (__DEV__) console.log('[CallOverlay] Permission request flow complete!');
  } catch (e) {
    if (__DEV__) console.warn('[CallOverlay] Permission check failed:', e);
  }
}

/**
 * يطلب من المستخدم تعيين Meendah كـ default caller ID app.
 * ده مطلوب على Android 10+ عشان CallScreeningService يشتغل ويجيب رقم المتصل.
 * بدون ده، الـ service مسجّل لكن مش بيتشغل.
 */
async function requestDefaultCallerIdApp() {
  try {
    await callDetection.requestDefaultCallerIdApp();
  } catch (e) {
    if (__DEV__) console.warn('[CallOverlay] requestDefaultCallerIdApp failed:', e);
  }
}

async function requestIfNeeded(
  permission: (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS],
  rationale: { title: string; message: string; buttonPositive: string; buttonNegative: string }
): Promise<boolean> {
  if (__DEV__) console.log('[CallOverlay] requestIfNeeded() for permission:', permission);
  const already = await PermissionsAndroid.check(permission);
  if (__DEV__) console.log('[CallOverlay] requestIfNeeded() already granted:', already);
  if (already) return true;
  const result = await PermissionsAndroid.request(permission, rationale);
  if (__DEV__) console.log('[CallOverlay] requestIfNeeded() result:', result);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}
