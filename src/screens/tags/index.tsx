import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import apiClient from '@/lib/api/client';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/lib/stores/authStore';
import { styles } from './styles';

type UserTag = {
  id: number;
  text: string;
  category: string;
  phoneE164: string;
  isHidden: boolean;
  createdAt: string;
};

export default function TagsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { accessToken, _hasHydrated } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [tags, setTags] = useState<UserTag[]>([]);

  const loadTags = async () => {
    if (!_hasHydrated || !accessToken) {
      setTags([]);
      return;
    }

    const { data } = await apiClient.get('/auth/me/tags');
    setTags(data || []);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadTags();
    } catch (error) {
      console.warn('Failed to refresh tags', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!_hasHydrated || !accessToken) {
      setTags([]);
      return;
    }

    void loadTags().catch((error) => console.warn('Failed to load tags', error));
  }, [_hasHydrated, accessToken]);

  const visibleTags = useMemo(() => tags.filter((tag) => !tag.isHidden), [tags]);
  const hiddenTags = useMemo(() => tags.filter((tag) => tag.isHidden), [tags]);

  const toggleTag = (tag: UserTag) => {
    const confirmTitle = tag.isHidden ? t('tags.confirmShowTitle') : t('tags.confirmHideTitle');
    const confirmMessage = tag.isHidden
      ? t('tags.confirmShowMessage', { text: tag.text })
      : t('tags.confirmHideMessage', { text: tag.text });

    Alert.alert(
      confirmTitle,
      confirmMessage,
      [
        { text: t('tags.cancel'), style: 'cancel' },
        {
          text: t('tags.ok'),
          onPress: async () => {
            try {
              await apiClient.patch(`/phones/${encodeURIComponent(tag.phoneE164)}/tags/${tag.id}/toggle`);
              setTags((prev) =>
                prev.map((item) => (item.id === tag.id ? { ...item, isHidden: !item.isHidden } : item))
              );
            } catch (error) {
              console.warn('Toggle tag failed', error);
              Alert.alert(t('common.error'), 'لا يمكنك تعديل هذا التاغ لأنه لم تقم بإنشائه');
            }
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="white" />
            <ThemedText style={styles.backButtonText}>{t('tags.back')}</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.title}>{t('tags.title')}</ThemedText>
          <ThemedText style={styles.subtitle}>{t('tags.subtitle')}</ThemedText>
        </View>

        <View style={styles.content}>
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <ThemedText style={styles.cardTitle}>{t('tags.visibleTitle')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{t('tags.count', { count: visibleTags.length })}</ThemedText>
              </View>
              <View style={styles.counterPill}>
                <ThemedText style={styles.counterText}>{visibleTags.length}</ThemedText>
              </View>
            </View>

            <View style={styles.tagsWrap}>
              {visibleTags.length > 0 ? (
                visibleTags.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    onLongPress={() => toggleTag(tag)}
                    style={styles.tagChip}
                  >
                    <ThemedText style={styles.tagText}>{tag.text}</ThemedText>
                  </TouchableOpacity>
                ))
              ) : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyState}>
                  {t('tags.visibleEmpty')}
                </ThemedText>
              )}
            </View>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <ThemedText style={styles.cardTitle}>{t('tags.hiddenTitle')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{t('tags.count', { count: hiddenTags.length })}</ThemedText>
              </View>
              <View style={styles.counterPillMuted}>
                <ThemedText style={styles.counterTextMuted}>{hiddenTags.length}</ThemedText>
              </View>
            </View>

            <View style={styles.tagsWrap}>
              {hiddenTags.length > 0 ? (
                hiddenTags.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    onLongPress={() => toggleTag(tag)}
                    style={[styles.tagChip, styles.hiddenTagChip]}
                  >
                    <ThemedText style={styles.tagText}>{tag.text}</ThemedText>
                  </TouchableOpacity>
                ))
              ) : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyState}>
                  {t('tags.hiddenEmpty')}
                </ThemedText>
              )}
            </View>
          </ThemedView>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
