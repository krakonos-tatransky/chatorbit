import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '../../constants/colors';
import { TEXT_STYLES } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';
import { Button } from '../ui/Button';

interface LandingContentProps {
  onNeedToken: () => void;
  onHaveToken: () => void;
}

export const LandingContent: React.FC<LandingContentProps> = ({
  onNeedToken,
  onHaveToken,
}) => {
  return (
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
            onPress={onNeedToken}
            variant="primary"
            fullWidth
          >
            Need token
          </Button>

          <Text style={styles.descriptionText}>
            Generate a shareable access token, send it to your contact, and meet in an ephemeral chat room. Once the second device connects a secure countdown begins—when it reaches zero the session closes itself.
          </Text>

          <Button
            onPress={onHaveToken}
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
