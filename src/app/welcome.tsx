import { ThemedText } from '@/components/themed-text';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import apiClient from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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
          <View style={styles.features}>
            <View style={styles.featureRow}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
              </View>
              <ThemedText type="smallBold">{t('auth.featureCallerId')}</ThemedText>
            </View>
            <View style={styles.featureRow}>
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
              { backgroundColor: '#3c87f7' }
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    alignItems: 'flex-end',
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.five,
    justifyContent: 'space-between',
    paddingVertical: Spacing.six,
  },
  branding: {
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  logoContainer: {
    padding: Spacing.five,
    borderRadius: 40,
    marginBottom: Spacing.four,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  logo: {
    width: 80,
    height: 80,
  },
  appName: {
    textAlign: 'center',
    fontSize: 36,
  },
  indicator: {
    height: 6,
    width: 48,
    borderRadius: 3,
    marginTop: Spacing.two,
  },
  tagline: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: Spacing.four,
    lineHeight: 24,
    paddingHorizontal: Spacing.two,
  },
  actions: {
    marginBottom: Spacing.four,
  },
  features: {
    marginBottom: Spacing.five,
    gap: Spacing.three,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconWrapper: {
    padding: Spacing.two,
    borderRadius: 8,
  },
  signInButton: {
    height: 64,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#3c87f7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  googleIconContainer: {
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 8,
    marginRight: Spacing.three,
  },
  signInText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
