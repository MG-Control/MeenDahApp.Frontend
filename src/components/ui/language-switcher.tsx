import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { I18nManager, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { changeLanguage } from '@/lib/i18n';
import { useSettingsStore } from '@/lib/stores/settingsStore';

interface LanguageSwitcherProps {
  variant?: 'default' | 'auth';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'default' }) => {
  const { language } = useSettingsStore();
  const theme = useTheme();

  if (variant === 'auth') {
    const options = I18nManager.isRTL
      ? [{ key: 'ar', label: 'العربية' }, { key: 'en', label: 'English' }]
      : [{ key: 'en', label: 'English' }, { key: 'ar', label: 'العربية' }];

    return (
      <View style={[styles.authContainer, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="globe-outline" size={14} color={theme.textSecondary} />
        {options.map(({ key, label }, index) => (
          <React.Fragment key={key}>
            {index > 0 && (
              <View style={[styles.authDivider, { backgroundColor: theme.backgroundSelected }]} />
            )}
            <TouchableOpacity
              onPress={() => changeLanguage(key as 'ar' | 'en')}
              style={[styles.authButton, language === key && { backgroundColor: '#3c87f7' }]}
            >
              <ThemedText
                type="small"
                style={[
                  styles.authButtonText,
                  { color: language === key ? '#fff' : theme.textSecondary },
                ]}
              >
                {label}
              </ThemedText>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>
    );
  }

  const options = I18nManager.isRTL
    ? [{ key: 'ar', label: 'العربية' }, { key: 'en', label: 'English' }]
    : [{ key: 'en', label: 'English' }, { key: 'ar', label: 'العربية' }];

  return (
    <ThemedView type="backgroundElement" style={[styles.container, { flexDirection: 'row' }]}>
      {options.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          onPress={() => changeLanguage(key as 'ar' | 'en')}
          style={[styles.button, language === key && { backgroundColor: theme.backgroundSelected }]}
        >
          <ThemedText
            type={language === key ? 'smallBold' : 'small'}
            themeColor={language === key ? 'text' : 'textSecondary'}
          >
            {label}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 4,
    borderRadius: 12,
    width: '50%',
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  authContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  authDivider: {
    width: 1,
    height: 12,
  },
  authButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  authButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
