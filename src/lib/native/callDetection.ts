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

  setTheme(theme: string) {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.setTheme(theme);
    }
  },

  setVersion(version: string) {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.setVersion(version);
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

  async isDefaultCallerIdApp(): Promise<boolean> {
    if (!isAndroid || !CallDetectionModule) return true;
    return CallDetectionModule.isDefaultCallerIdApp();
  },

  async requestDefaultCallerIdApp(): Promise<boolean> {
    if (!isAndroid || !CallDetectionModule) return false;
    return CallDetectionModule.requestDefaultCallerIdApp();
  },

  openDefaultAppsSettings() {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.openDefaultAppsSettings();
    }
  },

  async isIgnoringBatteryOptimizations(): Promise<boolean> {
    if (!isAndroid || !CallDetectionModule) return true;
    return CallDetectionModule.isIgnoringBatteryOptimizations();
  },

  requestIgnoreBatteryOptimizations() {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.requestIgnoreBatteryOptimizations();
    }
  },

  // TEST FUNCTIONS
  testShowOverlay(phoneNumber: string = "+201012345678") {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.testShowOverlay(phoneNumber);
    }
  },

  testHideOverlay() {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.testHideOverlay();
    }
  },

  showPersistentNotification() {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.showPersistentNotification();
    }
  },

  hidePersistentNotification() {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.hidePersistentNotification();
    }
  },
};
