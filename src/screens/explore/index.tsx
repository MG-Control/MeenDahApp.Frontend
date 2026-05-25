import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { LoadingState } from '@/components/ui/loading-state';
import { useTheme } from '@/hooks/use-theme';
import apiClient from '@/lib/api/client';
import { encodePhoneForRoute } from '@/lib/utils/phoneRoute';
import { styles } from './styles';

export default function SearchScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 10) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/phones/search?q=${encodeURIComponent(text)}`);
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderResultItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.resultCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
      onPress={() => {
        router.push(`/phone/${encodePhoneForRoute(item.e164)}` as any);
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
              <Ionicons name="search" size={22} color="#3c87f7" />
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
              query.length > 0 && query.length < 10 ? (
                <View style={styles.emptyContainer}>
                  <ThemedText themeColor="textSecondary">
                    {t('explore.minDigitsHint')}
                  </ThemedText>
                </View>
              ) : query.length >= 10 ? (
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
