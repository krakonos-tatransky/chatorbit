/**
 * Help Screen
 *
 * Displays troubleshooting information for video calls.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

type HelpScreenProps = NativeStackScreenProps<RootStackParamList, 'Help'>;

export const HelpScreen: React.FC<HelpScreenProps> = ({ navigation }) => {
  const t = useTranslation();
  const currentPattern = useSettingsStore(selectBackgroundPattern);
  const currentSize = useSettingsStore(selectPatternSize);

  const handleBack = () => {
    navigation.goBack();
  };

  const renderSection = (
    sectionKey: 'iphone' | 'android' | 'desktop',
    iconName: 'phone-portrait' | 'logo-android' | 'desktop'
  ) => {
    const section = t.help.sections[sectionKey];
    return (
      <View key={sectionKey} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name={iconName} size={24} color={COLORS.accent.yellow} />
          <Text style={styles.cardTitle} maxFontSizeMultiplier={1.2}>{section.title}</Text>
        </View>
        <View style={styles.stepsList}>
          {section.steps.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText} maxFontSizeMultiplier={1}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText} maxFontSizeMultiplier={1.2}>{step}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <BackgroundPattern variant={currentPattern} patternSize={currentSize} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Header onBack={handleBack} />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text style={styles.pageTitle} maxFontSizeMultiplier={1.2}>{t.help.heading}</Text>
          <Text style={styles.intro} maxFontSizeMultiplier={1.2}>{t.help.intro}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>{t.help.troubleshootingTitle}</Text>
            <Text style={styles.sectionDescription} maxFontSizeMultiplier={1.2}>{t.help.troubleshootingDescription}</Text>
          </View>

          {renderSection('iphone', 'phone-portrait')}
          {renderSection('android', 'logo-android')}
          {renderSection('desktop', 'desktop')}
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
  intro: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TEXT_STYLES.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  sectionDescription: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(79, 195, 247, 0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.primary,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  stepsList: {
    gap: SPACING.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.background.primary,
  },
  stepText: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 22,
  },
});
