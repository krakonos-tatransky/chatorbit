import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
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

const LogoImage = require('../../assets/splash-icon.png');

type RootStackParamList = {
  Splash: undefined;
  Landing: undefined;
  Mint: undefined;
  Accept: undefined;
  Session: undefined;
};

type LandingScreenProps = NativeStackScreenProps<RootStackParamList, 'Landing'>;

const MENU_LINKS = [
  { label: 'About', url: 'https://chatorbit.com/about' },
  { label: 'FAQ', url: 'https://chatorbit.com/faq' },
  { label: 'Support', url: 'https://chatorbit.com/support' },
];

export const LandingScreen: React.FC<LandingScreenProps> = ({ navigation }) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const handleMintToken = () => {
    navigation.navigate('Mint');
  };

  const handleJoinSession = () => {
    navigation.navigate('Accept');
  };

  const handleMenuLink = (url: string) => {
    setMenuVisible(false);
    Linking.openURL(url);
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

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.heroSection}>
            <Text style={styles.headline}>
              Spin up a private two-person chat in seconds
            </Text>

            <View style={styles.buttonContainer}>
              <Button
                onPress={handleMintToken}
                variant="primary"
                fullWidth
              >
                Need token
              </Button>

              <Text style={styles.descriptionText}>
                Generate a shareable access token, send it to your contact, and meet in an ephemeral chat room. Once the second device connects a secure countdown begins—when it reaches zero the session closes itself.
              </Text>

              <Button
                onPress={handleJoinSession}
                variant="secondary"
                fullWidth
              >
                Have token
              </Button>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              End-to-end encrypted • Your privacy protected
            </Text>
          </View>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    justifyContent: 'center',
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 36,
  },
  buttonContainer: {
    gap: SPACING.lg,
  },
  descriptionText: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SPACING.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  footerText: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});
