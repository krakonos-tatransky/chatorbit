/**
 * Accept Screen
 *
 * Entry screen for joining a session with a token.
 * Users paste a 32-character UUID token to join a chat session.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, Card } from '@/components/ui';
import { COLORS, SPACING, TEXT_STYLES } from '@/constants';
import { useSessionStore } from '@/state';
import { getDeviceId } from '@/utils/deviceId';

const LogoImage = require('../../assets/splash-icon.png');

const MENU_LINKS = [
  { label: 'About', url: 'https://chatorbit.com/about' },
  { label: 'FAQ', url: 'https://chatorbit.com/faq' },
  { label: 'Support', url: 'https://chatorbit.com/support' },
];

type RootStackParamList = {
  Accept: undefined;
  Session: undefined;
};

type AcceptScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Accept'
>;

interface AcceptScreenProps {
  navigation: AcceptScreenNavigationProp;
}

export const AcceptScreen: React.FC<AcceptScreenProps> = ({ navigation }) => {
  const [token, setToken] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const { joinSession, isJoining, error } = useSessionStore();

  const handleMenuLink = (url: string) => {
    setMenuVisible(false);
    Linking.openURL(url);
  };

  const handleJoin = async () => {
    // Validate token (UUID hex = 32 characters)
    const trimmedToken = token.trim().toLowerCase();
    if (trimmedToken.length !== 32) {
      Alert.alert('Invalid Token', 'Please paste a valid 32-character token');
      return;
    }

    try {
      // Join session with unique device ID
      const deviceId = await getDeviceId();
      await joinSession(trimmedToken, null, deviceId);

      // Navigate to session screen
      navigation.navigate('Session');
    } catch (error) {
      console.error('Failed to join session:', error);
      Alert.alert(
        'Join Failed',
        error instanceof Error ? error.message : 'Failed to join session'
      );
    }
  };

  const handleTokenChange = (text: string) => {
    // Accept lowercase hex characters, strip whitespace, limit to 32 chars
    const formatted = text.toLowerCase().replace(/\s/g, '').slice(0, 32);
    setToken(formatted);
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

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >

        {/* Token Input Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Join with an existing token</Text>
          <Text style={styles.cardDescription}>
            Paste the token you received. Once two devices join the same token the session starts immediately and no other logins are permitted.
          </Text>

          <Input
            placeholder="Paste token here"
            value={token}
            onChangeText={handleTokenChange}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={32}
            error={error || undefined}
            style={styles.input}
          />

          <Button
            onPress={handleJoin}
            loading={isJoining}
            disabled={token.length !== 32}
            fullWidth
            style={styles.button}
          >
            Join Session
          </Button>
        </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Mobile-to-Mobile • End-to-End Encrypted
            </Text>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    justifyContent: 'center',
  },
  card: {
    marginBottom: SPACING.xl,
  },
  cardTitle: {
    ...TEXT_STYLES.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  cardDescription: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  input: {
    fontSize: 14,
    fontFamily: 'JetBrainsMono',
    textAlign: 'center',
    letterSpacing: 1,
  },
  button: {
    marginTop: SPACING.md,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.disabled,
  },
});
