import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../constants/colors';
import { TEXT_STYLES } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { mintToken, getDefaultTokenParams, validateTokenParams } from '../services/api/tokens';
import { useSessionStore } from '../state/stores/sessionStore';
import { getDeviceId } from '../utils/deviceId';
import type { ValidityPeriod } from '../services/api/types';

const LogoImage = require('../../assets/splash-icon.png');

const MENU_LINKS = [
  { label: 'About', url: 'https://chatorbit.com/about' },
  { label: 'FAQ', url: 'https://chatorbit.com/faq' },
  { label: 'Support', url: 'https://chatorbit.com/support' },
];

type RootStackParamList = {
  Splash: undefined;
  Landing: undefined;
  Mint: undefined;
  Accept: undefined;
  Session: undefined;
};

type MintScreenProps = NativeStackScreenProps<RootStackParamList, 'Mint'>;

const VALIDITY_OPTIONS: { label: string; value: ValidityPeriod }[] = [
  { label: '1 Day', value: '1_day' },
  { label: '1 Week', value: '1_week' },
  { label: '1 Month', value: '1_month' },
  { label: '1 Year', value: '1_year' },
];

export const MintScreen: React.FC<MintScreenProps> = ({ navigation }) => {
  const defaults = getDefaultTokenParams();
  const [validityPeriod, setValidityPeriod] = useState<ValidityPeriod>(defaults.validity_period);
  const [sessionTtl, setSessionTtl] = useState(String(defaults.session_ttl_minutes));
  const [messageLimit, setMessageLimit] = useState(String(defaults.message_char_limit || 2000));
  const [isMinting, setIsMinting] = useState(false);
  const [mintedToken, setMintedToken] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const { joinSession } = useSessionStore();

  const handleMenuLink = (url: string) => {
    setMenuVisible(false);
    Linking.openURL(url);
  };

  const handleMintToken = async () => {
    const sessionTtlNum = parseInt(sessionTtl, 10);
    const messageLimitNum = parseInt(messageLimit, 10);

    if (isNaN(sessionTtlNum)) {
      Alert.alert('Invalid Input', 'Session duration must be a number');
      return;
    }

    if (isNaN(messageLimitNum)) {
      Alert.alert('Invalid Input', 'Message limit must be a number');
      return;
    }

    const params = {
      validity_period: validityPeriod,
      session_ttl_minutes: sessionTtlNum,
      message_char_limit: messageLimitNum,
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
      Alert.alert(
        'Token Created!',
        `Your token is: ${response.token}\n\nShare this token with the other participant.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Minting error:', error);
      Alert.alert('Error', error.message || 'Failed to create token');
    } finally {
      setIsMinting(false);
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
      navigation.navigate('Session');
    } catch (error: any) {
      console.error('Join error:', error);
      Alert.alert('Error', error.message || 'Failed to join session');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0a1628', '#122a4d', '#1a3a5c', '#0d2137']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <Image source={LogoImage} style={styles.headerLogo} resizeMode="contain" />
            <Text style={styles.headerTitle} maxFontSizeMultiplier={1}>CHATORBIT</Text>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="menu" size={28} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Menu Modal */}
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          >
            <View style={styles.menuContainer}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Menu</Text>
                <TouchableOpacity onPress={() => setMenuVisible(false)}>
                  <Ionicons name="close" size={24} color={COLORS.text.primary} />
                </TouchableOpacity>
              </View>
              {MENU_LINKS.map((link) => (
                <TouchableOpacity
                  key={link.label}
                  style={styles.menuItem}
                  onPress={() => handleMenuLink(link.url)}
                >
                  <Text style={styles.menuItemText}>{link.label}</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.text.secondary} />
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>

      <Card style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.sectionTitle}>Token Validity</Text>
          <Text style={styles.sectionDescription}>
            How long the token can be used to join
          </Text>
          <View style={styles.validityOptions}>
            {VALIDITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.validityButton,
                  validityPeriod === option.value && styles.validityButtonActive,
                ]}
                onPress={() => setValidityPeriod(option.value)}
              >
                <Text
                  style={[
                    styles.validityButtonText,
                    validityPeriod === option.value && styles.validityButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Session Duration (minutes)</Text>
          <Text style={styles.sectionDescription}>
            How long the session stays active (1-1440)
          </Text>
          <Input
            placeholder="60"
            value={sessionTtl}
            onChangeText={setSessionTtl}
            keyboardType="number-pad"
          />

          <Text style={styles.sectionTitle}>Message Character Limit</Text>
          <Text style={styles.sectionDescription}>
            Maximum characters per message (200-16000)
          </Text>
          <Input
            placeholder="2000"
            value={messageLimit}
            onChangeText={setMessageLimit}
            keyboardType="number-pad"
          />

          <View style={styles.buttonContainer}>
            {!mintedToken ? (
              <Button
                onPress={handleMintToken}
                variant="primary"
                fullWidth
                disabled={isMinting}
              >
                {isMinting ? 'Creating Token...' : 'Create Token'}
              </Button>
            ) : (
              <>
                <View style={styles.tokenDisplay}>
                  <Text style={styles.tokenLabel}>Your Token:</Text>
                  <Text style={styles.tokenValue}>{mintedToken}</Text>
                  <Text style={styles.tokenHint}>Share this with the other participant</Text>
                </View>
                <Button
                  onPress={handleStartSession}
                  variant="primary"
                  fullWidth
                  disabled={isJoining}
                >
                  {isJoining ? 'Joining Session...' : 'Start Session'}
                </Button>
                <View style={styles.buttonSpacer} />
                <Button
                  onPress={() => setMintedToken(null)}
                  variant="secondary"
                  fullWidth
                >
                  Create Another Token
                </Button>
              </>
            )}
          </View>
        </View>
      </Card>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Back to Landing</Text>
      </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 48,
    height: 48,
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: 'rgb(186, 230, 253)',
    fontFamily: Platform.select({
      ios: 'Segoe UI',
      android: 'sans-serif',
      default: 'Segoe UI',
    }),
    letterSpacing: 1,
  },
  menuButton: {
    padding: SPACING.xs,
  },
  // Menu Modal Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    backgroundColor: COLORS.background.secondary,
    marginTop: 60,
    marginRight: SPACING.md,
    borderRadius: 12,
    minWidth: 200,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
  },
  menuTitle: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.primary,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.default,
  },
  menuItemText: {
    ...TEXT_STYLES.body,
    color: COLORS.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  card: {
    marginBottom: SPACING.lg,
  },
  cardContent: {
    padding: SPACING.lg,
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
  validityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  validityButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.background.tertiary,
    alignItems: 'center',
  },
  validityButtonActive: {
    backgroundColor: COLORS.background.tertiary,
    borderColor: COLORS.accent.yellow,
  },
  validityButtonText: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
  },
  validityButtonTextActive: {
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
  backButton: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  backButtonText: {
    ...TEXT_STYLES.body,
    color: COLORS.accent.orange,
  },
});
