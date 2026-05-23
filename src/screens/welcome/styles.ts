import { Spacing } from '@/constants/theme';
import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.one,
  },
  container: {
    flex: 1,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.five,
    justifyContent: 'space-between',
    // paddingVertical: Spacing.six,
  },
  branding: {
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  logoContainer: {
    padding: Spacing.five,
    borderRadius: 40,
    // marginBottom: Spacing.six,
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
  logo: {
    width: 80,
    height: 80,
  },
  appName: {
    textAlign: 'center',
    fontSize: 32,
  },
  indicator: {
    height: 6,
    width: 48,
    borderRadius: 3,
    marginTop: Spacing.two,
  },
  tagline: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: Spacing.four,
    lineHeight: 24,
    paddingHorizontal: Spacing.two,
  },
  actions: {
    marginBottom: Spacing.four,
  },
  features: {
    marginBottom: Spacing.five,
    gap: Spacing.three,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconWrapper: {
    padding: Spacing.two,
    borderRadius: 8,
  },
  signInButton: {
    height: 64,
    borderRadius: 20,
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
  googleIconContainer: {
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 8,
  },
  signInText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
