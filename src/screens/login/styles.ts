import { Spacing } from '@/constants/theme';
import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropGlowTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: 'rgba(60, 135, 247, 0.10)',
  },
  backdropGlowBottom: {
    position: 'absolute',
    bottom: -120,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 118, 110, 0.08)',
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
    marginTop: Spacing.two,
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
    width: 48,
    height: 48,
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
    fontSize: 16
  },
  actions: {
    marginBottom: Spacing.four,
    gap: Spacing.four,
  },
  formCard: {
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(60, 135, 247, 0.08)',
  },
  formHeader: {
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  formTitle: {
    fontSize: 22,
    textAlign: 'center',
  },
  formSubtitle: {
    textAlign: 'center',
    lineHeight: 20,
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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  countryCodeContainer: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
  },
  iconWrapper: {
    flexShrink: 0,
    padding: Spacing.two,
    borderRadius: 8,
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
  secondaryButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(60, 135, 247, 0.35)',
    backgroundColor: 'rgba(60, 135, 247, 0.08)',
  },
  secondaryButtonText: {
    color: '#3c87f7',
    fontSize: 16,
    fontWeight: '700',
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 6,
    borderRadius: 8,
  },
  signInText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  helperText: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
