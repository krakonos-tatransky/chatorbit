import { StyleSheet, Platform } from 'react-native';
import { COLORS } from './colors';
import { SPACING } from './layout';

export const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: SPACING.CONTAINER_TOP,
    paddingHorizontal: SPACING.CONTAINER_HORIZONTAL
  },
  containerInSession: {
    paddingTop: SPACING.IN_SESSION_TOP,
    paddingHorizontal: SPACING.IN_SESSION_HORIZONTAL
  },
  termsCard: {
    borderRadius: SPACING.CARD_RADIUS,
    padding: SPACING.CARD_PADDING,
    paddingTop: SPACING.CARD_PADDING_TOP_LARGE,
    width: '100%',
    maxWidth: 420,
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 12
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.ice,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 1.2
  },
  termsScroll: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 83, 170, 0.2)'
  },
  termsContent: {
    padding: 16
  },
  termsText: {
    color: 'rgba(232, 244, 255, 0.92)',
    fontSize: 16,
    lineHeight: 24
  },
  acceptButton: {
    marginTop: SPACING.CONTENT_GAP,
    backgroundColor: COLORS.aurora,
    borderRadius: SPACING.BUTTON_RADIUS,
    paddingVertical: SPACING.BUTTON_PADDING,
    alignItems: 'center'
  },
  acceptButtonDisabled: {
    backgroundColor: 'rgba(111, 231, 255, 0.3)'
  },
  acceptButtonLabel: {
    color: COLORS.midnight,
    fontSize: 16,
    fontWeight: '600'
  },
  header: {
    width: '100%',
    maxWidth: 480,
    marginBottom: 24
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8
  },
  headerSubtitle: {
    color: 'rgba(244, 249, 255, 0.78)',
    fontSize: 16,
    lineHeight: 22
  },
  actionRow: {
    width: '100%',
    maxWidth: 520,
    gap: SPACING.SECTION_GAP
  },
  bigActionButton: {
    borderRadius: SPACING.ACTION_RADIUS,
    padding: SPACING.CONTENT_GAP,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    elevation: 8
  },
  bigActionIcon: {
    width: SPACING.LARGE_ICON,
    height: SPACING.LARGE_ICON,
    borderRadius: SPACING.LARGE_ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79, 183, 255, 0.16)'
  },
  bigActionTextContainer: {
    flex: 1,
    marginLeft: SPACING.SECTION_GAP
  },
  bigActionTitle: {
    color: COLORS.ice,
    fontSize: 22,
    fontWeight: '700'
  },
  bigActionDescription: {
    color: 'rgba(219, 237, 255, 0.76)',
    fontSize: 14,
    marginTop: 6
  },
  disabledClose: {
    opacity: 0.4
  },
  formContainer: {
    flex: 1,
    justifyContent: 'flex-start'
  },
  formSafeArea: {
    flex: 1,
    paddingHorizontal: 20
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 16
  },
  formTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '700'
  },
  formCloseButton: {
    padding: 4
  },
  formContent: {
    paddingBottom: 32
  },
  formSubtitle: {
    color: 'rgba(224, 239, 255, 0.82)',
    marginBottom: 16,
    lineHeight: 20
  },
  pickerGroup: {
    marginBottom: 24
  },
  pickerLabel: {
    color: COLORS.ice,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12
  },
  pickerWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(9, 64, 140, 0.42)',
    height: 132
  },
  picker: {
    color: COLORS.aurora,
    width: '100%',
    height: '100%'
  },
  pickerItem: {
    color: COLORS.aurora,
    fontSize: 16,
    height: 132
  },
  termsHint: {
    color: 'rgba(224, 239, 255, 0.82)',
    lineHeight: 18,
    marginBottom: 12
  },
  formActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8
  },
  secondaryButton: {
    flex: 1,
    borderRadius: SPACING.BUTTON_RADIUS,
    paddingVertical: SPACING.BUTTON_PADDING,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    backgroundColor: 'transparent'
  },
  secondaryButtonLabel: {
    color: COLORS.ice,
    fontSize: 16,
    fontWeight: '700'
  },
  primaryButton: {
    flex: 1,
    borderRadius: SPACING.BUTTON_RADIUS,
    paddingVertical: SPACING.BUTTON_PADDING,
    alignItems: 'center',
    backgroundColor: COLORS.aurora
  },
  primaryButtonLabel: {
    color: COLORS.midnight,
    fontSize: 16,
    fontWeight: '700'
  },
  generateButton: {
    marginTop: 16,
    backgroundColor: COLORS.lagoon,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center'
  },
  generateButtonDisabled: {
    opacity: 0.6
  },
  generateButtonLabel: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700'
  },
  tokenCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: SPACING.CARD_RADIUS,
    padding: SPACING.CARD_PADDING,
    gap: SPACING.SECTION_GAP,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.35,
    shadowRadius: 34,
    elevation: 12
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  tokenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.ice
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(136, 230, 255, 0.5)',
    backgroundColor: 'rgba(136, 230, 255, 0.18)'
  },
  badgeLabel: {
    color: COLORS.ice,
    fontWeight: '700'
  },
  tokenValue: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.aurora,
    letterSpacing: 1.2
  },
  tokenMeta: {
    color: 'rgba(219, 237, 255, 0.8)',
    lineHeight: 20
  },
  tokenActions: {
    flexDirection: 'row',
    gap: 12
  },
  tokenActionButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    backgroundColor: 'rgba(5, 32, 80, 0.72)',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexDirection: 'row'
  },
  tokenActionLabel: {
    color: COLORS.ice,
    fontWeight: '700'
  },
  resultCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 28,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.35,
    shadowRadius: 34,
    elevation: 12
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ice,
    marginBottom: 12
  },
  tokenText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.aurora,
    letterSpacing: 1.1,
    marginTop: 4
  },
  expiryText: {
    marginTop: 6,
    color: 'rgba(219, 237, 255, 0.78)',
    fontSize: 14
  },
  resultButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12
  },
  resultMeta: {
    marginTop: 8,
    color: 'rgba(219, 237, 255, 0.78)',
    fontSize: 14,
    lineHeight: 20
  },
  resultButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 32, 80, 0.78)',
    borderRadius: 16,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.glowEdge
  },
  resultButtonLabel: {
    color: COLORS.ice,
    fontWeight: '700'
  },
  primaryResultButton: {
    backgroundColor: COLORS.aurora,
    alignSelf: 'stretch',
    borderColor: 'transparent'
  },
  primaryResultButtonLabel: {
    color: COLORS.midnight
  },
  primaryResultButtonDisabled: {
    opacity: 0.6
  },
  startSessionLabel: {
    marginTop: 20,
    color: COLORS.ice,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  },
  sessionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12
  },
  webrtcNotice: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(239, 71, 111, 0.4)',
    backgroundColor: 'rgba(239, 71, 111, 0.1)',
    padding: 14,
    marginBottom: 12
  },
  webrtcNoticeContent: {
    flex: 1,
    gap: 8
  },
  webrtcNoticeText: {
    color: 'rgba(219, 237, 255, 0.9)',
    lineHeight: 18,
    fontSize: 13
  },
  webrtcNoticeLink: {
    alignSelf: 'flex-start'
  },
  webrtcNoticeLinkLabel: {
    color: COLORS.aurora,
    fontWeight: '700',
    textDecorationLine: 'underline'
  },
  resetButton: {
    marginTop: 24,
    alignItems: 'center'
  },
  resetButtonLabel: {
    color: COLORS.aurora,
    fontSize: 15,
    textDecorationLine: 'underline',
    fontWeight: '600'
  },
  inAppSessionContainer: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.35,
    shadowRadius: 34,
    elevation: 12,
    flex: 1,
    overflow: 'hidden'
  },
  inAppSessionSafeArea: {
    flex: 1
  },
  inAppHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  inAppBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(6, 36, 92, 0.64)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.glowEdge
  },
  inAppBackLabel: {
    color: COLORS.ice,
    fontWeight: '600'
  },
  inAppHeaderTextGroup: {
    flex: 1,
    marginLeft: 16
  },
  inAppTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ice
  },
  inAppSubtitle: {
    marginTop: 6,
    color: 'rgba(219, 237, 255, 0.78)',
    lineHeight: 20
  },
  sessionContent: {
    flex: 1,
    paddingBottom: 28,
    gap: 18
  },
  sessionStatusCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.45)',
    backgroundColor: 'rgba(2, 11, 31, 0.78)',
    padding: 20,
    gap: 14
  },
  chatCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.38)',
    backgroundColor: 'rgba(6, 36, 92, 0.66)',
    padding: 20,
    flex: 1,
    gap: 12,
    minHeight: 320
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sessionCardTitle: {
    color: COLORS.ice,
    fontSize: 18,
    fontWeight: '700'
  },
  sessionCardDescription: {
    color: 'rgba(219, 237, 255, 0.78)',
    lineHeight: 20
  },
  chatListWrapper: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.2)',
    backgroundColor: 'rgba(2, 11, 31, 0.7)',
    padding: 12
  },
  chatList: {
    flex: 1
  },
  chatListContent: {
    gap: 12,
    paddingBottom: 12
  },
  chatEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24
  },
  chatEmptyText: {
    color: 'rgba(219, 237, 255, 0.75)',
    textAlign: 'center'
  },
  chatBubble: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(9, 30, 74, 0.72)'
  },
  chatBubbleSelf: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(136, 230, 255, 0.18)'
  },
  chatBubblePeer: {
    alignSelf: 'flex-start'
  },
  chatBubbleMeta: {
    color: 'rgba(219, 237, 255, 0.6)',
    fontSize: 12,
    marginBottom: 6
  },
  chatBubbleText: {
    color: COLORS.ice,
    lineHeight: 20
  },
  chatComposerRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end'
  },
  chatInput: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.ice,
    minHeight: 48,
    backgroundColor: 'rgba(2, 11, 31, 0.6)'
  },
  chatError: {
    color: COLORS.danger,
    fontWeight: '600'
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.aurora,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(111, 231, 255, 0.3)'
  },
  connectivityBanner: {
    marginTop: 6,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  connectivityBadgeReady: {
    backgroundColor: 'rgba(111, 231, 255, 0.12)',
    borderColor: 'rgba(111, 231, 255, 0.6)'
  },
  connectivityBadgeLimited: {
    backgroundColor: 'rgba(255, 209, 102, 0.12)',
    borderColor: 'rgba(255, 209, 102, 0.6)'
  },
  connectivityBadgeWarning: {
    backgroundColor: 'rgba(239, 71, 111, 0.14)',
    borderColor: 'rgba(239, 71, 111, 0.55)'
  },
  connectivityBannerText: {
    flex: 1
  },
  connectivityBannerLabel: {
    color: COLORS.ice,
    fontWeight: '700'
  },
  connectivityBannerMessage: {
    color: 'rgba(219, 237, 255, 0.78)',
    fontSize: 12,
    marginTop: 2
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  statusPillIndicator: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.ice
  },
  statusPillLabel: {
    color: COLORS.midnight,
    fontWeight: '600',
    fontSize: 13
  },
  statusPillSuccess: {
    backgroundColor: COLORS.aurora
  },
  statusPillWaiting: {
    backgroundColor: '#FFD166'
  },
  statusPillInactive: {
    backgroundColor: 'rgba(219, 237, 255, 0.68)'
  },
  statusLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  statusLoadingLabel: {
    color: 'rgba(219, 237, 255, 0.82)',
    fontWeight: '600'
  },
  statusErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 71, 111, 0.16)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 71, 111, 0.32)'
  },
  statusErrorLabel: {
    color: COLORS.danger,
    flex: 1,
    fontWeight: '600'
  },
  statusMetricsContainer: {
    gap: 12
  },
  statusMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusMetricLabel: {
    color: 'rgba(219, 237, 255, 0.7)',
    fontWeight: '600'
  },
  statusMetricValue: {
    color: COLORS.ice,
    fontWeight: '600'
  },
  participantList: {
    marginTop: 12,
    gap: 12
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(4, 23, 60, 0.66)',
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.24)'
  },
  participantDetails: {
    flex: 1,
    marginRight: 12
  },
  participantRoleLabel: {
    color: COLORS.ice,
    fontWeight: '700'
  },
  participantMeta: {
    marginTop: 4,
    color: 'rgba(219, 237, 255, 0.68)',
    fontSize: 12
  },
  participantBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  participantBadgeOnline: {
    backgroundColor: 'rgba(136, 230, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(136, 230, 255, 0.5)'
  },
  participantBadgeOffline: {
    backgroundColor: 'rgba(255, 209, 102, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 102, 0.4)'
  },
  participantBadgeLabel: {
    color: COLORS.ice,
    fontWeight: '600',
    fontSize: 12
  },
  participantEmpty: {
    color: 'rgba(219, 237, 255, 0.65)',
    fontStyle: 'italic'
  },
  chatMetaLabel: {
    color: 'rgba(219, 237, 255, 0.7)',
    fontWeight: '600'
  },
  connectionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1
  },
  connectionBadgeOnline: {
    borderColor: 'rgba(136, 230, 255, 0.6)',
    backgroundColor: 'rgba(136, 230, 255, 0.2)'
  },
  connectionBadgeReconnecting: {
    borderColor: 'rgba(255, 209, 102, 0.6)',
    backgroundColor: 'rgba(255, 209, 102, 0.2)'
  },
  connectionBadgeIdle: {
    borderColor: 'rgba(255, 108, 96, 0.4)',
    backgroundColor: 'rgba(255, 108, 96, 0.2)'
  },
  connectionBadgeLabel: {
    color: COLORS.ice,
    fontWeight: '600'
  },
  sessionFallbackCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 28,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.35,
    shadowRadius: 34,
    elevation: 12,
    gap: 16
  },
  sessionFallbackTitle: {
    color: COLORS.ice,
    fontSize: 20,
    fontWeight: '700'
  },
  sessionFallbackBody: {
    color: 'rgba(219, 237, 255, 0.78)',
    lineHeight: 20
  },
  sessionFallbackLink: {
    alignItems: 'center'
  },
  sessionFallbackLinkLabel: {
    color: COLORS.aurora,
    fontWeight: '600',
    textDecorationLine: 'underline'
  },
  joinOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  joinCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    padding: 24,
    gap: 16
  },
  joinHelper: {
    color: 'rgba(219, 237, 255, 0.78)',
    lineHeight: 20
  },
  joinInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 71, 111, 0.4)',
    backgroundColor: 'rgba(239, 71, 111, 0.12)',
    padding: 12,
    marginBottom: 4
  },
  joinInfoBannerText: {
    flex: 1,
    color: 'rgba(219, 237, 255, 0.85)',
    lineHeight: 18,
    fontSize: 13
  },
  joinInput: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.ice,
    backgroundColor: 'rgba(2, 11, 31, 0.6)'
  },
  joinButton: {
    borderRadius: 18,
    backgroundColor: COLORS.aurora,
    paddingVertical: 14,
    alignItems: 'center'
  },
  joinButtonDisabled: {
    backgroundColor: 'rgba(111, 231, 255, 0.4)'
  },
  joinButtonLabel: {
    color: COLORS.midnight,
    fontWeight: '700'
  }
});
