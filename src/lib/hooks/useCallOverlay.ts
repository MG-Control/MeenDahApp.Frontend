import { useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
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

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    callDetection.setApiBaseUrl(BASE_URL.replace(/\/+$/, ''));
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (accessToken) {
      callDetection.setAuthToken(accessToken);
    } else {
      callDetection.clearAuthToken();
      permissionsRequested.current = false;
    }
  }, [accessToken]);

  // Request permissions once per session after login — no AppState loop
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
    const hasPhoneState = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
    );
    if (!hasPhoneState) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        { title: s.phoneStateTitle, message: s.phoneStateMessage,
          buttonPositive: s.allow, buttonNegative: s.notNow }
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) return;
    }

    const hasCallLog = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
    );
    if (!hasCallLog) {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        { title: s.callLogTitle, message: s.callLogMessage,
          buttonPositive: s.allow, buttonNegative: s.notNow }
      );
    }

    const hasOverlay = await callDetection.hasOverlayPermission();
    if (!hasOverlay) {
      callDetection.requestOverlayPermission();
    }
  } catch (e) {
    if (__DEV__) console.warn('[CallOverlay] Permission check failed:', e);
  }
}
