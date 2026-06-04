import { Spacing } from '@/constants/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    backgroundColor: '#3c87f7',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    marginBottom: Spacing.four,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    marginTop: Spacing.two,
    lineHeight: 20,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  card: {
    padding: Spacing.four,
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  counterPill: {
    minWidth: 38,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(60, 135, 247, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    color: '#3c87f7',
    fontWeight: '800',
  },
  counterPillMuted: {
    minWidth: 38,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterTextMuted: {
    color: '#666',
    fontWeight: '800',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tagChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    backgroundColor: 'rgba(60, 135, 247, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(60, 135, 247, 0.18)',
  },
  hiddenTagChip: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderColor: 'rgba(0,0,0,0.08)',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    width: '100%',
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
});
