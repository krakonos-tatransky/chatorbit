import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { TEXT_STYLES } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';

const LogoImage = require('../../../assets/splash-icon.png');

const MENU_LINKS = [
  { label: 'Help & FAQ', url: 'https://chatorbit.com/help' },
  { label: 'Privacy Policy', url: 'https://chatorbit.com/privacy-policy' },
  { label: 'Terms of Service', url: 'https://chatorbit.com/terms-of-service' },
];

interface HeaderProps {
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onBack }) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const handleMenuLink = (url: string) => {
    setMenuVisible(false);
    Linking.openURL(url);
  };

  return (
    <>
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          {onBack ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={28} color={COLORS.text.primary} />
            </TouchableOpacity>
          ) : (
            <Image source={LogoImage} style={styles.headerLogo} resizeMode="contain" />
          )}
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
    </>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 56,
    height: 56,
    marginRight: SPACING.sm,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.xs,
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
});
