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
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { TEXT_STYLES } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';
import { Button } from '../ui/Button';
import { mintToken, getDefaultTokenParams, validateTokenParams } from '../../services/api/tokens';
import { useSessionStore } from '../../state/stores/sessionStore';
import { getDeviceId } from '../../utils/deviceId';
import type { ValidityPeriod } from '../../services/api/types';

interface MintContentProps {
  onSessionStart: () => void;
}

const VALIDITY_OPTIONS: { label: string; value: ValidityPeriod }[] = [
  { label: '1 Day', value: '1_day' },
  { label: '1 Week', value: '1_week' },
  { label: '1 Month', value: '1_month' },
  { label: '1 Year', value: '1_year' },
];

const DURATION_OPTIONS: { label: string; value: number }[] = [
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '3 hours', value: 180 },
  { label: '1 day', value: 1440 },
];

const MESSAGE_LIMIT_OPTIONS: { label: string; value: number }[] = [
  { label: '200 characters', value: 200 },
  { label: '500 characters', value: 500 },
  { label: '1,000 characters', value: 1000 },
  { label: '2,000 characters', value: 2000 },
  { label: '5,000 characters', value: 5000 },
  { label: '10,000 characters', value: 10000 },
  { label: '16,000 characters', value: 16000 },
];

export const MintContent: React.FC<MintContentProps> = ({
  onSessionStart,
}) => {
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

  const getValidityLabel = (value: ValidityPeriod) => {
    return VALIDITY_OPTIONS.find(opt => opt.value === value)?.label || value;
  };

  const getDurationLabel = (value: number) => {
    return DURATION_OPTIONS.find(opt => opt.value === value)?.label || `${value} minutes`;
  };

  const getMessageLimitLabel = (value: number) => {
    return MESSAGE_LIMIT_OPTIONS.find(opt => opt.value === value)?.label || `${value} characters`;
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
      Alert.alert('Invalid Parameters', validationError);
      return;
    }

    setIsMinting(true);
    try {
      const response = await mintToken(params);
      setMintedToken(response.token);
    } catch (error: any) {
      console.error('Minting error:', JSON.stringify(error, null, 2));
      // API errors have 'detail', regular errors have 'message'
      const errorMessage = error.detail || error.message || 'Failed to create token';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsMinting(false);
    }
  };

  const handleCopyToken = async () => {
    if (mintedToken) {
      await Clipboard.setStringAsync(mintedToken);
      Alert.alert('Copied!', 'Token copied to clipboard');
    }
  };

  const handleShareToken = async () => {
    if (mintedToken) {
      try {
        await Share.share({
          message: `Join my ChatOrbit session!\n\nToken: ${mintedToken}\n\nOpen the ChatOrbit app, tap "Have token", and paste this token to connect.`,
          title: 'ChatOrbit Session Token',
        });
      } catch (error) {
        console.error('Share error:', error);
      }
    }
  };

  const handleStartSession = async () => {
    if (!mintedToken) {
      Alert.alert('Error', 'No token available');
      return;
    }

    setIsJoining(true);
    try {
      const deviceId = await getDeviceId();
      await joinSession(mintedToken, null, deviceId);
      onSessionStart();
    } catch (error: any) {
      console.error('Join error:', error);
      Alert.alert('Error', error.message || 'Failed to join session');
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
        <Text style={styles.tokenSuccessTitle}>Token Created!</Text>
        <Text style={styles.tokenSuccessSubtitle}>
          Share this token with the other participant
        </Text>

        <View style={styles.tokenDisplayBox}>
          <Text style={styles.tokenDisplayBoxLabel}>Your Token</Text>
          <Text style={styles.tokenDisplayBoxValue} selectable>{mintedToken}</Text>
        </View>

        <View style={styles.tokenActionButtons}>
          <TouchableOpacity style={styles.tokenActionButton} onPress={handleCopyToken}>
            <Ionicons name="copy-outline" size={24} color={COLORS.accent.yellow} />
            <Text style={styles.tokenActionButtonText}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tokenActionButton} onPress={handleShareToken}>
            <Ionicons name="share-outline" size={24} color={COLORS.accent.yellow} />
            <Text style={styles.tokenActionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.startSessionButtonContainer}>
          <Button
            onPress={handleStartSession}
            variant="primary"
            fullWidth
            disabled={isJoining}
          >
            {isJoining ? 'Joining...' : 'Start Session'}
          </Button>
        </View>

        <TouchableOpacity
          style={styles.createAnotherButton}
          onPress={() => setMintedToken(null)}
        >
          <Text style={styles.createAnotherText}>Create Another Token</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.pageTitle}>Create New Session</Text>
      <Text style={styles.pageSubtitle}>Configure your session parameters</Text>

      <Text style={styles.sectionTitle}>Token Validity</Text>
      <Text style={styles.sectionDescription}>
        How long the token can be used to join
      </Text>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowValidityPicker(true)}
      >
        <Text style={styles.selectButtonText}>{getValidityLabel(validityPeriod)}</Text>
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
              <Text style={styles.pickerTitle}>Token Validity</Text>
              <TouchableOpacity onPress={() => setShowValidityPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            {VALIDITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.pickerOption,
                  validityPeriod === option.value && styles.pickerOptionActive,
                ]}
                onPress={() => {
                  setValidityPeriod(option.value);
                  setShowValidityPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    validityPeriod === option.value && styles.pickerOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {validityPeriod === option.value && (
                  <Ionicons name="checkmark" size={20} color={COLORS.accent.yellow} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Text style={styles.sectionTitle}>Session Duration</Text>
      <Text style={styles.sectionDescription}>
        How long the session stays active
      </Text>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowDurationPicker(true)}
      >
        <Text style={styles.selectButtonText}>{getDurationLabel(sessionTtl)}</Text>
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
              <Text style={styles.pickerTitle}>Session Duration</Text>
              <TouchableOpacity onPress={() => setShowDurationPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            {DURATION_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.pickerOption,
                  sessionTtl === option.value && styles.pickerOptionActive,
                ]}
                onPress={() => {
                  setSessionTtl(option.value);
                  setShowDurationPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    sessionTtl === option.value && styles.pickerOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {sessionTtl === option.value && (
                  <Ionicons name="checkmark" size={20} color={COLORS.accent.yellow} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Text style={styles.sectionTitle}>Message Character Limit</Text>
      <Text style={styles.sectionDescription}>
        Maximum characters per message
      </Text>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowMessageLimitPicker(true)}
      >
        <Text style={styles.selectButtonText}>{getMessageLimitLabel(messageLimit)}</Text>
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
              <Text style={styles.pickerTitle}>Message Limit</Text>
              <TouchableOpacity onPress={() => setShowMessageLimitPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            {MESSAGE_LIMIT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.pickerOption,
                  messageLimit === option.value && styles.pickerOptionActive,
                ]}
                onPress={() => {
                  setMessageLimit(option.value);
                  setShowMessageLimitPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    messageLimit === option.value && styles.pickerOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {messageLimit === option.value && (
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
          {isMinting ? 'Creating Token...' : 'Create Token'}
        </Button>
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
});
