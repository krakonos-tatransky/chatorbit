import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
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
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const { joinSession, isJoining, error } = useSessionStore();

  const handleScanQR = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(t.common.error, t.accept.cameraPermissionDenied);
        return;
      }
    }
    setShowScanner(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    // Extract token from deep link: chatorbit://join/{token}
    const match = data.match(/chatorbit:\/\/join\/([a-f0-9]{32})/i);
    if (match) {
      setToken(match[1].toLowerCase());
      setShowScanner(false);
    } else {
      // Maybe it's just a raw token
      const rawToken = data.toLowerCase().replace(/\s/g, '');
      if (rawToken.length === 32 && /^[a-f0-9]+$/.test(rawToken)) {
        setToken(rawToken);
        setShowScanner(false);
      } else {
        Alert.alert(t.accept.invalidToken, t.accept.invalidQRCode);
      }
    }
  };

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

        <TouchableOpacity style={styles.scanButton} onPress={handleScanQR}>
          <Ionicons name="qr-code-outline" size={24} color={COLORS.accent.yellow} />
          <Text style={styles.scanButtonText} maxFontSizeMultiplier={1.2}>{t.accept.scanQRButton}</Text>
        </TouchableOpacity>

        {/* QR Scanner Modal */}
        <Modal
          visible={showScanner}
          animationType="slide"
          onRequestClose={() => setShowScanner(false)}
        >
          <View style={styles.scannerContainer}>
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerTitle} maxFontSizeMultiplier={1.2}>{t.accept.scanQRTitle}</Text>
              <TouchableOpacity onPress={() => setShowScanner(false)}>
                <Ionicons name="close" size={28} color={COLORS.text.primary} />
              </TouchableOpacity>
            </View>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={handleBarCodeScanned}
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
            </View>
            <Text style={styles.scannerHint} maxFontSizeMultiplier={1.2}>{t.accept.scanQRHint}</Text>
          </View>
        </Modal>

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
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  scanButtonText: {
    ...TEXT_STYLES.body,
    color: COLORS.accent.yellow,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + 20,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background.primary,
  },
  scannerTitle: {
    ...TEXT_STYLES.h3,
    color: COLORS.text.primary,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: COLORS.accent.yellow,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scannerHint: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.background.primary,
  },
});
