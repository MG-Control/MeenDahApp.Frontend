import { ThemedText } from '@/components/themed-text';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import apiClient from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  I18nManager,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './styles';

const DEFAULT_PHONE = '01205808516';
const DEFAULT_PASSWORD = '01205808516';
const IS_DEV = __DEV__;

export default function LoginScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const needsRTLFlip = isArabic !== I18nManager.isRTL;
  const theme = useTheme();
  const colorScheme = useColorScheme();
  
  const getLogoSource = () => {
    const language = isArabic ? 'arabic' : 'english';
    const scheme = colorScheme === 'dark' ? 'dark' : 'light';
    if (language === 'arabic' && scheme === 'dark') return require('@/assets/images/logo/meendah_arabic_dark.png');
    if (language === 'arabic' && scheme === 'light') return require('@/assets/images/logo/meendah_arabic_light.png');
    if (language === 'english' && scheme === 'dark') return require('@/assets/images/logo/meendah_english_dark.png');
    return require('@/assets/images/logo/meendah_english_light.png');
  };
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState(IS_DEV ? DEFAULT_PHONE : '');
  const [password, setPassword] = useState(IS_DEV ? DEFAULT_PASSWORD : '');
  const { setTokens, setUser } = useAuthStore();

  const normalizePhoneNumber = (value: string) => value.replace(/[^\d+]/g, '');

  const normalizeIdentifier = () => {
    const trimmedIdentifier = identifier.trim();
    const isEmail = trimmedIdentifier.includes('@');
    const phoneDigits = trimmedIdentifier.replace(/\D/g, '');

    if (isEmail) {
      if (trimmedIdentifier.length < 5) {
        Alert.alert(t('common.error'), t('auth.identifierValidation'));
        return null;
      }

      return {
        normalizedIdentifier: trimmedIdentifier.toLowerCase(),
        isEmail: true,
      };
    }

    if (phoneDigits.length < 10) {
      Alert.alert(t('common.error'), t('auth.identifierValidation'));
      return null;
    }

    const normalizedPhone = trimmedIdentifier.startsWith('+')
      ? normalizePhoneNumber(trimmedIdentifier)
      : `+2${phoneDigits}`;

    return {
      normalizedIdentifier: normalizedPhone,
      isEmail: false,
    };
  };

  const validateForm = () => {
    if (!normalizeIdentifier()) {
      return false;
    }

    if (password.trim().length < 6) {
      Alert.alert(t('common.error'), t('auth.passwordValidation'));
      return false;
    }

    return true;
  };

  const handleAuth = async () => {
    if (!validateForm()) {
      return;
    }

    const normalized = normalizeIdentifier();
    if (!normalized) {
      return;
    }

    try {
      setLoading(true);

      const payload = {
        identifier: normalized.normalizedIdentifier,
        password,
      };

      const { data } = await apiClient.post('/auth/login', payload);

      setTokens(data.accessToken, data.refreshToken);
      setUser({ ...data.user, avatarUrl: data.user?.avatarUrl });
      router.replace('/');
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.response?.data || error?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View pointerEvents="none" style={styles.backdrop}>
        <View style={styles.backdropGlowTop} />
        <View style={styles.backdropGlowBottom} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <LanguageSwitcher />
        </View>

        <View style={styles.container}>
          <View style={styles.branding}>
            <View style={[styles.logoContainer, { backgroundColor: theme.backgroundElement }]}>
              <Image
                source={getLogoSource()}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <ThemedText type="title" style={styles.appName}>
              {t('common.appName')}
            </ThemedText>
            <View style={[styles.indicator, { backgroundColor: '#3c87f7' }]} />
            
            <View style={[styles.features, needsRTLFlip && { alignItems: 'flex-end' }]}>
              <View
                style={[
                  styles.featureRow,
                  needsRTLFlip && { flexDirection: 'row-reverse' },
                ]}
              >
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                  <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
                </View>
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.featuresText,
                    { textAlign: needsRTLFlip ? 'right' : 'left' },
                  ]}
                >
                  {t('auth.featureCallerId')}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <View style={[styles.formCard, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.formHeader}>
                <ThemedText type="title" style={styles.formTitle}>
                  {t('auth.login')}
                </ThemedText>
                <ThemedText style={styles.formSubtitle} themeColor="textSecondary">
                  {t('auth.loginHint')}
                </ThemedText>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={{textAlign: needsRTLFlip ? 'right' : 'left'}}>{t('auth.identifierLabel')}</ThemedText>
                <View style={[styles.phoneRow, needsRTLFlip && { flexDirection: 'row-reverse' }] }>
                  <TextInput
                    value={identifier}
                    onChangeText={setIdentifier}
                    placeholder={t('auth.identifierPlaceholder')}
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={[
                      styles.input,
                      styles.phoneInput,
                      {
                        backgroundColor: theme.background,
                        color: theme.text,
                        textAlign: needsRTLFlip ? 'right' : 'left',
                      },
                    ]}
                  />

                  <View style={[styles.countryCodeContainer, { backgroundColor: theme.background }]}>
                    <ThemedText style={styles.countryCodeText}>🇪🇬 +2</ThemedText>
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={{textAlign: needsRTLFlip ? 'right' : 'left'}}>{t('auth.passwordLabel')}</ThemedText>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      textAlign: needsRTLFlip ? 'right' : 'left',
                    },
                  ]}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.signInButton,
                  loading && { opacity: 0.7 },
                  { backgroundColor: '#3c87f7', flexDirection: needsRTLFlip ? 'row-reverse' : 'row' },
                ]}
                onPress={handleAuth}
                disabled={loading}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name="log-in-outline" size={20} color="#3c87f7" />
                </View>
                <ThemedText style={styles.signInText}>
                  {loading ? t('common.loading') : t('auth.loginButton')}
                </ThemedText>
              </TouchableOpacity>

              <View style={[{ flexDirection: needsRTLFlip ? 'row-reverse' : 'row', gap: 4, alignItems: 'center', flexWrap: 'wrap' }]}>
                <TouchableOpacity onPress={() => router.push('/register' as any)}>
                  <ThemedText style={[styles.helperText, { color: '#3c87f7', textDecorationLine: 'underline' }]}>
                    {t('auth.createAccount')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
