import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  I18nManager,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { LoadingState } from '@/components/ui/loading-state';
import { TAGS, getTagById } from '@/constants/tags';
import { useTheme } from '@/hooks/use-theme';
import { PhoneDetails, usePhoneLookup } from '@/lib/hooks/usePhoneLookup';
import { useTags } from '@/lib/hooks/useTags';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { formatRelativeTime } from '@/lib/utils/formatRelativeTime';
import { decodePhoneFromRoute } from '@/lib/utils/phoneRoute';
import { getSpamDetails, getSpamDetailsAr } from '@/lib/utils/spamScore';
import { styles } from './styles';

const BRAND_COLOR = '#3c87f7';

function isValidTagId(id: number): boolean {
  return Number.isInteger(id) && id > 0;
}

function tagAlreadyExists(
  topTags: PhoneDetails['topTags'] | undefined,
  tagId: number
): boolean {
  if (!topTags?.length) return false;
  const tagInfo = getTagById(tagId);
  return topTags.some(
    (entry) =>
      entry.category === tagId ||
      (tagInfo &&
        entry.text.toLowerCase() === tagInfo.labelEn.toLowerCase())
  );
}

export default function PhoneDetailScreen() {
  const params = useLocalSearchParams<{ number: string }>();
  const phoneNumber = decodePhoneFromRoute(params.number);
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const { language } = useSettingsStore();

  const {
    data: phone,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = usePhoneLookup(phoneNumber);
  const { addTagAsync, isAddingTag, voteTag, isVoting } = useTags(phoneNumber || '');

  const [localPhone, setLocalPhone] = useState<PhoneDetails | null>(null);
  const [showTagModal, setShowTagModal] = useState(false);
  const [votingTagId, setVotingTagId] = useState<number | null>(null);

  useEffect(() => {
    if (phone) {
      setLocalPhone(phone);
    }
  }, [phone]);

  const displayData = localPhone || phone;
  const spam =
    language === 'ar'
      ? getSpamDetailsAr(displayData?.spamScore || 0)
      : getSpamDetails(displayData?.spamScore || 0);

  const availableTags = useMemo(() => {
    if (!displayData?.topTags) return TAGS;
    return TAGS.filter((tag) => !tagAlreadyExists(displayData.topTags, tag.id));
  }, [displayData?.topTags]);

  const backIcon = I18nManager.isRTL ? 'arrow-forward' : 'arrow-back';

  const handleShare = async () => {
    if (!phoneNumber) return;
    try {
      await Share.share({
        message: t('phone.shareMessage', {
          number: phoneNumber,
          name: displayData?.displayName || t('common.unknownCaller'),
        }),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleCall = async () => {
    if (!phoneNumber) return;
    const url = `tel:${phoneNumber}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('phone.callNotSupported'));
      }
    } catch (error) {
      console.error('Error opening dialer:', error);
    }
  };

  const handleSms = async () => {
    if (!phoneNumber) return;
    const url = `sms:${phoneNumber}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('phone.smsNotSupported'));
      }
    } catch (error) {
      console.error('Error opening SMS:', error);
    }
  };

  const handleAddTag = async (tagId: number) => {
    const tagInfo = getTagById(tagId);
    if (!tagInfo || !phoneNumber) return;

    try {
      await addTagAsync({
        category: tagId,
        text: tagInfo.labelEn,
      });
      setShowTagModal(false);
      await refetch();
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
      const message =
        axiosError.response?.status === 409
          ? t('phone.duplicateTag')
          : axiosError.response?.data?.message || t('common.error');
      Alert.alert(t('common.error'), message);
    }
  };

  const handleVote = (tagEntryId: number) => {
    if (!isValidTagId(tagEntryId) || isVoting) return;

    const previousState = localPhone ? { ...localPhone, topTags: [...localPhone.topTags] } : null;
    if (localPhone) {
      const updatedTags = localPhone.topTags.map((tag) =>
        tag.id === tagEntryId ? { ...tag, upvoteCount: tag.upvoteCount + 1 } : tag
      );
      setLocalPhone({ ...localPhone, topTags: updatedTags });
    }

    setVotingTagId(tagEntryId);
    voteTag(
      { tagEntryId, voteType: 1 },
      {
        onSuccess: () => {
          refetch();
        },
        onError: (error: unknown) => {
          if (previousState) setLocalPhone(previousState);
          const axiosError = error as { response?: { data?: { message?: string } } };
          const serverMessage = axiosError.response?.data?.message;
          const message =
            serverMessage?.toLowerCase().includes('own tag')
              ? t('phone.cannotVoteOwnTag')
              : serverMessage || t('common.error');
          Alert.alert(t('common.error'), message);
        },
        onSettled: () => {
          setVotingTagId(null);
        },
      }
    );
  };

  const formatVoteCount = (count: number) => {
    const key = count === 1 ? 'phone.vote' : 'phone.votes_plural';
    return `${count} ${t(key)}`;
  };

  const resolveTagLabel = (tagEntry: PhoneDetails['topTags'][number]) => {
    const tagInfo =
      getTagById(tagEntry.category) ||
      TAGS.find(
        (tag) =>
          tag.key.toLowerCase() === tagEntry.text.toLowerCase() ||
          tag.labelEn.toLowerCase() === tagEntry.text.toLowerCase()
      );
    return language === 'ar' ? tagInfo?.labelAr || tagEntry.text : tagInfo?.labelEn || tagEntry.text;
  };

  const resolveTagColor = (tagEntry: PhoneDetails['topTags'][number]) => {
    const tagInfo = getTagById(tagEntry.category);
    return tagInfo?.color || '#6b7280';
  };

  if (!phoneNumber) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText themeColor="textSecondary">{t('phone.loadError')}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <ThemedText style={styles.retryButtonText}>{t('common.cancel')}</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  if (isLoading && !displayData) {
    return <LoadingState />;
  }

  if (isError && !displayData) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.textSecondary} />
          <ThemedText style={styles.errorTitle}>{t('phone.loadError')}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <ThemedText style={styles.retryButtonText}>{t('phone.retry')}</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={theme.text}
            colors={[BRAND_COLOR]}
          />
        }
      >
        <View style={[styles.header, { backgroundColor: BRAND_COLOR }]}>
          <SafeAreaView edges={['top']} style={styles.safeHeader}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                <Ionicons name={backIcon} size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
                <Ionicons name="share-social-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.avatarRing}>
                <Avatar
                  name={displayData?.displayName || phoneNumber}
                  url={displayData?.avatarUrl}
                  size={96}
                />
              </View>

              <ThemedText style={styles.nameText}>
                {displayData?.displayName || t('common.unknownCaller')}
              </ThemedText>
              <ThemedText style={styles.numberText}>{phoneNumber}</ThemedText>

              {displayData?.email ? (
                <View style={styles.emailRow}>
                  <Ionicons name="mail-outline" size={14} color="rgba(255,255,255,0.85)" />
                  <ThemedText style={styles.emailText}>{displayData.email}</ThemedText>
                </View>
              ) : null}

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.mainAction} onPress={handleCall} activeOpacity={0.85}>
                  <Ionicons name="call" size={20} color={BRAND_COLOR} />
                  <ThemedText style={styles.mainActionText}>{t('phone.call')}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={handleSms}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="white" />
                  <ThemedText style={styles.secondaryActionText}>{t('phone.sms')}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          {(displayData?.totalSearches !== undefined || displayData?.lastActivityAt) && (
            <View style={styles.statsRow}>
              <ThemedView
                type="backgroundElement"
                style={[styles.statCard, { borderColor: theme.backgroundSelected }]}
              >
                <Ionicons name="search-outline" size={20} color={BRAND_COLOR} />
                <ThemedText type="small" themeColor="textSecondary">
                  {t('phone.totalSearches')}
                </ThemedText>
                <ThemedText type="smallBold">{displayData?.totalSearches ?? 0}</ThemedText>
              </ThemedView>
              {displayData?.lastActivityAt ? (
                <ThemedView
                  type="backgroundElement"
                  style={[styles.statCard, { borderColor: theme.backgroundSelected }]}
                >
                  <Ionicons name="time-outline" size={20} color={BRAND_COLOR} />
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('phone.lastActivity')}
                  </ThemedText>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {formatRelativeTime(displayData.lastActivityAt, language)}
                  </ThemedText>
                </ThemedView>
              ) : null}
            </View>
          )}

          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.backgroundSelected }]}
          >
            <View style={styles.cardHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('phone.securityAnalysis')}
              </ThemedText>
              <View style={[styles.spamBadge, { backgroundColor: spam.color + '18' }]}>
                <Ionicons name="shield-checkmark" size={18} color={spam.color} />
                <ThemedText style={[styles.spamBadgeText, { color: spam.color }]}>
                  {spam.label}
                </ThemedText>
              </View>
            </View>

            <View style={styles.spamInfo}>
              <ThemedText style={[styles.spamPercent, { color: spam.color }]}>
                {displayData?.spamScore ?? 0}%
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('phone.spamReports')}
              </ThemedText>
            </View>

            <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundSelected }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(displayData?.spamScore ?? 0, 100)}%`,
                    backgroundColor: spam.color,
                  },
                ]}
              />
            </View>
          </ThemedView>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                {t('phone.communityTags')}
              </ThemedText>
              <TouchableOpacity
                style={[styles.addTagButton, { backgroundColor: BRAND_COLOR + '15' }]}
                onPress={() => setShowTagModal(true)}
                disabled={availableTags.length === 0}
              >
                <Ionicons name="add" size={20} color={BRAND_COLOR} />
                <ThemedText style={styles.addTagText}>{t('phone.addTag')}</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.tagsList}>
              {displayData?.topTags && displayData.topTags.length > 0 ? (
                displayData.topTags.map((tagEntry) => {
                  const tagColor = resolveTagColor(tagEntry);
                  const isVotingThis = votingTagId === tagEntry.id;
                  const canVote = isValidTagId(tagEntry.id);

                  return (
                    <ThemedView
                      key={tagEntry.id}
                      type="backgroundElement"
                      style={[styles.tagItem, { borderColor: theme.backgroundSelected }]}
                    >
                      <View style={styles.tagItemLeft}>
                        <View style={[styles.tagIcon, { backgroundColor: tagColor + '20' }]}>
                          <Ionicons name="pricetag" size={20} color={tagColor} />
                        </View>
                        <View style={styles.tagTextBlock}>
                          <ThemedText type="default">{resolveTagLabel(tagEntry)}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {formatVoteCount(tagEntry.upvoteCount)}
                          </ThemedText>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.voteButton,
                          !canVote && styles.voteButtonDisabled,
                          isVotingThis && styles.voteButtonActive,
                        ]}
                        onPress={() => handleVote(tagEntry.id)}
                        disabled={!canVote || isVotingThis}
                        activeOpacity={0.7}
                      >
                        {isVotingThis ? (
                          <ActivityIndicator size="small" color="#22c55e" />
                        ) : (
                          <Ionicons
                            name="caret-up"
                            size={24}
                            color={canVote ? '#22c55e' : theme.textSecondary}
                          />
                        )}
                      </TouchableOpacity>
                    </ThemedView>
                  );
                })
              ) : (
                <ThemedView
                  type="backgroundElement"
                  style={[styles.emptyTags, { borderColor: theme.backgroundSelected }]}
                >
                  <Ionicons name="pricetags-outline" size={32} color={theme.textSecondary} />
                  <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                    {t('phone.noTags')}
                  </ThemedText>
                </ThemedView>
              )}
            </View>
          </View>

          <View style={styles.footerActions}>
            <TouchableOpacity
              style={[styles.blockButton, { backgroundColor: '#ef444415', borderColor: '#ef444433' }]}
              activeOpacity={1}
            >
              <Ionicons name="ban" size={20} color="#ef4444" />
              <ThemedText style={styles.blockButtonText}>{t('phone.blockReport')}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showTagModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTagModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView
            type="backgroundElement"
            style={[styles.modalContent, { borderColor: theme.backgroundSelected }]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">{t('phone.selectTag')}</ThemedText>
              <TouchableOpacity onPress={() => setShowTagModal(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {availableTags.length === 0 ? (
              <View style={styles.modalEmpty}>
                <ThemedText themeColor="textSecondary">{t('phone.allTagsAdded')}</ThemedText>
              </View>
            ) : (
              <FlatList
                data={availableTags}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.tagOption, { borderBottomColor: theme.backgroundSelected }]}
                    onPress={() => handleAddTag(item.id)}
                    disabled={isAddingTag}
                  >
                    <View style={[styles.tagIcon, { backgroundColor: item.color + '20' }]}>
                      <Ionicons name="pricetag" size={20} color={item.color} />
                    </View>
                    <ThemedText style={styles.tagOptionLabel}>
                      {language === 'ar' ? item.labelAr : item.labelEn}
                    </ThemedText>
                    {isAddingTag ? (
                      <ActivityIndicator size="small" color={BRAND_COLOR} />
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.modalList}
              />
            )}
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}
