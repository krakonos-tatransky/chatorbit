import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import { TEXT_STYLES } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useSessionStore } from '../../state/stores/sessionStore';
import { getDeviceId } from '../../utils/deviceId';
import { useTranslation } from '../../i18n';

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

interface AcceptContentProps {
  onSessionStart: () => void;
}

export const AcceptContent: React.FC<AcceptContentProps> = ({
  onSessionStart,
}) => {
  const t = useTranslation();
  const [token, setToken] = useState('');
  const { joinSession, isJoining, error } = useSessionStore();

  const handleJoin = async () => {
    const trimmedToken = token.trim().toLowerCase();
    if (trimmedToken.length !== 32) {
      Alert.alert(t.accept.invalidToken, t.accept.invalidTokenMessage);
      return;
    }

    try {
      const deviceId = await getDeviceId();
      await joinSession(trimmedToken, null, deviceId);
      onSessionStart();
    } catch (error) {
      console.error('Failed to join session:', error);
      Alert.alert(
        t.accept.joinFailed,
        error instanceof Error ? error.message : t.accept.failedMessage
      );
    }
  };

  const handleTokenChange = (text: string) => {
    // Accept lowercase hex characters, strip any whitespace
    const formatted = text.toLowerCase().replace(/\s/g, '').slice(0, 32);
    setToken(formatted);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle} maxFontSizeMultiplier={1.2}>{t.accept.pageTitle}</Text>
        <Text style={styles.pageSubtitle} maxFontSizeMultiplier={1.2}>{t.accept.pageSubtitle}</Text>

        <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>{t.accept.tokenTitle}</Text>
        <Text style={styles.sectionDescription} maxFontSizeMultiplier={1.2}>
          {t.accept.tokenDescription}
        </Text>

        <Input
          placeholder={t.accept.tokenPlaceholder}
          value={token}
          onChangeText={handleTokenChange}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={32}
          error={error || undefined}
          style={styles.input}
        />

        <View style={styles.buttonContainer}>
          <Button
            onPress={handleJoin}
            loading={isJoining}
            disabled={token.length !== 32}
            fullWidth
          >
            {t.accept.joinButton}
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
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
  input: {
    fontSize: 14,
    fontFamily: 'JetBrainsMono',
    textAlign: 'center',
    letterSpacing: 1,
  },
  buttonContainer: {
    marginTop: SPACING.xl,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
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
});
