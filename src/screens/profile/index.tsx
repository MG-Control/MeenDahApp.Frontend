import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useContactSync } from '@/lib/hooks/useContactSync';
import { useAuthStore } from '@/lib/stores/authStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Switch, TouchableOpacity, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './styles';
import apiClient from '@/lib/api/client';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user, accessToken, _hasHydrated, logout, setUser } = useAuthStore();
  const { theme: currentTheme, setTheme } = useSettingsStore();
  const [anonymous, setAnonymous] = useState(false);
  const { syncContacts, isSyncing } = useContactSync();
  const [refreshing, setRefreshing] = useState(false);
  const [userTags, setUserTags] = useState<any[]>([]);

  const fetchUserTags = async () => {
    if (!_hasHydrated || !accessToken) {
      setUserTags([]);
      return;
    }

    try {
      const { data } = await apiClient.get('/auth/me/tags');
      setUserTags(data || []);
    } catch (e) {
      console.warn('Failed to fetch user tags', e);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data } = await apiClient.get('/auth/me');
      // API returns UserDto
      setUser({ id: data.id, phoneNumber: data.phoneNumber, displayName: data.displayName, email: data.email, photoURL: data.avatarUrl, isAnonymousTagger: data.isAnonymousTagger });
      await fetchUserTags();
    } catch (e) {
      console.warn('Failed to refresh profile', e);
    } finally {
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    if (!_hasHydrated || !accessToken) {
      setUserTags([]);
      return;
    }

    fetchUserTags();
  }, [_hasHydrated, accessToken]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + Spacing.four }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header with User Info */}
        <View style={[styles.header, { backgroundColor: '#3c87f7', paddingTop: insets.top + Spacing.four }]}>
          <Avatar 
            url={user?.avatarUrl} 
            name={user?.displayName || user?.email || 'User'} 
            size={100}
          />
          <ThemedText style={styles.userName}>{user?.displayName || 'User'}</ThemedText>
          <ThemedText style={styles.userEmail}>{user?.email || user?.phoneNumber}</ThemedText>
          
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => Alert.alert('Coming soon قريبا',"Coming soon قريبا")}
          >
            <ThemedText style={styles.editButtonText}>{t('profile.edit')}</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <TouchableOpacity
            onPress={() => router.push('/tags')}
            style={[styles.menuButton, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, marginTop: Spacing.two }]}
          >
            <View style={styles.menuButtonLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Ionicons name="pricetags" size={22} color="#6366f1" />
              </View>
              <View>
                <ThemedText type="default">{t('profile.tagsEntryTitle')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('profile.tagsEntrySubtitle', { count: userTags.length })}
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <ThemedText style={styles.sectionTitle} themeColor="textSecondary">
            {t('profile.accountSettings')}
          </ThemedText>
          
          <ThemedView type="backgroundElement" style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Ionicons name="eye-off" size={22} color="#6366f1" />
              </View>
              <View>
                <ThemedText type="default">{t('profile.anonymousMode')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{t('profile.anonymousDesc')}</ThemedText>
              </View>
            </View>
            <Switch 
              value={anonymous} 
              onValueChange={setAnonymous}
              trackColor={{ false: theme.backgroundSelected, true: '#3c87f7' }}
            />
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.syncCard}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                <Ionicons name="people" size={22} color="#22c55e" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="default">{t('contacts.syncTitle')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{t('contacts.syncDesc')}</ThemedText>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.syncButton}
              onPress={() => syncContacts()}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="sync" size={20} color="#fff" />
                  <ThemedText style={styles.syncButtonText}>{t('contacts.syncButton')}</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </ThemedView>

          <ThemedText style={styles.sectionTitle} themeColor="textSecondary">
            {t('profile.appPreferences')}
          </ThemedText>
          
          <ThemedView type="backgroundElement" style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="language" size={22} color="#59130f6" />
              </View>
              <ThemedText type="default">{t('profile.language')}</ThemedText>
            </View>
            <LanguageSwitcher />
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.settingCard}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Ionicons name="moon" size={22} color="#f59e0b" />
              </View>
              <ThemedText type="default">{t('profile.theme')}</ThemedText>
            </View>
            <View style={styles.themeToggle}>
               <TouchableOpacity 
                onPress={() => setTheme('light')}
                style={[styles.themeOption, currentTheme === 'light' && { backgroundColor: theme.backgroundSelected }]}
              >
                <Ionicons name="sunny" size={18} color={currentTheme === 'light' ? '#3c87f7' : theme.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setTheme('dark')}
                style={[styles.themeOption, currentTheme === 'dark' && { backgroundColor: theme.backgroundSelected }]}
              >
                <Ionicons name="moon" size={18} color={currentTheme === 'dark' ? '#3c87f7' : theme.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setTheme('system')}
                style={[styles.themeOption, currentTheme === 'system' && { backgroundColor: theme.backgroundSelected }]}
              >
                <Ionicons name="settings" size={18} color={currentTheme === 'system' ? '#3c87f7' : theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </ThemedView>

          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
            onPress={logout}
          >
            <Ionicons name="log-out" size={22} color="#ef4444" />
            <ThemedText style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: Spacing.two }}>
              {t('common.logout')}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
