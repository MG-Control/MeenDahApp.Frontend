import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { LoadingState } from '@/components/ui/loading-state';
import { UNKNOWN_TAG_ID } from '@/constants/tags';
import { useTheme } from '@/hooks/use-theme';
import { PhoneDetails } from '@/lib/hooks/usePhoneLookup';
import apiClient from '@/lib/api/client';
import { encodePhoneForRoute } from '@/lib/utils/phoneRoute';
import { styles } from './styles';
import { appStorage } from '@/lib/stores/appStorage';

interface SearchResultItem {
  e164: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  spamScore?: number;
  totalSearches?: number;
  tags?: string[];
  userId?: string | null;
  gender?: string | null;
  residence?: string | null;
  country?: string | null;
  birthplace?: string | null;
  relationship?: string | null;
  workplace?: string | null;
  joined?: string | null;
  birthdate?: string | null;
  facebookUrl?: string | null;
  whatsappUrl?: string | null;
  telegramUrl?: string | null;
  viberUrl?: string | null;
  signalUrl?: string | null;
  skypeUrl?: string | null;
  messengerUrl?: string | null;
}

export default function SearchScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  type RecentEntry = { query: string; item?: SearchResultItem };
  const [recentSearches, setRecentSearches] = useState<RecentEntry[]>([]);
  const RECENT_KEY = 'recent_searches';

  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const raw = await appStorage.getItem(RECENT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as RecentEntry[];
          setRecentSearches(parsed);
        }
      } catch (e) {
        console.warn('Failed to load recent searches', e);
      }
    };
    loadRecentSearches();
  }, []);

  const saveRecentSearches = async (searches: RecentEntry[]) => {
    try {
      await appStorage.setItem(RECENT_KEY, JSON.stringify(searches));
    } catch (e) {
      console.warn('Failed to save recent searches', e);
    }
  };

  const handleSearch = async (text: string) => {
    // Only keep digits
    const digitsOnly = text.replace(/\D/g, '');
    setQuery(digitsOnly);
    if (digitsOnly.length < 11) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/phones/search?q=${encodeURIComponent(digitsOnly)}`);
      setResults(data);
      // Save successful searches to recent list (keep unique, most recent first)
      if (Array.isArray(data) && data.length > 0) {
        const entry: RecentEntry = { query: text, item: data[0] };
        setRecentSearches((prev) => {
          const filtered = prev.filter((s) => s.query !== text);
          const next = [entry, ...filtered].slice(0, 5);
          saveRecentSearches(next);
          return next;
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderResultItem = ({ item }: { item: SearchResultItem }) => (
    <TouchableOpacity 
      style={[styles.resultCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
      onPress={() => {
        const cachedPhone: PhoneDetails = {
          e164: item.e164,
          displayName: item.displayName,
          email: item.email,
          avatarUrl: item.avatarUrl,
          userId: item.userId,
          gender: item.gender,
          residence: item.residence,
          country: item.country,
          birthplace: item.birthplace,
          relationship: item.relationship,
          workplace: item.workplace,
          joined: item.joined,
          birthdate: item.birthdate,
          spamScore: item.spamScore ?? 0,
          totalSearches: item.totalSearches ?? 0,
          lastActivityAt: new Date().toISOString(),
          tags: (item.tags ?? []).map((text, index) => ({
            id: -(index + 1),
            text,
            category: UNKNOWN_TAG_ID,
            createdAt: new Date().toISOString(),
          })),
          facebookUrl: item.facebookUrl,
          whatsappUrl: item.whatsappUrl,
          telegramUrl: item.telegramUrl,
          viberUrl: item.viberUrl,
          signalUrl: item.signalUrl,
          skypeUrl: item.skypeUrl,
        };

        queryClient.setQueryData(['phone', item.e164], cachedPhone);
        router.push(`/phone/${encodePhoneForRoute(item.e164)}?skipLookup=1` as any);
      }}
    >
      <Avatar 
        name={item.displayName || item.e164} 
        url={item.avatarUrl}
        size={50}
      />
      <View style={styles.resultInfo}>
        <ThemedText type="default" style={styles.resultName}>
          {item.displayName || t('common.unknownCaller', 'Unknown Caller')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {item.e164}
        </ThemedText>
        {item.email && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {item.email}
          </ThemedText>
        )}
      </View>
      <View style={[styles.arrowIcon, { backgroundColor: '#3c87f7' + '15' }]}>
        <Ionicons name="chevron-forward" size={18} color="#3c87f7" />
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={[styles.header, { backgroundColor: '#3c87f7' }]}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <View>
                <ThemedText style={styles.appName}>
                  {t('common.appName')}
                </ThemedText>
                <ThemedText style={styles.headerTitle}>
                  {t('common.search')}
                </ThemedText>
              </View>
              <TouchableOpacity 
                onPress={() => router.push('/profile')}
                style={styles.profileButton}
              >
                <Ionicons name="person-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <TouchableOpacity onPress={() => handleSearch(query)} activeOpacity={0.75} style={styles.searchIconButton}>
                <Ionicons name="search" size={22} color="#3c87f7" />
              </TouchableOpacity>
              <TextInput
                style={styles.searchInput}
                placeholder={t('common.search')}
                placeholderTextColor="#94a3b8"
                value={query}
                onChangeText={handleSearch}
                autoCorrect={false}
                keyboardType="phone-pad"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch('')}>
                  <Ionicons name="close-circle" size={20} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

          </SafeAreaView>
          
           
        </View>

 {/* Recent searches card */}
            {recentSearches.length > 0 && query.length === 0 ? (
              <ThemedView type="backgroundElement" style={[styles.recentCard, { borderColor: theme.backgroundSelected }]}> 
                <View style={styles.recentHeaderRow}>
                  <ThemedText type="smallBold" style={styles.recentTitle} themeColor="textSecondary">
                    {t('explore.recentSearches')}
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.recentClearButton, { backgroundColor: theme.backgroundSelected }]}
                    activeOpacity={0.85}
                    onPress={async () => {
                      try { await appStorage.removeItem(RECENT_KEY); } catch (e) {}
                      setRecentSearches([]);
                    }}
                  >
                    <Ionicons name="trash-outline" size={14} color={theme.textSecondary} />
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('common.clear')}
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                <View style={styles.recentContainer}>
                  {recentSearches.map((entry) => (
                    <TouchableOpacity
                      key={entry.query}
                      activeOpacity={0.88}
                      style={[styles.resultCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
                      onPress={() => {
                        setQuery(entry.query);
                        handleSearch(entry.query);
                      }}
                    >
                      <Avatar name={entry.item?.displayName || entry.query} url={entry.item?.avatarUrl} size={50} />
                      <View style={styles.resultInfo}>
                        <ThemedText type="default" style={styles.resultName}>{entry.item?.displayName || entry.query}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">{entry.item?.e164 || entry.query}</ThemedText>
                        {entry.item?.email ? <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{entry.item.email}</ThemedText> : null}
                      </View>

                      <TouchableOpacity
                        style={styles.recentDeleteButton}
                        hitSlop={10}
                        onPress={async (event) => {
                          event.stopPropagation?.();
                          const next = recentSearches.filter((s) => s.query !== entry.query);
                          try { await saveRecentSearches(next); } catch (e) {}
                          setRecentSearches(next);
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              </ThemedView>
            ) : null}

        {loading ? (
          <LoadingState />
        ) : (
          <FlatList
            data={results}
            renderItem={renderResultItem}
            keyExtractor={(item) => item.e164}
            contentContainerStyle={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              query.length > 0 && query.length < 11 ? (
                <View style={styles.emptyContainer}>
                  <ThemedText themeColor="textSecondary">
                    {t('explore.minDigitsHint')}
                  </ThemedText>
                </View>
              ) : query.length >= 11 ? (
                <View style={styles.emptyContainer}>
                  <ThemedText themeColor="textSecondary">
                    {t('explore.noResults', { query })}
                  </ThemedText>
                </View>
              ) : null
            }
          />
        )}
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
