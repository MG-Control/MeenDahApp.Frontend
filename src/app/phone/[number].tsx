import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, Share, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { LoadingState } from '@/components/ui/loading-state';
import { TAGS } from '@/constants/tags';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePhoneLookup } from '@/lib/hooks/usePhoneLookup';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { getSpamDetails, getSpamDetailsAr } from '@/lib/utils/spamScore';

export default function PhoneDetailScreen() {
  const { number } = useLocalSearchParams<{ number: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { data: phone, isLoading } = usePhoneLookup(number);
  const { language } = useSettingsStore();

  if (isLoading) return <LoadingState />;

  const spam = language === 'ar' ? getSpamDetailsAr(phone?.spamScore || 0) : getSpamDetails(phone?.spamScore || 0);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this number on MeenDah: ${number} - ${phone?.displayName || 'Unknown'}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
                name={phone?.displayName || number || 'Unknown'} 
                url={phone?.avatarUrl} 
                size={100} 
              />
              
              <ThemedText style={styles.nameText}>
                {phone?.displayName || t('common.unknownCaller', 'Unknown Caller')}
              </ThemedText>
              <ThemedText style={styles.numberText}>
                {number}
              </ThemedText>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.mainAction}>
                  <Ionicons name="call" size={20} color="#3c87f7" />
                  <ThemedText style={styles.mainActionText}>{t('phone.call')}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryAction}>
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
                {phone?.spamScore || 0}%
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
                  { width: `${phone?.spamScore || 0}%`, backgroundColor: spam.color }
                ]} 
              />
            </View>
          </ThemedView>

          {/* Tags Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>{t('phone.communityTags')}</ThemedText>
              <TouchableOpacity style={[styles.addTagButton, { backgroundColor: '#3c87f7' + '15' }]}>
                <Ionicons name="add" size={20} color="#3c87f7" />
                <ThemedText style={styles.addTagText}>{t('phone.addTag')}</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.tagsList}>
              {phone?.tags && phone.tags.length > 0 ? (
                phone.tags.map((tagEntry: any) => {
                  const tagInfo = TAGS.find(t => t.id === tagEntry.tagId);
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
                            {language === 'ar' ? tagInfo?.labelAr : tagInfo?.labelEn}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {tagEntry.votes} {t('phone.votes')}
                          </ThemedText>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.voteButton}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: Spacing.six,
  },
  header: {
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingBottom: Spacing.six,
  },
  safeHeader: {
    paddingHorizontal: Spacing.four,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  iconButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  nameText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: Spacing.four,
    textAlign: 'center',
  },
  numberText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginTop: Spacing.six,
  },
  mainAction: {
    backgroundColor: 'white',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainActionText: {
    color: '#3c87f7',
    fontWeight: 'bold',
    fontSize: 18,
  },
  secondaryAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryActionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  content: {
    paddingHorizontal: Spacing.four,
    marginTop: -24,
  },
  card: {
    padding: Spacing.four,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  spamInfo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  spamPercent: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  spamLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    marginTop: Spacing.four,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  section: {
    marginTop: Spacing.six,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 20,
  },
  addTagButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addTagText: {
    color: '#3c87f7',
    fontWeight: 'bold',
  },
  tagsList: {
    gap: Spacing.three,
  },
  tagItem: {
    padding: Spacing.four,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tagIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 8,
    borderRadius: 12,
  },
  emptyTags: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  footerActions: {
    marginTop: Spacing.six,
    marginBottom: 40,
  },
  blockButton: {
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  blockButtonText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
