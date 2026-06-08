import { useEffect } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
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

  // Push base URL once on mount
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    callDetection.setApiBaseUrl(BASE_URL.replace(/\/+$/, ''));
  }, []);

  // Sync token to native storage whenever it changes
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (accessToken) {
      callDetection.setAuthToken(accessToken);
    } else {
      callDetection.clearAuthToken();
    }
  }, [accessToken]);

  // Check & request missing permissions on every app foreground — only when logged in
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!_hasHydrated || !accessToken) return;

    const strings = buildStrings(t);

    // Check immediately when hook mounts (app open)
    ensurePermissions(strings);

    // Re-check when user returns from background (e.g. after granting overlay permission
    // in Settings and coming back)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') ensurePermissions(strings);
    });

    return () => sub.remove();
  }, [_hasHydrated, accessToken]);
}

function buildStrings(t: (key: string) => string) {
  return {
    phoneStateTitle: t('common.callOverlayPermTitle'),
    phoneStateMessage: t('common.callOverlayPermMessage'),
    callLogTitle: t('common.callLogPermTitle'),
    callLogMessage: t('common.callLogPermMessage'),
    allow: t('common.allow'),
    notNow: t('common.notNow'),
  };
}

async function ensurePermissions(strings: ReturnType<typeof buildStrings>) {
  try {
    const phoneStateStatus = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE
    );
    if (!phoneStateStatus) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
        {
          title: strings.phoneStateTitle,
          message: strings.phoneStateMessage,
          buttonPositive: strings.allow,
          buttonNegative: strings.notNow,
        }
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) return;
    }

    const callLogStatus = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
    );
    if (!callLogStatus) {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        {
          title: strings.callLogTitle,
          message: strings.callLogMessage,
          buttonPositive: strings.allow,
          buttonNegative: strings.notNow,
        }
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
