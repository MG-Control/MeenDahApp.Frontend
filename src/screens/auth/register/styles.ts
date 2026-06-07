import { Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const registerStyles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  appName: {
    textAlign: 'center',
    fontSize: 30,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
