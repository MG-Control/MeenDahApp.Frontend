import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import apiClient from '@/lib/api/client';
import { ContactEntry, useContactPickerStore } from '@/lib/stores/contactPickerStore';
import { dedupeContactsByPhone } from '@/lib/utils/phoneNormalizer';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { styles } from './styles';

export default function ContactPickerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { pendingContacts, clear } = useContactPickerStore();
  const { setHasSyncedContacts } = useSettingsStore();

  const contacts = useMemo(
    () => dedupeContactsByPhone(pendingContacts),
    [pendingContacts]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(
    () => new Set(contacts.map(c => c.phoneNumber))
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      c => c.name.toLowerCase().includes(q) || c.phoneNumber.includes(q)
    );
  }, [contacts, searchQuery]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selectedPhones.has(c.phoneNumber));

  const toggleContact = useCallback((phoneNumber: string) => {
    setSelectedPhones(prev => {
      const next = new Set(prev);
      next.has(phoneNumber) ? next.delete(phoneNumber) : next.add(phoneNumber);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedPhones(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach(c => next.delete(c.phoneNumber));
      } else {
        filtered.forEach(c => next.add(c.phoneNumber));
      }
      return next;
    });
  }, [allFilteredSelected, filtered]);

  const syncMutation = useMutation({
    mutationFn: async (contacts: ContactEntry[]) => {
      await apiClient.post('/phones/sync', {
        contacts: contacts.map(c => ({ name: c.name, phoneNumber: c.phoneNumber, email: c.email })),
      });
    },
    onSuccess: () => {
      setHasSyncedContacts(true);
      clear();
      router.replace('/');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || t('common.error');
      console.error('[ContactPicker] Sync error:', msg);
    },
  });

  const handleContinue = () => {
    const selected = contacts.filter(c => selectedPhones.has(c.phoneNumber));
    if (selected.length === 0) return;
    syncMutation.mutate(selected);
  };

  const handleSkip = () => {
    clear();
    router.back();
  };

  const renderItem = useCallback(({ item }: { item: ContactEntry }) => {
    const isSelected = selectedPhones.has(item.phoneNumber);
    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => toggleContact(item.phoneNumber)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: isSelected ? '#3c87f7' : theme.textSecondary,
              backgroundColor: isSelected ? '#3c87f7' : 'transparent',
            },
          ]}
        >
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>

        <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}>
          {item.avatarUri ? (
            <Image source={{ uri: item.avatarUri }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={24} color={theme.textSecondary} />
          )}
        </View>

        <View style={styles.contactInfo}>
          <ThemedText style={styles.contactName} numberOfLines={1}>
            {item.name || t('contacts.unknown')}
          </ThemedText>
          <ThemedText style={styles.contactPhone} themeColor="textSecondary" numberOfLines={1}>
            {item.phoneNumber}
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  }, [selectedPhones, theme, toggleContact, t]);

  const selectedCount = contacts.filter(c => selectedPhones.has(c.phoneNumber)).length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
        <ThemedText style={styles.headerTitle}>
          {t('contacts.tagListTitle')}
        </ThemedText>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.searchButton} onPress={() => setShowSearch(v => !v)}>
            <Ionicons name="search-outline" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <ThemedText themeColor="textSecondary">{t('common.skip')}</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {showSearch && (
        <View style={[styles.searchContainer, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={t('common.searchPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.selectAllRow}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {t('contacts.selected', { count: selectedCount })}
        </ThemedText>
        <TouchableOpacity onPress={toggleSelectAll}>
          <ThemedText type="smallBold" style={{ color: '#3c87f7' }}>
            {allFilteredSelected
              ? t('contacts.deselectAll')
              : t('contacts.selectAll')}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={item => item.phoneNumber}
        renderItem={renderItem}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
        )}
        removeClippedSubviews
        maxToRenderPerBatch={20}
        windowSize={10}
        initialNumToRender={20}
      />

      <View style={[styles.footer, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (selectedCount === 0 || syncMutation.isPending) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={selectedCount === 0 || syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.continueButtonText}>
              {t('contacts.continueTagging')}
            </ThemedText>
          )}
        </TouchableOpacity>
        <ThemedText style={styles.footerHint} themeColor="textSecondary">
          {t('contacts.tagHint')}
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}
