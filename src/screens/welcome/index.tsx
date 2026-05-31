import { ThemedText } from '@/components/themed-text';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useTheme } from '@/hooks/use-theme';
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

type AuthMode = 'login' | 'register';

const DEFAULT_PHONE = '01205808516';
const DEFAULT_PASSWORD = '01205808516';
const IS_DEV = __DEV__;

export default function WelcomeScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const needsRTLFlip = isArabic !== I18nManager.isRTL;
  const theme = useTheme();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [identifier, setIdentifier] = useState(IS_DEV ? DEFAULT_PHONE : '');
  const [password, setPassword] = useState(IS_DEV ? DEFAULT_PASSWORD : '');
  const { setTokens, setUser } = useAuthStore();

  const normalizePhoneNumber = (value: string) => value.replace(/[^\d+]/g, '');

  const applyDefaultValues = (nextMode: AuthMode) => {
    setMode(nextMode);
    setDisplayName('');
    setIdentifier(IS_DEV && nextMode === 'login' ? DEFAULT_PHONE : '');
    setPassword(IS_DEV && nextMode === 'login' ? DEFAULT_PASSWORD : '');
  };

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

    return {
      normalizedIdentifier: normalizePhoneNumber(trimmedIdentifier),
      isEmail: false,
    };
  };

  const validateForm = () => {
    if (mode === 'register' && displayName.trim().length < 2) {
      Alert.alert(t('common.error'), t('auth.nameValidation'));
      return false;
    }

    if (!normalizeIdentifier()) {
      return false;
    }

    if (password.trim().length < 6) {
      Alert.alert(t('common.error'), t('auth.passwordValidation'));
      return false;
    }

    return true;
  };

  const resolveDisplayName = (normalizedIdentifier: string, isEmail: boolean) =>
    mode === 'register'
      ? displayName.trim()
      : isEmail
        ? normalizedIdentifier.split('@')[0] || t('auth.defaultUserName')
        : t('auth.defaultUserName');

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

      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload =
        mode === 'login'
          ? {
              identifier: normalized.normalizedIdentifier,
              password,
            }
          : {
              identifier: normalized.normalizedIdentifier,
              displayName: resolveDisplayName(normalized.normalizedIdentifier, normalized.isEmail),
              password,
            };

      const { data } = await apiClient.post(endpoint, payload);

      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      router.replace('/');
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.response?.data || error?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
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
                source={require('@/assets/images/expo-logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <ThemedText type="title" style={styles.appName}>
              {t('common.appName')}
            </ThemedText>
            <View style={[styles.indicator, { backgroundColor: '#3c87f7' }]} />
            <ThemedText style={styles.tagline} themeColor="textSecondary">
              {t('auth.tagline')}
            </ThemedText>
          </View>

          <View style={styles.actions}>
            <View style={[styles.modeSwitcher, { backgroundColor: theme.backgroundElement }]}>
              {(['login', 'register'] as AuthMode[]).map((item) => {
                const active = mode === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.modeButton, active && { backgroundColor: '#3c87f7' }]}
                    onPress={() => applyDefaultValues(item)}
                  >
                    <ThemedText style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>
                      {item === 'login' ? t('auth.login') : t('auth.register')}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.formCard, { backgroundColor: theme.backgroundElement }]}>
              {mode === 'register' ? (
                <View style={styles.inputGroup}>
                  <ThemedText type="smallBold">{t('auth.nameLabel')}</ThemedText>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder={t('auth.namePlaceholder')}
                    placeholderTextColor={theme.textSecondary}
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
              ) : null}

              <View style={styles.inputGroup}>
                <ThemedText type="smallBold">{t('auth.identifierLabel')}</ThemedText>
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder={t('auth.identifierPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
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

              <View style={styles.inputGroup}>
                <ThemedText type="smallBold">{t('auth.passwordLabel')}</ThemedText>
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
                  <Ionicons name={mode === 'login' ? 'log-in-outline' : 'person-add-outline'} size={20} color="#3c87f7" />
                </View>
                <ThemedText style={styles.signInText}>
                  {loading
                    ? t('common.loading')
                    : mode === 'login'
                      ? t('auth.loginButton')
                      : t('auth.registerButton')}
                </ThemedText>
              </TouchableOpacity>

              <ThemedText style={styles.helperText} themeColor="textSecondary">
                {t('auth.passwordHelper')}
              </ThemedText>
            </View>

            <View style={[styles.features, needsRTLFlip && { alignItems: 'flex-end' }]}>
              <View style={[styles.featureRow, needsRTLFlip && { flexDirection: 'row-reverse' }]}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                  <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
                </View>
                <ThemedText type="smallBold">{t('auth.featureCallerId')}</ThemedText>
              </View>
              <View style={[styles.featureRow, needsRTLFlip && { flexDirection: 'row-reverse' }]}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <Ionicons name="ban" size={20} color="#ef4444" />
                </View>
                <ThemedText type="smallBold">{t('auth.featureSpamBlock')}</ThemedText>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
