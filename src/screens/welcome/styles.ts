import { Spacing } from '@/constants/theme';
import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.six,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.one,
  },
  container: {
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.five,
    gap: Spacing.five,
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
    gap: Spacing.four,
  },
  modeSwitcher: {
    borderRadius: 18,
    padding: Spacing.one,
    flexDirection: 'row',
    gap: Spacing.one,
  },
  modeButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  formCard: {
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  inputGroup: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  features: {
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
  secondaryButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: '#0f766e',
    backgroundColor: 'rgba(15, 118, 110, 0.08)',
  },
  secondaryButtonText: {
    color: '#0f766e',
    fontSize: 16,
    fontWeight: '700',
  },
  iconContainer: {
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 8,
  },
  signInText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helperText: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
