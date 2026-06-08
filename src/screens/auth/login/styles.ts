import { Spacing } from '@/constants/theme';
import { Platform, StyleSheet } from 'react-native';

export const loginStyles = StyleSheet.create({
  branding: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  appName: {
    textAlign: 'center',
    fontSize: 32,
  },
  indicator: {
    height: 6,
    width: 48,
    borderRadius: 3,
    marginTop: Spacing.one,
    marginBottom: Spacing.two,
  },
  features: {
    width: '100%',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  featureRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  featuresText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
  },
  signInButton: {
    minHeight: 60,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    ...Platform.select({
      ios: {
        shadowColor: '#3c87f7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  signInText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
