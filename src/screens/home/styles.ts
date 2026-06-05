import { Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.four,
  },
  container: {
    gap: Spacing.four,
  },
  welcomeText: {
    fontSize: 18,
    opacity: 0.8,
  },
  card: {
    padding: Spacing.four,
    borderRadius: 20,
    marginTop: Spacing.two,
  },
  syncCard: {
    flexDirection: 'row',
    gap: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(60, 135, 247, 0.2)',
  },
  syncIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(60, 135, 247, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncContent: {
    flex: 1,
    gap: Spacing.two,
  },
  syncDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: Spacing.two,
  },
  syncButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
