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
  const appState = useRef(AppState.currentState);

  // Check if we're default caller ID
  const checkDefaultStatus = async () => {
    if (Platform.OS !== 'android') return;
    const status = await callDetection.isDefaultCallerIdApp();
    setIsDefaultCallerId(status);
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

  // Request permissions once per session after login
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!_hasHydrated || !accessToken) return;
    if (permissionsRequested.current) return;

    permissionsRequested.current = true;
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
        checkDefaultStatus();
      }
      appState.current = nextAppState;
    });

    checkDefaultStatus(); // Check on mount

    return () => {
      subscription.remove();
    };
  }, []);

  return {
    isDefaultCallerId,
    requestDefaultCallerId: callDetection.requestDefaultCallerIdApp,
    checkDefaultStatus,
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
    // 1. READ_PHONE_STATE — required on all Android versions
    const phoneStateGranted = await requestIfNeeded(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      { title: s.phoneStateTitle, message: s.phoneStateMessage,
        buttonPositive: s.allow, buttonNegative: s.notNow }
    );
    if (!phoneStateGranted) {
      if (__DEV__) console.warn('[CallOverlay] READ_PHONE_STATE denied — call detection disabled');
      return;
    }

    // 2. READ_CALL_LOG — needed on Android 9+ to get the incoming number
    await requestIfNeeded(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      { title: s.callLogTitle, message: s.callLogMessage,
        buttonPositive: s.allow, buttonNegative: s.notNow }
    );

    // 3. SYSTEM_ALERT_WINDOW (overlay) — must be granted via Settings on Android 6+
    const hasOverlay = await callDetection.hasOverlayPermission();
    if (!hasOverlay) {
      callDetection.requestOverlayPermission();
    }

    // 4. طلب تعيين الـ app كـ default caller ID / screening app (Android 10+)
    // ده الأهم — بدونه CallScreeningService مش بيشتغل خالص
    await requestDefaultCallerIdApp();
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
