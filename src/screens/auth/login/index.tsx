import { ThemedText } from '@/components/themed-text';
import { useLogoSource } from '@/hooks/use-logo-source';
import { useTheme } from '@/hooks/use-theme';
import apiClient from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, I18nManager, Image, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthScreen } from '../auth-screen';
import { sharedStyles } from '../styles';
import { loginStyles } from './styles';

const DEFAULT_PHONE = '01205808516';
const DEFAULT_PASSWORD = '01205808516';
const IS_DEV = __DEV__;

export default function LoginScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const needsRTLFlip = isArabic !== I18nManager.isRTL;
  const theme = useTheme();
  const logoSource = useLogoSource();
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
      return { normalizedIdentifier: trimmedIdentifier.toLowerCase(), isEmail: true };
    }

    if (phoneDigits.length < 10) {
      Alert.alert(t('common.error'), t('auth.identifierValidation'));
      return null;
    }

    const normalizedPhone = trimmedIdentifier.startsWith('+')
      ? normalizePhoneNumber(trimmedIdentifier)
      : `+2${phoneDigits}`;

    return { normalizedIdentifier: normalizedPhone, isEmail: false };
  };

  const validateForm = () => {
    if (!normalizeIdentifier()) return false;
    if (password.trim().length < 6) {
      Alert.alert(t('common.error'), t('auth.passwordValidation'));
      return false;
    }
    return true;
  };

  const handleAuth = async () => {
    if (!validateForm()) return;
    const normalized = normalizeIdentifier();
    if (!normalized) return;

    try {
      setLoading(true);
      const { data } = await apiClient.post('/auth/login', {
        identifier: normalized.normalizedIdentifier,
        password,
      });
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
    <AuthScreen>
      <View style={loginStyles.branding}>
        <View style={[sharedStyles.logoContainer, { backgroundColor: theme.backgroundElement }]}>
          <Image source={logoSource} style={sharedStyles.logo} resizeMode="contain" />
        </View>
        <ThemedText type="title" style={loginStyles.appName}>
          {t('common.appName')}
        </ThemedText>
        <View style={[loginStyles.indicator, { backgroundColor: '#3c87f7' }]} />

        <View style={[loginStyles.features, needsRTLFlip && { alignItems: 'flex-end' }]}>
          <View style={[loginStyles.featureRow, needsRTLFlip && { flexDirection: 'row-reverse' }]}>
            <View style={[sharedStyles.iconWrapper, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
            </View>
            <ThemedText
              type="smallBold"
              style={[loginStyles.featuresText, { textAlign: needsRTLFlip ? 'right' : 'left' }]}
            >
              {t('auth.featureCallerId')}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={[sharedStyles.formCard, { backgroundColor: theme.backgroundElement }]}>
        <View style={sharedStyles.formHeader}>
          <ThemedText type="title" style={sharedStyles.formTitle}>
            {t('auth.login')}
          </ThemedText>
          <ThemedText style={sharedStyles.formSubtitle} themeColor="textSecondary">
            {t('auth.loginHint')}
          </ThemedText>
        </View>

        <View style={sharedStyles.inputGroup}>
          <ThemedText type="smallBold" style={{ textAlign: needsRTLFlip ? 'right' : 'left' }}>
            {t('auth.identifierLabel')}
          </ThemedText>
          <View style={[sharedStyles.phoneRow, needsRTLFlip && { flexDirection: 'row-reverse' }]}>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder={t('auth.identifierPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                sharedStyles.input,
                sharedStyles.phoneInput,
                { backgroundColor: theme.background, color: theme.text, textAlign: needsRTLFlip ? 'right' : 'left' },
              ]}
            />
            <View style={[sharedStyles.countryCodeContainer, { backgroundColor: theme.background }]}>
              <ThemedText style={sharedStyles.countryCodeText}>🇪🇬 +2</ThemedText>
            </View>
          </View>
        </View>

        <View style={sharedStyles.inputGroup}>
          <ThemedText type="smallBold" style={{ textAlign: needsRTLFlip ? 'right' : 'left' }}>
            {t('auth.passwordLabel')}
          </ThemedText>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            style={[
              sharedStyles.input,
              { backgroundColor: theme.background, color: theme.text, textAlign: needsRTLFlip ? 'right' : 'left' },
            ]}
          />
        </View>

        <TouchableOpacity
          style={[
            loginStyles.signInButton,
            loading && { opacity: 0.7 },
            { backgroundColor: '#3c87f7', flexDirection: needsRTLFlip ? 'row-reverse' : 'row' },
          ]}
          onPress={handleAuth}
          disabled={loading}
        >
          <View style={sharedStyles.iconContainer}>
            <Ionicons name="log-in-outline" size={20} color="#3c87f7" />
          </View>
          <ThemedText style={loginStyles.signInText}>
            {loading ? t('common.loading') : t('auth.loginButton')}
          </ThemedText>
        </TouchableOpacity>

        <View style={{ flexDirection: needsRTLFlip ? 'row-reverse' : 'row', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => router.push('/register' as any)}>
            <ThemedText style={[sharedStyles.helperText, { color: '#3c87f7', textDecorationLine: 'underline' }]}>
              {t('auth.createAccount')}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/forgot-password' as any)}>
            <ThemedText style={[sharedStyles.helperText, { color: theme.textSecondary, textDecorationLine: 'underline' }]}>
              {t('auth.forgotPassword')}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </AuthScreen>
  );
}
