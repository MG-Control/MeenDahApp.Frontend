import { NativeModules, Platform } from 'react-native';

const { CallDetectionModule } = NativeModules;

const isAndroid = Platform.OS === 'android';

export const callDetection = {
  setAuthToken(token: string) {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.setAuthToken(token);
    }
  },

  clearAuthToken() {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.clearAuthToken();
    }
  },

  setApiBaseUrl(url: string) {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.setApiBaseUrl(url);
    }
  },

  async hasOverlayPermission(): Promise<boolean> {
    if (!isAndroid || !CallDetectionModule) return false;
    return CallDetectionModule.hasOverlayPermission();
  },

  requestOverlayPermission() {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.requestOverlayPermission();
    }
  },
};
