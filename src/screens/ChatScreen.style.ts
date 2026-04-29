import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F0D1F',
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1B3A',
    backgroundColor: '#0F0D1F',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7C6AF7',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E0DEFF',
    letterSpacing: 0.5,
  },
  resetButton: {
    backgroundColor: '#1E1B3A',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#2A2550',
  },
  resetButtonText: {
    fontSize: 12,
    color: '#9990D8',
    fontWeight: '600',
  },
  streamingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E1B3A',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  streamingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7C6AF7',
  },
  streamingLabel: {
    fontSize: 12,
    color: '#7C6AF7',
    fontWeight: '600',
  },

  // Service switcher
  serviceSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0F0D1F',
    borderBottomWidth: 1,
    borderBottomColor: '#1E1B3A',
  },
  serviceTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1A1830',
    borderWidth: 1,
    borderColor: '#2A2550',
  },
  serviceTabActive: {
    backgroundColor: '#7C6AF7',
    borderColor: '#7C6AF7',
  },
  serviceTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5A52A0',
  },
  serviceTabTextActive: {
    color: '#FFFFFF',
  },

  // Error banner
  errorBanner: {
    backgroundColor: '#3D0F1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FF4560',
  },
  errorText: {
    color: '#FF4560',
    fontSize: 13,
  },

  // Message list
  listContent: {
    flexGrow: 1,
    paddingTop: 8,
  },
  listFooter: {
    height: 12,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    color: '#7C6AF7',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E0DEFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#5A52A0',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#1E1B3A',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2A2550',
  },
  suggestionText: {
    color: '#9990D8',
    fontSize: 13,
  },

  // Scroll-to-bottom FAB
  scrollFab: {
    position: 'absolute',
    right: 16,
    bottom: 90,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C6AF7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C6AF7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  scrollFabIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
});
