/**
 * Settings Screen
 *
 * Allows users to customize app settings including background pattern.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Header } from '../components/layout/Header';
import { BackgroundPattern, PatternVariant } from '../components/ui';
import { useSettingsStore, selectBackgroundPattern, selectPatternSize, selectPatternOpacity } from '../state';
import { useTranslation } from '../i18n';
import { COLORS, SPACING, TEXT_STYLES, RADIUS } from '../constants';

type RootStackParamList = {
  Main: undefined;
  Settings: undefined;
};

type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const PATTERNS: { variant: PatternVariant; icon: string }[] = [
  { variant: 'logo', icon: 'shield-checkmark' },
  { variant: 'bubbles', icon: 'chatbubbles' },
  { variant: 'orbits', icon: 'planet' },
  { variant: 'hexagons', icon: 'grid' },
  { variant: 'waves', icon: 'water' },
  { variant: 'constellation', icon: 'star' },
  { variant: 'mesh', icon: 'git-network' },
  { variant: 'diamonds', icon: 'diamond' },
  { variant: 'shields', icon: 'shield' },
  { variant: 'circuits', icon: 'hardware-chip' },
  { variant: 'hologram', icon: 'scan' },
  { variant: 'panels', icon: 'apps' },
  { variant: 'scanlines', icon: 'barcode' },
  { variant: 'reactor', icon: 'nuclear' },
];

const PATTERN_SIZES = [60, 80, 100, 120, 150];

const OPACITY_LEVELS = [
  { value: 0.25, label: '25%' },
  { value: 0.50, label: '50%' },
  { value: 0.75, label: '75%' },
  { value: 1.00, label: '100%' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const t = useTranslation();
  const currentPattern = useSettingsStore(selectBackgroundPattern);
  const currentSize = useSettingsStore(selectPatternSize);
  const currentOpacity = useSettingsStore(selectPatternOpacity);
  const setBackgroundPattern = useSettingsStore((state) => state.setBackgroundPattern);
  const setPatternSize = useSettingsStore((state) => state.setPatternSize);
  const setPatternOpacity = useSettingsStore((state) => state.setPatternOpacity);

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Background pattern preview */}
      <BackgroundPattern variant={currentPattern} patternSize={currentSize} opacity={currentOpacity} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header onBack={handleBack} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Title */}
          <Text style={styles.title} maxFontSizeMultiplier={1.2}>{t.settings.title}</Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>{t.settings.subtitle}</Text>

          {/* Background Pattern Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>{t.settings.backgroundPattern}</Text>
            <Text style={styles.sectionDescription} maxFontSizeMultiplier={1.2}>
              {t.settings.backgroundPatternDescription}
            </Text>

            {/* Pattern Grid */}
            <View style={styles.patternGrid}>
              {PATTERNS.map((pattern) => (
                <TouchableOpacity
                  key={pattern.variant}
                  style={[
                    styles.patternOption,
                    currentPattern === pattern.variant && styles.patternOptionSelected,
                  ]}
                  onPress={() => setBackgroundPattern(pattern.variant)}
                  activeOpacity={0.7}
                >
                  <View style={styles.patternIconContainer}>
                    <Ionicons
                      name={pattern.icon as any}
                      size={28}
                      color={
                        currentPattern === pattern.variant
                          ? COLORS.accent.yellow
                          : COLORS.text.secondary
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.patternLabel,
                      currentPattern === pattern.variant && styles.patternLabelSelected,
                    ]}
                    maxFontSizeMultiplier={1.1}
                  >
                    {t.settings.patterns[pattern.variant]}
                  </Text>
                  {currentPattern === pattern.variant && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.accent.yellow} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pattern Size Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>{t.settings.patternSize}</Text>
            <Text style={styles.sectionDescription} maxFontSizeMultiplier={1.2}>
              {t.settings.patternSizeDescription}
            </Text>

            <View style={styles.sizeContainer}>
              {PATTERN_SIZES.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeOption,
                    currentSize === size && styles.sizeOptionSelected,
                  ]}
                  onPress={() => setPatternSize(size)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.sizeLabel,
                      currentSize === size && styles.sizeLabelSelected,
                    ]}
                    maxFontSizeMultiplier={1.1}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pattern Dimmer Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle} maxFontSizeMultiplier={1.2}>{t.settings.patternDimmer}</Text>
            <Text style={styles.sectionDescription} maxFontSizeMultiplier={1.2}>
              {t.settings.patternDimmerDescription}
            </Text>

            <View style={styles.sizeContainer}>
              {OPACITY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.sizeOption,
                    currentOpacity === level.value && styles.sizeOptionSelected,
                  ]}
                  onPress={() => setPatternOpacity(level.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.sizeLabel,
                      currentOpacity === level.value && styles.sizeLabelSelected,
                    ]}
                    maxFontSizeMultiplier={1.1}
                  >
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Info Text */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={COLORS.text.secondary} />
            <Text style={styles.infoText} maxFontSizeMultiplier={1.2}>{t.settings.infoText}</Text>
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
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  title: {
    ...TEXT_STYLES.h2,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xl,
  },
  section: {
    backgroundColor: COLORS.overlay.dark,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  sectionDescription: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
  },
  patternGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  patternOption: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  patternOptionSelected: {
    borderColor: COLORS.accent.yellow,
    backgroundColor: COLORS.background.tertiary,
  },
  patternIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  patternLabel: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  patternLabelSelected: {
    color: COLORS.accent.yellow,
  },
  checkmark: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
  },
  sizeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  sizeOption: {
    flex: 1,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sizeOptionSelected: {
    borderColor: COLORS.accent.yellow,
    backgroundColor: COLORS.background.tertiary,
  },
  sizeLabel: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.secondary,
  },
  sizeLabelSelected: {
    color: COLORS.accent.yellow,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.overlay.dark,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  infoText: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    flex: 1,
  },
});

export default SettingsScreen;
