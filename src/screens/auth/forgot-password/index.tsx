import { ThemedText } from '@/components/themed-text';
import { useLogoSource } from '@/hooks/use-logo-source';
import { useTheme } from '@/hooks/use-theme';
import apiClient from '@/lib/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, I18nManager, Image, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthScreen } from '../auth-screen';
import { sharedStyles } from '../styles';
import { forgotStyles } from './styles';

const SUPPORT_FACEBOOK_URL = 'https://www.facebook.com/mgcontrolcom';

type ScreenState = 'idle' | 'emailSent' | 'phoneSupport';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const needsRTLFlip = isArabic !== I18nManager.isRTL;
  const theme = useTheme();
  const logoSource = useLogoSource();

  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ScreenState>('idle');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const isEmail = (value: string) => value.includes('@');

  const handleSubmit = async () => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      Alert.alert(t('common.error'), t('auth.identifierValidation'));
      return;
    }

    if (isEmail(trimmed)) {
      if (trimmed.length < 5) {
        Alert.alert(t('common.error'), t('auth.identifierValidation'));
        return;
      }
      try {
        setLoading(true);
        await apiClient.post('/auth/forgot-password', { identifier: trimmed.toLowerCase() });
        setSubmittedEmail(trimmed.toLowerCase());
        setState('emailSent');
      } catch (error: any) {
        Alert.alert(t('common.error'), error?.response?.data || error?.message || t('common.error'));
      } finally {
        setLoading(false);
      }
    } else {
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length < 10) {
        Alert.alert(t('common.error'), t('auth.identifierValidation'));
        return;
      }
      setState('phoneSupport');
    }
  };

  const handleOpenFacebook = () => {
    if (!SUPPORT_FACEBOOK_URL) return;
    Linking.openURL(SUPPORT_FACEBOOK_URL).catch(() =>
      Alert.alert(t('common.error'), t('phone.linkNotSupported'))
    );
  };

  if (state === 'emailSent') {
    return (
      <AuthScreen>
        <View style={forgotStyles.hero}>
          <View style={[sharedStyles.logoContainer, { backgroundColor: theme.backgroundElement }]}>
            <Image source={logoSource} style={sharedStyles.logo} resizeMode="contain" />
          </View>
        </View>

        <View style={[sharedStyles.formCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <View style={[forgotStyles.stateIconWrapper, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Ionicons name="mail-outline" size={36} color="#22c55e" />
            </View>
            <ThemedText type="title" style={forgotStyles.stateTitle}>
              {t('auth.emailSentTitle')}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={forgotStyles.stateDesc}>
              {t('auth.emailSentDesc', { email: submittedEmail })}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={[sharedStyles.primaryButton, { backgroundColor: '#3c87f7' }]}
            onPress={() => router.replace('/login' as any)}
          >
            <ThemedText style={sharedStyles.primaryButtonText}>
              {t('auth.backToLogin')}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </AuthScreen>
    );
  }

  if (state === 'phoneSupport') {
    return (
      <AuthScreen>
        <View style={forgotStyles.hero}>
          <View style={[sharedStyles.logoContainer, { backgroundColor: theme.backgroundElement }]}>
            <Image source={logoSource} style={sharedStyles.logo} resizeMode="contain" />
          </View>
        </View>

        <View style={[sharedStyles.formCard, { backgroundColor: theme.backgroundElement }]}>
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <View style={[forgotStyles.stateIconWrapper, { backgroundColor: 'rgba(24, 119, 242, 0.12)' }]}>
              <Ionicons name="logo-facebook" size={36} color="#1877F2" />
            </View>
            <ThemedText type="title" style={forgotStyles.stateTitle}>
              {t('auth.phoneSupportTitle')}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={forgotStyles.stateDesc}>
              {t('auth.phoneSupportDesc')}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={[forgotStyles.facebookButton, !SUPPORT_FACEBOOK_URL && { opacity: 0.5 }]}
            onPress={handleOpenFacebook}
            disabled={!SUPPORT_FACEBOOK_URL}
          >
            <Ionicons name="logo-facebook" size={20} color="#fff" />
            <ThemedText style={forgotStyles.facebookButtonText}>
              {t('auth.contactSupportFacebook')}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setState('idle')}>
            <ThemedText style={[sharedStyles.helperText, { color: '#3c87f7', textDecorationLine: 'underline' }]}>
              {t('auth.tryDifferentMethod')}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/login' as any)}>
            <ThemedText style={[sharedStyles.helperText, { color: theme.textSecondary }]}>
              {t('auth.backToLogin')}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <View style={forgotStyles.hero}>
        <View style={[sharedStyles.logoContainer, { backgroundColor: theme.backgroundElement }]}>
          <Image source={logoSource} style={sharedStyles.logo} resizeMode="contain" />
        </View>
        <ThemedText type="title" style={forgotStyles.appName}>
          {t('common.appName')}
        </ThemedText>
      </View>

      <View style={[sharedStyles.formCard, { backgroundColor: theme.backgroundElement }]}>
        <View style={sharedStyles.formHeader}>
          <ThemedText type="title" style={sharedStyles.formTitle}>
            {t('auth.forgotPasswordTitle')}
          </ThemedText>
          <ThemedText style={sharedStyles.formSubtitle} themeColor="textSecondary">
            {t('auth.forgotPasswordHint')}
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
            {!isEmail(identifier) && identifier.length > 0 && (
              <View style={[sharedStyles.countryCodeContainer, { backgroundColor: theme.background }]}>
                <ThemedText style={sharedStyles.countryCodeText}>🇪🇬 +2</ThemedText>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            sharedStyles.primaryButton,
            loading && { opacity: 0.7 },
            { backgroundColor: '#3c87f7', flexDirection: needsRTLFlip ? 'row-reverse' : 'row' },
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <View style={sharedStyles.iconContainer}>
            <Ionicons name="send-outline" size={20} color="#3c87f7" />
          </View>
          <ThemedText style={sharedStyles.primaryButtonText}>
            {loading ? t('common.loading') : t('auth.sendResetLink')}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={[sharedStyles.helperText, { color: '#3c87f7', textDecorationLine: 'underline' }]}>
            {t('auth.backToLogin')}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </AuthScreen>
  );
}
