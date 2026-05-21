import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useSettingsStore } from '@/lib/stores/settingsStore';

export function useColorScheme() {
  const systemColorScheme = useNativeColorScheme();
  const { theme } = useSettingsStore();

  if (theme === 'system') {
    return systemColorScheme ?? 'light';
  }

  return theme;
}
