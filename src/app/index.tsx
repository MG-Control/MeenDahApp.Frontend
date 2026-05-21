import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

WebBrowser.maybeCompleteAuthSession();

type GoogleUser = {
  email?: string;
  family_name?: string;
  given_name?: string;
  name?: string;
  picture?: string;
};

const AUTH_STORAGE_KEY = 'meendah.googleUser';
const DEV_USER: GoogleUser = {
  email: 'dev@meendah.local',
  given_name: 'Dev',
  family_name: 'User',
  name: 'Dev User',
};

async function getStoredUser() {
  if (Platform.OS === 'web') {
    return localStorage.getItem(AUTH_STORAGE_KEY);
  }

  return SecureStore.getItemAsync(AUTH_STORAGE_KEY);
}

async function setStoredUser(user: GoogleUser) {
  const value = JSON.stringify(user);

  if (Platform.OS === 'web') {
    localStorage.setItem(AUTH_STORAGE_KEY, value);
    return;
  }

  await SecureStore.setItemAsync(AUTH_STORAGE_KEY, value);
}

function mapNativeGoogleUser(userInfo: Awaited<ReturnType<typeof GoogleSignin.signIn>>): GoogleUser {
  if (userInfo.type !== 'success') {
    return {};
  }

  return {
    email: userInfo.data.user.email,
    family_name: userInfo.data.user.familyName ?? undefined,
    given_name: userInfo.data.user.givenName ?? undefined,
    name: userInfo.data.user.name ?? undefined,
    picture: userInfo.data.user.photo ?? undefined,
  };
}

