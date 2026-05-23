import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { LoadingState } from '@/components/ui/loading-state';
import { useTheme } from '@/hooks/use-theme';
import apiClient from '@/lib/api/client';

export default function SearchScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/phones/search?q=${text}`);
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
        router.push(`/phone/${item.e164}` as any);
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
            ListEmptyComponent={
              query.length >= 3 ? (
                <View style={styles.emptyContainer}>
                  <ThemedText themeColor="textSecondary">
                    No results found for "{query}"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  appName: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
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
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 18,
    color: '#0f172a',
    height: '100%',
  },
  resultsList: {
    padding: 24,
    paddingBottom: 100,
  },
  resultCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 16,
  },
  resultName: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  arrowIcon: {
    padding: 8,
    borderRadius: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
});
