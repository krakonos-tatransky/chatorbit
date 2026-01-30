/**
 * Terms Consent Modal Component
 *
 * Full-screen modal shown on first app launch requiring users to:
 * 1. Scroll through the entire Terms of Service
 * 2. Click AGREE to accept and proceed
 *
 * Consent is stored in AsyncStorage and only shown once.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { TEXT_STYLES } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Button } from './ui/Button';
import { useTranslation } from '../i18n';

// Tolerance in pixels for detecting scroll to bottom
const SCROLL_TOLERANCE_PX = 50;

interface TermsConsentModalProps {
  visible: boolean;
  onAgree: () => void;
  onCancel: () => void;
}

export const TermsConsentModal: React.FC<TermsConsentModalProps> = ({
  visible,
  onAgree,
  onCancel,
}) => {
  const t = useTranslation();
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;

    if (distanceFromBottom <= SCROLL_TOLERANCE_PX) {
      setHasScrolledToEnd(true);
    }
  }, []);

  // Reset scroll state when modal opens
  const handleModalShow = useCallback(() => {
    setHasScrolledToEnd(false);
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
      onShow={handleModalShow}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="document-text" size={32} color={COLORS.accent.yellow} />
          </View>
          <Text style={styles.title} maxFontSizeMultiplier={1}>
            {t.termsConsent.title}
          </Text>
          <Text style={styles.description} maxFontSizeMultiplier={1}>
            {t.termsConsent.description.replace('{date}', t.terms.lastUpdatedDate)}
          </Text>
        </View>

        {/* Scrollable Terms Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
        >
          {t.terms.sections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionTitle} maxFontSizeMultiplier={1}>
                {section.title}
              </Text>
              <Text style={styles.sectionBody} maxFontSizeMultiplier={1}>
                {section.body}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Footer with helper text and buttons */}
        <View style={styles.footer}>
          {!hasScrolledToEnd && (
            <View style={styles.helperContainer}>
              <Ionicons name="arrow-down" size={16} color={COLORS.accent.yellow} />
              <Text style={styles.helperText} maxFontSizeMultiplier={1}>
                {t.termsConsent.helper}
              </Text>
            </View>
          )}

          <View style={styles.buttonRow}>
            <Button
              onPress={onAgree}
              variant="primary"
              style={styles.agreeButton}
              disabled={!hasScrolledToEnd}
            >
              {t.termsConsent.agree}
            </Button>
            <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelText} maxFontSizeMultiplier={1}>
                {t.termsConsent.cancel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    ...TEXT_STYLES.h2,
    color: COLORS.accent.yellow,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  section: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.1)',
  },
  sectionTitle: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  sectionBody: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(2, 6, 23, 0.95)',
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  helperText: {
    ...TEXT_STYLES.caption,
    color: COLORS.accent.yellow,
  },
  buttonRow: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  agreeButton: {
    width: '100%',
  },
  cancelButton: {
    paddingVertical: SPACING.sm,
  },
  cancelText: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
  },
});
