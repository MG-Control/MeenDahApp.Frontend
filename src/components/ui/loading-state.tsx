import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet } from 'react-native';

interface Props {
  message?: string;
}

export const LoadingState: React.FC<Props> = ({ message }) => {
  const { t } = useTranslation();

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" color="#3c87f7" />
      <ThemedText style={styles.text} themeColor="textSecondary">
        {message || t('common.loading')}
      </ThemedText>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    marginTop: 16,
    fontWeight: '500',
  },
});
