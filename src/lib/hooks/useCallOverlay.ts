import { useEffect } from 'react';
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
  const { t } = useTranslation();

  // Push base URL once on mount so the native service always knows where to call
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    callDetection.setApiBaseUrl(BASE_URL.replace(/\/+$/, ''));
  }, []);

  // Keep the native token in sync with the JS auth state
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (accessToken) {
      callDetection.setAuthToken(accessToken);
      requestCallPermissions({
        phoneStateTitle: t('common.callOverlayPermTitle'),
        phoneStateMessage: t('common.callOverlayPermMessage'),
        callLogTitle: t('common.callLogPermTitle'),
        callLogMessage: t('common.callLogPermMessage'),
        allow: t('common.allow'),
        notNow: t('common.notNow'),
      });
    } else {
      callDetection.clearAuthToken();
    }
  }, [accessToken]);
}

interface PermissionStrings {
  phoneStateTitle: string;
  phoneStateMessage: string;
  callLogTitle: string;
  callLogMessage: string;
  allow: string;
  notNow: string;
}

async function requestCallPermissions(strings: PermissionStrings) {
  try {
    const phoneState = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      {
        title: strings.phoneStateTitle,
        message: strings.phoneStateMessage,
        buttonPositive: strings.allow,
        buttonNegative: strings.notNow,
      }
    );

    if (phoneState !== PermissionsAndroid.RESULTS.GRANTED) return;

    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      {
        title: strings.callLogTitle,
        message: strings.callLogMessage,
        buttonPositive: strings.allow,
        buttonNegative: strings.notNow,
      }
    );

    const hasOverlay = await callDetection.hasOverlayPermission();
    if (!hasOverlay) {
      callDetection.requestOverlayPermission();
    }
  } catch (e) {
    if (__DEV__) console.warn('[CallOverlay] Permission request failed:', e);
  }
}
