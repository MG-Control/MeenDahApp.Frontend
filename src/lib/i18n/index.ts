import { useSettingsStore } from '@/lib/stores/settingsStore';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import ar from './locales/ar.json';
import en from './locales/en.json';

const resources = {
  ar: { translation: ar },
  en: { translation: en },
};

i18n.use(initReactI18next).init({
  resources,
  lng: useSettingsStore.getState().language,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export const changeLanguage = async (lng: 'ar' | 'en') => {
  await i18n.changeLanguage(lng);
  useSettingsStore.getState().setLanguage(lng);

  const isRTL = lng === 'ar';
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
    
    // Restart app to apply RTL changes
    if (!__DEV__) {
      try {
        const Updates = require('expo-updates');
        if (Updates.reloadAsync) {
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.warn('Expo Updates not available for reload');
      }
    } else {
      // In development, we might need a manual reload to see RTL changes
      console.warn('RTL changed. Please reload the app manually to see layout changes.');
    }
  }
};

export default i18n;
