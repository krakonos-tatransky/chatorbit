/**
 * Terms of Service Screen
 *
 * Displays the terms of service for ChatOrbit.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../constants/colors';
import { TEXT_STYLES } from '../constants/typography';
import { SPACING } from '../constants/spacing';
import { Header } from '../components/layout/Header';
import { BackgroundPattern } from '../components/ui';
import { useSettingsStore, selectBackgroundPattern, selectPatternSize } from '../state';
import { useTranslation } from '../i18n';

type RootStackParamList = {
  Main: undefined;
  Help: undefined;
  Terms: undefined;
  Privacy: undefined;
};

type TermsScreenProps = NativeStackScreenProps<RootStackParamList, 'Terms'>;

export const TermsScreen: React.FC<TermsScreenProps> = ({ navigation }) => {
  const t = useTranslation();
  const currentPattern = useSettingsStore(selectBackgroundPattern);
  const currentSize = useSettingsStore(selectPatternSize);

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <BackgroundPattern variant={currentPattern} patternSize={currentSize} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Header onBack={handleBack} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle} maxFontSizeMultiplier={1.2}>{t.terms.title}</Text>
        <Text style={styles.lastUpdated} maxFontSizeMultiplier={1.2}>
          {t.terms.lastUpdated.replace('{date}', t.terms.lastUpdatedDate)}
        </Text>

        {t.terms.sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>{section.title}</Text>
            <Text style={styles.sectionBody} maxFontSizeMultiplier={1.2}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText} maxFontSizeMultiplier={1.2}>
            legal@chatorbit.com
          </Text>
        </View>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  pageTitle: {
    ...TEXT_STYLES.h2,
    color: COLORS.accent.yellow,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  lastUpdated: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.disabled,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.lg,
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
    marginTop: SPACING.lg,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  footerText: {
    ...TEXT_STYLES.caption,
    color: COLORS.accent.yellow,
  },
});
