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
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, Switch, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './styles';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { theme: currentTheme, setTheme } = useSettingsStore();
  const [anonymous, setAnonymous] = useState(false);
  const { syncContacts, isSyncing } = useContactSync();

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + Spacing.four }}
      >
        {/* Header with User Info */}
        <View style={[styles.header, { backgroundColor: '#3c87f7', paddingTop: insets.top + Spacing.four }]}>
          <Avatar 
            url={user?.photoURL} 
            name={user?.displayName || user?.email || 'User'} 
            size={100}
          />
          <ThemedText style={styles.userName}>{user?.displayName || 'User'}</ThemedText>
          <ThemedText style={styles.userEmail}>{user?.email || user?.phoneNumber}</ThemedText>
          
          <TouchableOpacity style={styles.editButton}>
            <ThemedText style={styles.editButtonText}>{t('profile.edit')}</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
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
                <Ionicons name="language" size={22} color="#3b82f6" />
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
