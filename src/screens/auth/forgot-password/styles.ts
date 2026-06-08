import { Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const forgotStyles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  appName: {
    textAlign: 'center',
    fontSize: 30,
  },
  stateIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  stateTitle: {
    textAlign: 'center',
    fontSize: 22,
    marginBottom: Spacing.two,
  },
  stateDesc: {
    textAlign: 'center',
    lineHeight: 22,
  },
  facebookButton: {
    minHeight: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: '#1877F2',
  },
  facebookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
