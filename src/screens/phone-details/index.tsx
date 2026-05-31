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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { LoadingState } from '@/components/ui/loading-state';
import { TAGS, UNKNOWN_TAG_ID, getTagById, getTagSuggestions } from '@/constants/tags';
import { useTheme } from '@/hooks/use-theme';
import { PhoneDetails, usePhoneLookup } from '@/lib/hooks/usePhoneLookup';
import { useTags } from '@/lib/hooks/useTags';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { formatRelativeTime } from '@/lib/utils/formatRelativeTime';
import { decodePhoneFromRoute } from '@/lib/utils/phoneRoute';
import { getSpamDetails, getSpamDetailsAr } from '@/lib/utils/spamScore';
import { styles } from './styles';

const BRAND_COLOR = '#3c87f7';

function tagAlreadyExists(
  tags: PhoneDetails['tags'] | undefined,
  tagId: number
): boolean {
  if (!tags?.length) return false;
  const tagInfo = getTagById(tagId);
  return tags.some(
    (entry) =>
      entry.category === tagId ||
      (tagInfo &&
        entry.text.toLowerCase() === tagInfo.labelEn.toLowerCase())
  );
}

export default function PhoneDetailScreen() {
  const params = useLocalSearchParams<{ number: string; skipLookup?: string }>();
  const phoneNumber = decodePhoneFromRoute(params.number);
  const shouldSkipInitialLookup = params.skipLookup === '1';
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
  } = usePhoneLookup(phoneNumber, { skipInitialFetch: shouldSkipInitialLookup });
  const { addTagAsync, isAddingTag } = useTags(phoneNumber || '');

  const [localPhone, setLocalPhone] = useState<PhoneDetails | null>(null);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagInput, setTagInput] = useState('');

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

  const suggestedTags = useMemo(() => {
    const query = tagInput.trim();
    const filteredTags = getTagSuggestions(query);
    if (!displayData?.tags) return filteredTags;
    return filteredTags.filter((tag) => !tagAlreadyExists(displayData.tags, tag.id));
  }, [displayData?.tags, tagInput]);

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

  const openTagModal = () => {
    setTagInput('');
    setShowTagModal(true);
  };

  const closeTagModal = () => {
    setShowTagModal(false);
    setTagInput('');
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

  const handleOpenLink = async (url?: string | null) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), t('phone.linkNotSupported'));
      }
    } catch (error) {
      console.error('Error opening external link:', error);
    }
  };

  const submitTag = async (category: number, text: string) => {
    if (!phoneNumber) return;

    try {
      await addTagAsync({
        category,
        text,
      });
      closeTagModal();
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

  const handleAddSuggestedTag = async (tagId: number) => {
    const tagInfo = getTagById(tagId);
    if (!tagInfo) return;
    await submitTag(tagInfo.id, tagInfo.labelEn);
  };

  const handleAddTypedTag = async () => {
    const trimmedText = tagInput.trim();
    if (!trimmedText) return;

    const normalizedInput = trimmedText.toLowerCase();
    const matchingTag = TAGS.find(
      (tag) =>
        tag.key.toLowerCase() === normalizedInput ||
        tag.labelEn.toLowerCase() === normalizedInput ||
        tag.labelAr === trimmedText
    );

    await submitTag(matchingTag?.id ?? UNKNOWN_TAG_ID, matchingTag?.labelEn ?? trimmedText);
  };

  const resolveTagLabel = (tagEntry: PhoneDetails['tags'][number]) => {
    const tagInfo =
      getTagById(tagEntry.category) ||
      TAGS.find(
        (tag) =>
          tag.key.toLowerCase() === tagEntry.text.toLowerCase() ||
          tag.labelEn.toLowerCase() === tagEntry.text.toLowerCase()
      );
    if (tagInfo?.id === UNKNOWN_TAG_ID && tagEntry.text) {
      return tagEntry.text;
    }
    return language === 'ar' ? tagInfo?.labelAr || tagEntry.text : tagInfo?.labelEn || tagEntry.text;
  };

  const resolveTagColor = (tagEntry: PhoneDetails['tags'][number]) => {
    const tagInfo = getTagById(tagEntry.category);
    return tagInfo?.color || '#6b7280';
  };

  const profileSections = [
    {
      title: t('phone.personalInfo'),
      items: [
        { label: t('phone.gender'), value: displayData?.gender },
        { label: t('phone.birthdate'), value: displayData?.birthdate },
        { label: t('phone.joined'), value: displayData?.joined },
      ],
    },
    {
      title: t('phone.locationInfo'),
      items: [
        { label: t('phone.country'), value: displayData?.country },
        { label: t('phone.residence'), value: displayData?.residence },
        { label: t('phone.birthplace'), value: displayData?.birthplace },
      ],
    },
    {
      title: t('phone.workInfo'),
      items: [
        { label: t('phone.relationship'), value: displayData?.relationship },
        { label: t('phone.workplace'), value: displayData?.workplace },
      ],
    },
  ]
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => Boolean(item.value)),
    }))
    .filter((section) => section.items.length > 0);

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

              {(displayData?.facebookUrl || displayData?.whatsappUrl || displayData?.telegramUrl) && (
                <View style={styles.socialActionRow}>
                  {displayData?.facebookUrl ? (
                    <TouchableOpacity
                      style={[styles.socialActionButton, { backgroundColor: '#1877f2' }]}
                      onPress={() => handleOpenLink(displayData.facebookUrl)}
                    >
                      <Ionicons name="logo-facebook" size={18} color="white" />
                      <ThemedText style={styles.socialActionText}>{t('phone.facebook')}</ThemedText>
                    </TouchableOpacity>
                  ) : null}

                  {displayData?.whatsappUrl ? (
                    <TouchableOpacity
                      style={[styles.socialActionButton, { backgroundColor: '#25d366' }]}
                      onPress={() => handleOpenLink(displayData.whatsappUrl)}
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="white" />
                      <ThemedText style={styles.socialActionText}>{t('phone.whatsapp')}</ThemedText>
                    </TouchableOpacity>
                  ) : null}

                  {displayData?.telegramUrl ? (
                    <TouchableOpacity
                      style={[styles.socialActionButton, { backgroundColor: '#229ed9' }]}
                      onPress={() => handleOpenLink(displayData.telegramUrl)}
                    >
                      <Ionicons name="paper-plane" size={18} color="white" />
                      <ThemedText style={styles.socialActionText}>{t('phone.telegram')}</ThemedText>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
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
                onPress={openTagModal}
              >
                <Ionicons name="add" size={20} color={BRAND_COLOR} />
                <ThemedText style={styles.addTagText}>{t('phone.addTag')}</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.tagsList}>
              {displayData?.tags && displayData.tags.length > 0 ? (
                displayData.tags.map((tagEntry) => {
                  const tagColor = resolveTagColor(tagEntry);

                  return (
                    <ThemedView
                      key={tagEntry.id}
                      type="backgroundElement"
                      style={[styles.tagItem, { borderColor: theme.backgroundSelected }]}
                    >
                      <View style={styles.tagItemLeft}>
                        <View
                          style={[
                            styles.tagIcon,
                            {
                              backgroundColor: theme.background,
                              borderColor: tagColor + '35',
                            },
                          ]}
                        >
                          <Ionicons name="pricetag" size={16} color={tagColor} />
                        </View>
                        <View style={styles.tagTextBlock}>
                          <ThemedText type="small" style={styles.tagText}>
                            {resolveTagLabel(tagEntry)}
                          </ThemedText>
                        </View>
                      </View>
                    </ThemedView>
                  );
                })
              ) : (
                <ThemedView
                  type="backgroundElement"
                  style={[styles.emptyTags, { borderColor: theme.backgroundSelected }]}
                >
                  <View style={[styles.emptyTagsIcon, { backgroundColor: BRAND_COLOR + '18' }]}>
                    <Ionicons name="pricetags" size={28} color={BRAND_COLOR} />
                  </View>
                  <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                    {t('phone.noTags')}
                  </ThemedText>
                </ThemedView>
              )}
            </View>
          </View>

          {profileSections.length > 0 ? (
            <View style={styles.profileSections}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.profileSectionsTitle}>
                {t('phone.profileDetails')}
              </ThemedText>

              {profileSections.map((section) => (
                <ThemedView
                  key={section.title}
                  type="backgroundElement"
                  style={[styles.profileSectionCard, { borderColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="smallBold" style={styles.profileSectionTitle} themeColor="textSecondary">
                    {section.title}
                  </ThemedText>

                  <View style={styles.profileGrid}>
                    {section.items.map((row) => (
                      <View
                        key={row.label}
                        style={[styles.profileItem, { borderColor: theme.backgroundSelected }]}
                      >
                        <ThemedText type="small" themeColor="textSecondary">
                          {row.label}
                        </ThemedText>
                        <ThemedText type="default" style={styles.profileValue} numberOfLines={2}>
                          {row.value}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </ThemedView>
              ))}
            </View>
          ) : null}

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
        onRequestClose={closeTagModal}
      >
        <View style={styles.modalOverlay}>
          <ThemedView
            type="backgroundElement"
            style={[styles.modalContent, { borderColor: theme.backgroundSelected }]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">{t('phone.selectTag')}</ThemedText>
              <TouchableOpacity onPress={closeTagModal} hitSlop={12}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.tagInputSection}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('phone.selectTag')}
              </ThemedText>
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                placeholder={t('phone.addTag')}
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.tagInput,
                  {
                    borderColor: theme.backgroundSelected,
                    color: theme.text,
                    backgroundColor: theme.background,
                  },
                ]}
                returnKeyType="done"
                onSubmitEditing={handleAddTypedTag}
                autoCorrect={false}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[
                  styles.tagSubmitButton,
                  { backgroundColor: BRAND_COLOR },
                  (!tagInput.trim() || isAddingTag) && styles.tagSubmitButtonDisabled,
                ]}
                onPress={handleAddTypedTag}
                disabled={!tagInput.trim() || isAddingTag}
              >
                {isAddingTag ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <ThemedText style={styles.tagSubmitButtonText}>{t('common.add')}</ThemedText>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.suggestionsHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('phone.communityTags')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('phone.selectTag')}
              </ThemedText>
            </View>

            {suggestedTags.length === 0 ? (
              <View style={styles.modalEmpty}>
                <ThemedText themeColor="textSecondary">{t('phone.allTagsAdded')}</ThemedText>
              </View>
            ) : (
              <FlatList
                data={suggestedTags}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.tagOption, { borderBottomColor: theme.backgroundSelected }]}
                    onPress={() => handleAddSuggestedTag(item.id)}
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
                keyboardShouldPersistTaps="handled"
              />
            )}
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}
