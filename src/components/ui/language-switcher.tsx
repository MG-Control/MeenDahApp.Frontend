import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { changeLanguage } from '@/lib/i18n';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export const LanguageSwitcher: React.FC = () => {
  const { language } = useSettingsStore();
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <TouchableOpacity
        onPress={() => changeLanguage('ar')}
        style={[
          styles.button,
          language === 'ar' && { backgroundColor: theme.backgroundSelected },
        ]}
      >
        <ThemedText
          type={language === 'ar' ? 'smallBold' : 'small'}
          themeColor={language === 'ar' ? 'text' : 'textSecondary'}
        >
          العربية
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => changeLanguage('en')}
        style={[
          styles.button,
          language === 'en' && { backgroundColor: theme.backgroundSelected },
        ]}
      >
        <ThemedText
          type={language === 'en' ? 'smallBold' : 'small'}
          themeColor={language === 'en' ? 'text' : 'textSecondary'}
        >
          English
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
});
