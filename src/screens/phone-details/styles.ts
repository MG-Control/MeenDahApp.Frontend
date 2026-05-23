import { Spacing } from '@/constants/theme';
import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  emailText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: Spacing.six,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  modalList: {
    paddingBottom: Spacing.six,
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: 16,
  },
  tagOptionLabel: {
    fontSize: 18,
    fontWeight: '500',
  },
});
