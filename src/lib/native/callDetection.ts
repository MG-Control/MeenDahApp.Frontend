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

  setRefreshToken(token: string) {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.setRefreshToken(token);
    }
  },

  clearRefreshToken() {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.clearRefreshToken();
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

  openAppDetailsSettings() {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.openAppDetailsSettings();
    }
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

  // ========================
  // EXPERIMENTAL OVERLAY METHODS
  // These try different Android intents to open the overlay/appear-on-top settings
  // ========================

  // Action: Settings.ACTION_MANAGE_OVERLAY_PERMISSION with package URI + clear-top flags
  openOverlayMethodSettingsAction() {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.openOverlayMethodSettingsAction();
    }
  },

  // Action: Settings.ACTION_MANAGE_SPECIAL_APP_ACCESS_WHITELIST
  openOverlayMethodSpecialAccess() {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.openOverlayMethodSpecialAccess();
    }
  },

  // Action: Settings.ACTION_MANAGE_OVERLAY_PERMISSION (generic, no package filter)
  openOverlayMethodAllAppsDrawOver() {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.openOverlayMethodAllAppsDrawOver();
    }
  },

  // Xiaomi-specific intents for overlay permissions
  openOverlayMethodXiaomi() {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.openOverlayMethodXiaomi();
    }
  },

  // App details settings deep link (with extra package param for better OEM support)
  openOverlayMethodAppDetailsDeepLink() {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.openOverlayMethodAppDetailsDeepLink();
    }
  },

  blockNumber(phoneNumber: string) {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.blockNumber(phoneNumber);
    }
  },

  unblockNumber(phoneNumber: string) {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.unblockNumber(phoneNumber);
    }
  },

  sendLogToJS(tag: string, message: string, level: string) {
    if (isAndroid && CallDetectionModule) {
      CallDetectionModule.sendLogToJS(tag, message, level);
    }
  },
};