export default function HomeScreen() {
  const theme = useTheme();
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const shouldBypassAuth = process.env.EXPO_PUBLIC_SKIP_AUTH === 'true';

  const currentPlatformClientId =
    Platform.OS === 'android'
      ? androidClientId
      : Platform.OS === 'ios'
        ? iosClientId
        : webClientId;
  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'meendah',
    path: 'oauthredirect',
  });

  const isGoogleConfigured = Boolean(currentPlatformClientId);
  const isGoogleAvailable = isGoogleConfigured && !isExpoGo;

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId,
    androidClientId,
    iosClientId,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });

  useEffect(() => {
    if (Platform.OS === 'web' || isExpoGo) {
      return;
    }

    GoogleSignin.configure({
      webClientId,
      iosClientId,
      offlineAccess: false,
      scopes: ['profile', 'email'],
    });
  }, [isExpoGo, iosClientId, webClientId]);

  useEffect(() => {
    async function restoreSession() {
      try {
        if (__DEV__ && shouldBypassAuth) {
          setUser(DEV_USER);
          return;
        }

        const storedUser = await getStoredUser();

        if (storedUser) {
          setUser(JSON.parse(storedUser) as GoogleUser);
        }
      } catch {
        setErrorMessage('We could not restore your saved session.');
      } finally {
        setIsRestoringSession(false);
      }
    }

    void restoreSession();
  }, [shouldBypassAuth]);

  useEffect(() => {
    async function loadUser() {
      if (response?.type !== 'success') {
        if (response?.type === 'error') {
          console.error('Google auth error response:', JSON.stringify(response, null, 2));
          setErrorMessage('Google sign-in failed. Please try again.');
        }
        return;
      }

      const accessToken = response.authentication?.accessToken;

      if (!accessToken) {
        setErrorMessage('Google sign-in succeeded but no access token was returned.');
        return;
      }

      try {
        setIsLoadingProfile(true);
        setErrorMessage(null);
        const profile = await AuthSession.fetchUserInfoAsync(
          { accessToken },
          { userInfoEndpoint: 'https://www.googleapis.com/oauth2/v3/userinfo' }
        );
        const googleUser = profile as GoogleUser;
        setUser(googleUser);
        await setStoredUser(googleUser);
      } catch {
        setErrorMessage('Signed in, but we could not load your Google profile.');
      } finally {
        setIsLoadingProfile(false);
      }
    }

    void loadUser();
  }, [response]);

  const handleGoogleSignIn = async () => {
    if (isExpoGo) {
      setErrorMessage(
        'Google sign-in is not supported in Expo Go. Use the web build or install a development build on your phone.'
      );
      return;
    }

    if (Platform.OS !== 'web') {
      try {
        setIsLoadingProfile(true);
        setErrorMessage(null);
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const userInfo = await GoogleSignin.signIn();

        if (userInfo.type === 'cancelled') {
          setErrorMessage('Google sign-in was cancelled.');
          return;
        }

        const googleUser = mapNativeGoogleUser(userInfo);
        setUser(googleUser);
        await setStoredUser(googleUser);
      } catch (error) {
        if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
          setErrorMessage('Google sign-in was cancelled.');
        } else if (isErrorWithCode(error) && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setErrorMessage('Google Play Services is not available or needs an update.');
        } else {
          console.error('Native Google sign-in error:', error);
          setErrorMessage('Google sign-in failed on this device. Please try again.');
        }
      } finally {
        setIsLoadingProfile(false);
      }
      return;
    }

    if (!request) {
      return;
    }

    setErrorMessage(null);
    console.log('Google auth request config:', {
      platform: Platform.OS,
      redirectUri,
      hasWebClientId: Boolean(webClientId),
      hasAndroidClientId: Boolean(androidClientId),
      hasIosClientId: Boolean(iosClientId),
      requestUrl: request.url,
    });
    const result = await promptAsync();
    console.log('Google prompt result:', JSON.stringify(result, null, 2));

    if (result.type === 'cancel') {
      setErrorMessage('Google sign-in was cancelled.');
    }
  };

  const googleStatusMessage = !isGoogleConfigured
    ? Platform.OS === 'android'
      ? 'Add EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID to enable Google sign-in on Android.'
      : Platform.OS === 'ios'
        ? 'Add EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID to enable Google sign-in on iOS.'
        : 'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to enable Google sign-in on web.'
    : isExpoGo
      ? 'Expo Go does not support this Google OAuth flow. Keep using expo start for UI work, and use web or a development build when you need to test Google sign-in on your phone.'
      : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>
            Welcome to&nbsp;Meendah!&nbsp;👋
          </ThemedText>
        </ThemedView>

        <ThemedText type="code" style={styles.code}>
          get started
        </ThemedText>

        {/* <ThemedView type="backgroundElement" style={styles.stepContainer}>
          <HintRow
            title="Try editing"
            hint={<ThemedText type="code">src/app/index.tsx</ThemedText>}
          />
          <HintRow title="Dev tools" hint={getDevMenuHint()} />
          <HintRow
            title="Fresh start"
            hint={<ThemedText type="code">npm run reset-project</ThemedText>}
          />
        </ThemedView> */}

        <ThemedView style={styles.authSection}>
          <Pressable
            disabled={
              (Platform.OS === 'web' && !request) ||
              !isGoogleAvailable ||
              isLoadingProfile ||
              isRestoringSession
            }
            onPress={() => {
              void handleGoogleSignIn();
            }}
            style={({ pressed }) => [
              styles.googleButtonPressable,
              pressed && styles.pressed,
              ((Platform.OS === 'web' && !request) ||
                !isGoogleAvailable ||
                isLoadingProfile ||
                isRestoringSession) &&
                styles.buttonDisabled,
            ]}>
            <ThemedView style={styles.googleButton}>
              {isLoadingProfile || isRestoringSession ? (
                <ActivityIndicator color={theme.text} />
              ) : (
                <ThemedText style={styles.googleMark}>G</ThemedText>
              )}
              <ThemedText style={styles.googleButtonText}>
                {isRestoringSession
                  ? 'Restoring session...'
                  : isLoadingProfile
                    ? 'Signing in...'
                    : 'Continue with Google'}
              </ThemedText>
            </ThemedView>
          </Pressable>

          {user ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.statusText}>
              Signed in as {user.email ?? user.name ?? 'Google user'}
            </ThemedText>
          ) : null}

          {errorMessage ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.statusText}>
              {errorMessage}
            </ThemedText>
          ) : null}

          {googleStatusMessage ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.statusText}>
              {googleStatusMessage}
            </ThemedText>
          ) : null}
        </ThemedView>

        {Platform.OS === 'web' && <WebBadge />}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
  code: {
    textTransform: 'uppercase',
  },
  stepContainer: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
  authSection: {
    alignSelf: 'stretch',
    gap: Spacing.two,
  },
  googleButtonPressable: {
    alignSelf: 'stretch',
  },
  googleButton: {
    minHeight: 56,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: '#ffffff',
  },
  googleMark: {
    fontSize: 20,
    fontWeight: 700,
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#111827',
    fontWeight: 700,
  },
  statusText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
