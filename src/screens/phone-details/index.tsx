import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Linking, Modal, RefreshControl, ScrollView, Share, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { LoadingState } from '@/components/ui/loading-state';
import { TAGS } from '@/constants/tags';
import { useTheme } from '@/hooks/use-theme';
import { usePhoneLookup } from '@/lib/hooks/usePhoneLookup';
import { useTags } from '@/lib/hooks/useTags';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { getSpamDetails, getSpamDetailsAr } from '@/lib/utils/spamScore';
import { styles } from './styles';

export default function PhoneDetailScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: phone, isLoading, refetch, isRefetching } = usePhoneLookup(number);
  const { language } = useSettingsStore();
  const { addTag, voteTag } = useTags(number || '');
  
  const [localPhone, setLocalPhone] = useState<any>(null);
  const [showTagModal, setShowTagModal] = useState(false);

  // Sync local state with server data
  useEffect(() => {
    if (phone) {
      setLocalPhone(phone);
    }
  }, [phone]);

  if (isLoading && !localPhone) return <LoadingState />;

  const displayData = localPhone || phone;
  const spam = language === 'ar' 
    ? getSpamDetailsAr(displayData?.spamScore || 0) 
    : getSpamDetails(displayData?.spamScore || 0);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this number on MeenDah: ${number} - ${displayData?.displayName || 'Unknown'}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleCall = async () => {
    if (!number) return;
    const url = `tel:${number}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), 'Direct calling not supported on this device');
      }
    } catch (error) {
      console.error('Error opening dialer:', error);
    }
  };

  const handleSms = async () => {
    if (!number) return;
    const url = `sms:${number}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('common.error'), 'SMS not supported on this device');
      }
    } catch (error) {
      console.error('Error opening SMS:', error);
    }
  };

  const handleAddTag = (tagId: number) => {
    const tagInfo = TAGS.find(t => t.id === tagId);
    
    // Optimistic Update
    const previousState = { ...localPhone };
    if (localPhone) {
      const newTag = {
        id: Math.random(), 
        text: tagInfo?.labelEn || 'Tagged',
        upvoteCount: 1,
        category: 0,
      };
      setLocalPhone({
        ...localPhone,
        topTags: [...localPhone.topTags, newTag]
      });
    }

    addTag(
      { category: tagId, text: tagInfo?.labelEn || 'Tagged' },
      {
        onError: (error: any) => {
          setLocalPhone(previousState);
          const errorMsg = error.response?.data?.message || t('common.error');
          Alert.alert(t('common.error'), errorMsg);
        }
      }
    );
    setShowTagModal(false);
  };

  const handleVote = (tagEntryId: number) => {
    // Optimistic Update
    const previousState = { ...localPhone };
    if (localPhone) {
      const updatedTags = localPhone.topTags.map((tag: any) => 
        tag.id === tagEntryId ? { ...tag, upvoteCount: tag.upvoteCount + 1 } : tag
      );
      setLocalPhone({ ...localPhone, topTags: updatedTags });
    }

    voteTag(
      { tagEntryId: tagEntryId.toString(), voteType: 1 },
      {
        onError: (error: any) => {
          setLocalPhone(previousState);
          const errorMsg = error.response?.data?.message || t('common.error');
          Alert.alert(t('common.error'), errorMsg);
        }
      }
    );
  };

  const onRefresh = () => {
    refetch();
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefetching} 
            onRefresh={onRefresh}
            tintColor={theme.text}
            colors={['#3c87f7']}
          />
        }
      >
        {/* Header Section */}
        <View style={[styles.header, { backgroundColor: '#3c87f7' }]}>
          <SafeAreaView edges={['top']} style={styles.safeHeader}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
                <Ionicons name="share-social-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfo}>
              <Avatar 
                name={displayData?.displayName || number || 'Unknown'} 
                url={displayData?.avatarUrl} 
                size={100} 
              />
              
              <ThemedText style={styles.nameText}>
                {displayData?.displayName || t('common.unknownCaller', 'Unknown Caller')}
              </ThemedText>
              <ThemedText style={styles.numberText}>
                {number}
              </ThemedText>

              {displayData?.email && (
                <View style={styles.emailRow}>
                  <Ionicons name="mail-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <ThemedText style={styles.emailText}>
                    {displayData.email}
                  </ThemedText>
                </View>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.mainAction} onPress={handleCall}>
                  <Ionicons name="call" size={20} color="#3c87f7" />
                  <ThemedText style={styles.mainActionText}>{t('phone.call')}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryAction} onPress={handleSms}>
                  <Ionicons name="chatbubble-outline" size={20} color="white" />
                  <ThemedText style={styles.secondaryActionText}>{t('phone.sms')}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          {/* Spam Score Card */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {t('phone.securityAnalysis')}
              </ThemedText>
              <Ionicons name="shield-checkmark" size={20} color={spam.color} />
            </View>
            
            <View style={styles.spamInfo}>
              <ThemedText style={[styles.spamPercent, { color: spam.color }]}>
                {displayData?.spamScore || 0}%
              </ThemedText>
              <View>
                <ThemedText style={[styles.spamLabel, { color: spam.color }]}>
                  {spam.label}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('phone.spamReports')}
                </ThemedText>
              </View>
            </View>
            
            <View style={[styles.progressBarBg, { backgroundColor: theme.backgroundSelected }]}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${displayData?.spamScore || 0}%`, backgroundColor: spam.color }
                ]} 
              />
            </View>
          </ThemedView>

          {/* Tags Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>{t('phone.communityTags')}</ThemedText>
              <TouchableOpacity 
                style={[styles.addTagButton, { backgroundColor: '#3c87f7' + '15' }]}
                onPress={() => setShowTagModal(true)}
              >
                <Ionicons name="add" size={20} color="#3c87f7" />
                <ThemedText style={styles.addTagText}>{t('phone.addTag')}</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.tagsList}>
              {displayData?.topTags && displayData.topTags.length > 0 ? (
                displayData.topTags.map((tagEntry: any) => {
                  const tagInfo = TAGS.find(t => 
                    t.key.toLowerCase() === tagEntry.text.toLowerCase() || 
                    t.labelEn.toLowerCase() === tagEntry.text.toLowerCase()
                  );
                  
                  return (
                    <ThemedView 
                      key={tagEntry.id}
                      type="backgroundElement"
                      style={styles.tagItem}
                    >
                      <View style={styles.tagItemLeft}>
                        <View style={[styles.tagIcon, { backgroundColor: (tagInfo?.color || '#6b7280') + '20' }]}>
                          <Ionicons name="pricetag" size={20} color={tagInfo?.color || '#6b7280'} />
                        </View>
                        <View>
                          <ThemedText type="default">
                            {language === 'ar' ? (tagInfo?.labelAr || tagEntry.text) : tagEntry.text}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {tagEntry.upvoteCount} {t('phone.votes')}
                          </ThemedText>
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={styles.voteButton}
                        onPress={() => handleVote(tagEntry.id)}
                      >
                        <Ionicons name="caret-up" size={24} color="#22c55e" />
                      </TouchableOpacity>
                    </ThemedView>
                  );
                })
              ) : (
                <ThemedView type="backgroundElement" style={styles.emptyTags}>
                  <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                    {t('phone.noTags')}
                  </ThemedText>
                </ThemedView>
              )}
            </View>
          </View>

          {/* Tag Selection Modal */}
          <Modal
            visible={showTagModal}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowTagModal(false)}
          >
            <View style={styles.modalOverlay}>
              <ThemedView type="backgroundElement" style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <ThemedText type="subtitle">{t('phone.selectTag')}</ThemedText>
                  <TouchableOpacity onPress={() => setShowTagModal(false)}>
                    <Ionicons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={TAGS}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.tagOption}
                      onPress={() => handleAddTag(item.id)}
                    >
                      <View style={[styles.tagIcon, { backgroundColor: item.color + '20' }]}>
                        <Ionicons name="pricetag" size={20} color={item.color} />
                      </View>
                      <ThemedText style={styles.tagOptionLabel}>
                        {language === 'ar' ? item.labelAr : item.labelEn}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={styles.modalList}
                />
              </ThemedView>
            </View>
          </Modal>

          {/* Action Buttons */}
          <View style={styles.footerActions}>
            <TouchableOpacity style={[styles.blockButton, { backgroundColor: '#ef4444' + '15', borderColor: '#ef4444' + '20' }]}>
              <Ionicons name="ban" size={20} color="#ef4444" />
              <ThemedText style={styles.blockButtonText}>{t('phone.blockReport')}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
