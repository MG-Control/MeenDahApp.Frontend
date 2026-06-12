import { useEffect, useRef, useState } from 'react';
import { NativeModules, PermissionsAndroid, Platform, AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import { callDetection } from '@/lib/native/callDetection';
import { useAuthStore } from '@/lib/stores/authStore';

const BASE_URL = (
  __DEV__
    ? process.env.EXPO_PUBLIC_API_URL_DEV
    : process.env.EXPO_PUBLIC_API_URL_PROD
) ?? 'https://meendah.mg-control.com';

export function useCallOverlay() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  const { t } = useTranslation();
  const permissionsRequested = useRef(false);
  const [isDefaultCallerId, setIsDefaultCallerId] = useState<boolean | null>(null);
  const [hasOverlayPermission, setHasOverlayPermission] = useState<boolean | null>(null);
  const [isIgnoringBattery, setIsIgnoringBattery] = useState<boolean | null>(null);
  const appState = useRef(AppState.currentState);

  // Check permissions (default caller id & overlay & battery)
  const checkPermissionsStatus = async () => {
    if (Platform.OS !== 'android') return;
    const status = await callDetection.isDefaultCallerIdApp();
    const overlay = await callDetection.hasOverlayPermission();
    const battery = await callDetection.isIgnoringBatteryOptimizations();
    setIsDefaultCallerId(status);
    setHasOverlayPermission(overlay);
    setIsIgnoringBattery(battery);
  };

  // Set API base URL once
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    callDetection.setApiBaseUrl(BASE_URL.replace(/\/+$/, ''));
  }, []);

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

    if (isDefaultCallerId === false) {
      callDetection.showPersistentNotification();
    } else {
      callDetection.hidePersistentNotification();
    }
  }, [isDefaultCallerId, _hasHydrated, accessToken]);

  return {
    isDefaultCallerId,
    hasOverlayPermission,
    isIgnoringBattery,
    requestDefaultCallerId: callDetection.requestDefaultCallerIdApp,
    requestOverlayPermission: callDetection.requestOverlayPermission,
    requestIgnoreBatteryOptimizations: callDetection.requestIgnoreBatteryOptimizations,
    openDefaultAppsSettings: callDetection.openDefaultAppsSettings,
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
    if (!hasOverlay) {
      if (__DEV__) console.log('[CallOverlay] Requesting overlay permission...');
      callDetection.requestOverlayPermission();
    }

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
  const already = await PermissionsAndroid.check(permission);
  if (already) return true;
  const result = await PermissionsAndroid.request(permission, rationale);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}
