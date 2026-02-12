import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../../constants/colors';
import { TEXT_STYLES } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';
import { Button } from '../ui/Button';
import { mintToken, getDefaultTokenParams, validateTokenParams } from '../../services/api/tokens';
import { useSessionStore } from '../../state/stores/sessionStore';
import { getDeviceId } from '../../utils/deviceId';
import { useTranslation } from '../../i18n';
import type { ValidityPeriod } from '../../services/api/types';

// Footer badge icons (matching LandingContent)
const NEON_BLUE = '#4FC3F7';

const ShieldIcon: React.FC = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="#4CAF50">
    <Path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
  </Svg>
);

const LockIcon: React.FC = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill={NEON_BLUE}>
    <Path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
  </Svg>
);

const ClockIcon: React.FC = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="#FF9800">
    <Path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
  </Svg>
);

interface MintContentProps {
  onSessionStart: () => void;
}

// Option values - labels come from translations
const VALIDITY_VALUES: ValidityPeriod[] = ['1_day', '1_week', '1_month', '1_year'];
const DURATION_VALUES: number[] = [5, 15, 30, 60, 180, 1440];
const MESSAGE_LIMIT_VALUES: number[] = [200, 500, 1000, 2000, 5000, 10000, 16000];

export const MintContent: React.FC<MintContentProps> = ({
  onSessionStart,
}) => {
  const t = useTranslation();
  const defaults = getDefaultTokenParams();
  const [validityPeriod, setValidityPeriod] = useState<ValidityPeriod>(defaults.validity_period);
  const [sessionTtl, setSessionTtl] = useState<number>(defaults.session_ttl_minutes);
  const [messageLimit, setMessageLimit] = useState<number>(defaults.message_char_limit || 2000);
  const [isMinting, setIsMinting] = useState(false);
  const [mintedToken, setMintedToken] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [showValidityPicker, setShowValidityPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showMessageLimitPicker, setShowMessageLimitPicker] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  // Map values to translated labels
  const validityLabels: Record<ValidityPeriod, string> = {
    '1_day': t.mint.validityOptions.oneDay,
    '1_week': t.mint.validityOptions.oneWeek,
    '1_month': t.mint.validityOptions.oneMonth,
    '1_year': t.mint.validityOptions.oneYear,
  };

  const durationLabels: Record<number, string> = {
    5: t.mint.durationOptions.fiveMin,
    15: t.mint.durationOptions.fifteenMin,
    30: t.mint.durationOptions.thirtyMin,
    60: t.mint.durationOptions.oneHour,
    180: t.mint.durationOptions.threeHours,
    1440: t.mint.durationOptions.oneDay,
  };

  const messageLimitLabels: Record<number, string> = {
    200: t.mint.messageLimitOptions.chars200,
    500: t.mint.messageLimitOptions.chars500,
    1000: t.mint.messageLimitOptions.chars1000,
    2000: t.mint.messageLimitOptions.chars2000,
    5000: t.mint.messageLimitOptions.chars5000,
    10000: t.mint.messageLimitOptions.chars10000,
    16000: t.mint.messageLimitOptions.chars16000,
  };

  const getValidityLabel = (value: ValidityPeriod) => {
    return validityLabels[value] || value;
  };

  const getDurationLabel = (value: number) => {
    return durationLabels[value] || `${value} minutes`;
  };

  const getMessageLimitLabel = (value: number) => {
    return messageLimitLabels[value] || `${value} characters`;
  };

  const { joinSession } = useSessionStore();

  const handleMintToken = async () => {
    const params = {
      validity_period: validityPeriod,
      session_ttl_minutes: sessionTtl,
      message_char_limit: messageLimit,
    };

    const validationError = validateTokenParams(params);
    if (validationError) {
      Alert.alert(t.mint.invalidParams, validationError);
      return;
    }

    setIsMinting(true);
    try {
      const response = await mintToken(params);
      setMintedToken(response.token);
    } catch (error: any) {
      console.error('Minting error:', JSON.stringify(error, null, 2));
      // API errors have 'detail', regular errors have 'message'
      const errorMessage = error.detail || error.message || t.mint.errorTitle;
      Alert.alert(t.mint.errorTitle, errorMessage);
    } finally {
      setIsMinting(false);
    }
  };

  const handleCopyToken = async () => {
    if (mintedToken) {
      await Clipboard.setStringAsync(mintedToken);
      Alert.alert(t.mint.copied, t.mint.copiedMessage);
    }
  };

  const handleShareToken = async () => {
    if (mintedToken) {
      try {
        await Share.share(
          {
            message: t.mint.shareMessage.replace('{token}', mintedToken),
            title: t.mint.shareTitle,
          },
          {
            subject: t.mint.shareTitle, // Used as email subject on iOS
          }
        );
      } catch (error) {
        console.error('Share error:', error);
      }
    }
  };

  const handleStartSession = async () => {
    if (!mintedToken) {
      Alert.alert(t.mint.errorTitle, t.mint.noTokenError);
      return;
    }

    setIsJoining(true);
    try {
      const deviceId = await getDeviceId();
      await joinSession(mintedToken, null, deviceId);
      onSessionStart();
    } catch (error: any) {
      console.error('Join error:', error);
      Alert.alert(t.mint.errorTitle, error.message || t.mint.errorTitle);
    } finally {
      setIsJoining(false);
    }
  };

  // Token Success Screen
  if (mintedToken) {
    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.successContentContainer}>
        <View style={styles.tokenSuccessIcon}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.accent.yellow} />
        </View>
        <Text style={styles.tokenSuccessTitle} maxFontSizeMultiplier={1.2}>{t.mint.successTitle}</Text>
        <Text style={styles.tokenSuccessSubtitle} maxFontSizeMultiplier={1.2}>
          {t.mint.successSubtitle}
        </Text>

        <View style={styles.tokenDisplayBox}>
          <Text style={styles.tokenDisplayBoxLabel} maxFontSizeMultiplier={1.2}>{t.mint.yourToken}</Text>
          <Text style={styles.tokenDisplayBoxValue} maxFontSizeMultiplier={1.2} selectable>{mintedToken}</Text>
        </View>

        <View style={styles.tokenActionButtons}>
          <TouchableOpacity style={styles.tokenActionButton} onPress={handleCopyToken}>
            <Ionicons name="copy-outline" size={24} color={COLORS.accent.yellow} />
            <Text style={styles.tokenActionButtonText} maxFontSizeMultiplier={1.2}>{t.mint.copyButton}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tokenActionButton} onPress={handleShareToken}>
            <Ionicons name="share-outline" size={24} color={COLORS.accent.yellow} />
            <Text style={styles.tokenActionButtonText} maxFontSizeMultiplier={1.2}>{t.mint.shareButton}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tokenActionButton} onPress={() => setShowQRCode(true)}>
            <Ionicons name="qr-code-outline" size={24} color={COLORS.accent.yellow} />
            <Text style={styles.tokenActionButtonText} maxFontSizeMultiplier={1.2}>{t.mint.qrCodeButton}</Text>
          </TouchableOpacity>
        </View>

        {/* QR Code Modal */}
        <Modal
          visible={showQRCode}
          transparent
          animationType="fade"
          onRequestClose={() => setShowQRCode(false)}
        >
          <TouchableOpacity
            style={styles.qrOverlay}
            activeOpacity={1}
            onPress={() => setShowQRCode(false)}
          >
            <View style={styles.qrContent}>
              <View style={styles.qrHeader}>
                <Text style={styles.qrTitle} maxFontSizeMultiplier={1.2}>{t.mint.qrCodeTitle}</Text>
                <TouchableOpacity onPress={() => setShowQRCode(false)}>
                  <Ionicons name="close" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.qrCodeContainer}>
                <QRCode
                  value={`chatorbit://join/${mintedToken}`}
                  size={200}
                  backgroundColor={COLORS.background.secondary}
                  color={COLORS.text.primary}
                />
              </View>
              <Text style={styles.qrHint} maxFontSizeMultiplier={1.2}>{t.mint.qrCodeHint}</Text>
            </View>
          </TouchableOpacity>
        </Modal>

        <View style={styles.startSessionButtonContainer}>
          <Button
            onPress={handleStartSession}
            variant="primary"
            fullWidth
            disabled={isJoining}
          >
            {isJoining ? t.mint.joiningButton : t.mint.startSessionButton}
          </Button>
        </View>

        <TouchableOpacity
          style={styles.createAnotherButton}
          onPress={() => setMintedToken(null)}
        >
          <Text style={styles.createAnotherText} maxFontSizeMultiplier={1.2}>{t.mint.createAnotherButton}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.pageTitle} maxFontSizeMultiplier={1.2}>{t.mint.pageTitle}</Text>
      <Text style={styles.pageSubtitle} maxFontSizeMultiplier={1.2}>{t.mint.pageSubtitle}</Text>

      <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>{t.mint.validityTitle}</Text>
      <Text style={styles.sectionDescription} maxFontSizeMultiplier={1.2}>
        {t.mint.validityDescription}
      </Text>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowValidityPicker(true)}
      >
        <Text style={styles.selectButtonText} maxFontSizeMultiplier={1.2}>{getValidityLabel(validityPeriod)}</Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.text.secondary} />
      </TouchableOpacity>

      {/* Validity Picker Modal */}
      <Modal
        visible={showValidityPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowValidityPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowValidityPicker(false)}
        >
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle} maxFontSizeMultiplier={1.2}>{t.mint.validityTitle}</Text>
              <TouchableOpacity onPress={() => setShowValidityPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            {VALIDITY_VALUES.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.pickerOption,
                  validityPeriod === value && styles.pickerOptionActive,
                ]}
                onPress={() => {
                  setValidityPeriod(value);
                  setShowValidityPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    validityPeriod === value && styles.pickerOptionTextActive,
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  {getValidityLabel(value)}
                </Text>
                {validityPeriod === value && (
                  <Ionicons name="checkmark" size={20} color={COLORS.accent.yellow} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>{t.mint.durationTitle}</Text>
      <Text style={styles.sectionDescription} maxFontSizeMultiplier={1.2}>
        {t.mint.durationDescription}
      </Text>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowDurationPicker(true)}
      >
        <Text style={styles.selectButtonText} maxFontSizeMultiplier={1.2}>{getDurationLabel(sessionTtl)}</Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.text.secondary} />
      </TouchableOpacity>

      {/* Duration Picker Modal */}
      <Modal
        visible={showDurationPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDurationPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowDurationPicker(false)}
        >
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle} maxFontSizeMultiplier={1.2}>{t.mint.durationTitle}</Text>
              <TouchableOpacity onPress={() => setShowDurationPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            {DURATION_VALUES.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.pickerOption,
                  sessionTtl === value && styles.pickerOptionActive,
                ]}
                onPress={() => {
                  setSessionTtl(value);
                  setShowDurationPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    sessionTtl === value && styles.pickerOptionTextActive,
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  {getDurationLabel(value)}
                </Text>
                {sessionTtl === value && (
                  <Ionicons name="checkmark" size={20} color={COLORS.accent.yellow} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>{t.mint.messageLimitTitle}</Text>
      <Text style={styles.sectionDescription} maxFontSizeMultiplier={1.2}>
        {t.mint.messageLimitDescription}
      </Text>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowMessageLimitPicker(true)}
      >
        <Text style={styles.selectButtonText} maxFontSizeMultiplier={1.2}>{getMessageLimitLabel(messageLimit)}</Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.text.secondary} />
      </TouchableOpacity>

      {/* Message Limit Picker Modal */}
      <Modal
        visible={showMessageLimitPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMessageLimitPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowMessageLimitPicker(false)}
        >
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle} maxFontSizeMultiplier={1.2}>{t.mint.messageLimitTitle}</Text>
              <TouchableOpacity onPress={() => setShowMessageLimitPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            {MESSAGE_LIMIT_VALUES.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.pickerOption,
                  messageLimit === value && styles.pickerOptionActive,
                ]}
                onPress={() => {
                  setMessageLimit(value);
                  setShowMessageLimitPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    messageLimit === value && styles.pickerOptionTextActive,
                  ]}
                  maxFontSizeMultiplier={1.2}
                >
                  {getMessageLimitLabel(value)}
                </Text>
                {messageLimit === value && (
                  <Ionicons name="checkmark" size={20} color={COLORS.accent.yellow} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.buttonContainer}>
        <Button
          onPress={handleMintToken}
          variant="primary"
          fullWidth
          disabled={isMinting}
        >
          {isMinting ? t.mint.creatingButton : t.mint.createButton}
        </Button>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerBadges}>
          <View style={styles.footerBadge}>
            <ShieldIcon />
            <Text style={styles.footerBadgeText} maxFontSizeMultiplier={1.1}>{t.landing.badgePrivate}</Text>
          </View>
          <View style={styles.footerBadge}>
            <LockIcon />
            <Text style={styles.footerBadgeText} maxFontSizeMultiplier={1.1}>{t.landing.badgeEncrypted}</Text>
          </View>
          <View style={styles.footerBadge}>
            <ClockIcon />
            <Text style={styles.footerBadgeText} maxFontSizeMultiplier={1.1}>{t.landing.badgeEphemeral}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  successContentContainer: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  tokenSuccessIcon: {
    marginBottom: SPACING.md,
  },
  tokenSuccessTitle: {
    ...TEXT_STYLES.h2,
    color: COLORS.accent.yellow,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  tokenSuccessSubtitle: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  tokenDisplayBox: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    padding: SPACING.lg,
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  tokenDisplayBoxLabel: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  tokenDisplayBoxValue: {
    fontSize: 12,
    fontFamily: 'JetBrainsMono',
    color: COLORS.text.primary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  tokenActionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  tokenActionButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  tokenActionButtonText: {
    ...TEXT_STYLES.caption,
    color: COLORS.accent.yellow,
    marginTop: SPACING.xs,
  },
  startSessionButtonContainer: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  createAnotherButton: {
    paddingVertical: SPACING.sm,
  },
  createAnotherText: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    textDecorationLine: 'underline',
  },
  pageTitle: {
    ...TEXT_STYLES.h2,
    color: COLORS.accent.yellow,
    textAlign: 'center',
  },
  pageSubtitle: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  sectionDescription: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  selectButtonText: {
    ...TEXT_STYLES.body,
    color: COLORS.text.primary,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  pickerContent: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
  },
  pickerTitle: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.primary,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
  },
  pickerOptionActive: {
    backgroundColor: COLORS.background.tertiary,
  },
  pickerOptionText: {
    ...TEXT_STYLES.body,
    color: COLORS.text.primary,
  },
  pickerOptionTextActive: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.accent.yellow,
  },
  buttonContainer: {
    marginTop: SPACING.xl,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginTop: SPACING.md,
  },
  footerBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerBadgeText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  buttonSpacer: {
    height: SPACING.md,
  },
  tokenDisplay: {
    backgroundColor: COLORS.background.tertiary,
    padding: SPACING.lg,
    borderRadius: 8,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  tokenLabel: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  tokenValue: {
    ...TEXT_STYLES.h2,
    color: COLORS.accent.yellow,
    letterSpacing: 4,
    marginBottom: SPACING.sm,
  },
  tokenHint: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  qrOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  qrContent: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.lg,
  },
  qrTitle: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.primary,
  },
  qrCodeContainer: {
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  qrHint: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});
