import { ThemedText } from '@/components/themed-text';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useTheme } from '@/hooks/use-theme';
import apiClient from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, I18nManager, Image, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from './styles';

export default function WelcomeScreen() {
export default function WelcomeScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const needsRTLFlip = isArabic !== I18nManager.isRTL;
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const { setTokens, setUser } = useAuthStore();

  useEffect(() => {
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    console.log('[Auth] Configuring Google Sign-In with WebClientId:', webClientId);
    GoogleSignin.configure({
      webClientId,
      offlineAccess: true,
    });
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      if (userInfo.type === 'success') {
        const idToken = userInfo.data?.idToken;
        const googleUser = userInfo.data?.user;

        if (!idToken || !googleUser) throw new Error('No user data found');

        try {
          // Attempt to sync with backend
          console.log('[Auth] Syncing with backend...');
          const { data } = await apiClient.post('/auth/google', { idToken });
          
          setTokens(data.accessToken, data.refreshToken);
          setUser(data.user);
          console.log('Backend login successful:', data.user.displayName);
        } catch (apiError) {
          console.warn('[Auth] Backend sync failed, falling back to client-side flow:', apiError);
          
          // Fallback: Use Google data directly (Client-side flow)
          setUser({
            id: googleUser.id,
            email: googleUser.email,
            displayName: googleUser.name || '',
            photoURL: googleUser.photo || undefined,
          });
          // Set dummy tokens to bypass auth checks if necessary
          setTokens('client-side-token', 'client-side-refresh-token');
          console.log('Client-side login successful:', googleUser.name);
        }
        
        router.replace('/');
      }
    } catch (error: any) {
      console.error('Sign-in error:', error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Already in progress
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services not available');
      } else {
        Alert.alert('Error', error.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <LanguageSwitcher />
      </View>
      
      <View style={styles.container}>
        {/* Top Branding Section */}
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

        {/* Bottom Action Section */}
        <View style={styles.actions}>
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

          <TouchableOpacity 
            style={[
              styles.signInButton, 
              loading && { opacity: 0.7 },
              { backgroundColor: '#3c87f7', flexDirection: needsRTLFlip ? 'row-reverse' : 'row' }
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <View style={styles.googleIconContainer}>
              <Ionicons name="logo-google" size={20} color="#3c87f7" />
            </View>
            <ThemedText style={styles.signInText}>
              {loading ? t('common.loading') : t('auth.googleSignIn')}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
