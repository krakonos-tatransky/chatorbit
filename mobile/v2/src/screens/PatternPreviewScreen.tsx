/**
 * Pattern Preview Screen
 *
 * Preview all background pattern variants to choose the best one.
 * This is a temporary screen for pattern selection.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackgroundPattern, PatternVariant } from '@/components/ui';
import { COLORS, SPACING, TEXT_STYLES, RADIUS } from '@/constants';

const PATTERNS: { variant: PatternVariant; name: string; description: string }[] = [
  {
    variant: 'logo',
    name: 'ChatOrbit Logo',
    description: 'Full logo: bubbles + orbit + padlock',
  },
  {
    variant: 'bubbles',
    name: 'Chat Bubbles',
    description: 'Mirrored chat bubbles with 3D emboss effect',
  },
  {
    variant: 'orbits',
    name: 'Orbital Rings',
    description: 'Concentric circles representing orbital paths',
  },
  {
    variant: 'hexagons',
    name: 'Honeycomb',
    description: 'Hexagonal grid with depth effect',
  },
  {
    variant: 'waves',
    name: 'Flowing Waves',
    description: 'Smooth wave curves with 3D depth',
  },
];

export const PatternPreviewScreen: React.FC = () => {
  const [selectedPattern, setSelectedPattern] = useState<PatternVariant>('logo');
  const [patternSize, setPatternSize] = useState(100);

  return (
    <View style={styles.container}>
      {/* Background pattern preview */}
      <BackgroundPattern variant={selectedPattern} patternSize={patternSize} />

      {/* Controls overlay */}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <Text style={styles.title}>Background Pattern Preview</Text>

        {/* Pattern selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.patternSelector}
          contentContainerStyle={styles.patternSelectorContent}
        >
          {PATTERNS.map((pattern) => (
            <TouchableOpacity
              key={pattern.variant}
              style={[
                styles.patternOption,
                selectedPattern === pattern.variant && styles.patternOptionSelected,
              ]}
              onPress={() => setSelectedPattern(pattern.variant)}
            >
              <Text
                style={[
                  styles.patternName,
                  selectedPattern === pattern.variant && styles.patternNameSelected,
                ]}
              >
                {pattern.name}
              </Text>
              <Text style={styles.patternDescription}>{pattern.description}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Size controls */}
        <View style={styles.sizeControls}>
          <Text style={styles.sizeLabel}>Pattern Size: {patternSize}px</Text>
          <View style={styles.sizeButtons}>
            {[60, 80, 100, 120, 150].map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.sizeButton,
                  patternSize === size && styles.sizeButtonSelected,
                ]}
                onPress={() => setPatternSize(size)}
              >
                <Text
                  style={[
                    styles.sizeButtonText,
                    patternSize === size && styles.sizeButtonTextSelected,
                  ]}
                >
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Current selection info */}
        <View style={styles.info}>
          <Text style={styles.infoText}>
            Selected: {PATTERNS.find((p) => p.variant === selectedPattern)?.name}
          </Text>
          <Text style={styles.infoSubtext}>
            Use BackgroundPattern variant="{selectedPattern}" patternSize={'{'}
            {patternSize}
            {'}'}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  overlay: {
    flex: 1,
    padding: SPACING.md,
  },
  title: {
    ...TEXT_STYLES.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.overlay.dark,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  patternSelector: {
    maxHeight: 120,
    marginBottom: SPACING.lg,
  },
  patternSelectorContent: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  patternOption: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    minWidth: 150,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  patternOptionSelected: {
    borderColor: COLORS.accent.yellow,
    backgroundColor: COLORS.background.tertiary,
  },
  patternName: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  patternNameSelected: {
    color: COLORS.accent.yellow,
  },
  patternDescription: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
  },
  sizeControls: {
    backgroundColor: COLORS.overlay.dark,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sizeLabel: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  sizeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  sizeButton: {
    backgroundColor: COLORS.background.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border.default,
  },
  sizeButtonSelected: {
    backgroundColor: COLORS.accent.yellow,
    borderColor: COLORS.accent.yellow,
  },
  sizeButtonText: {
    ...TEXT_STYLES.body,
    color: COLORS.text.primary,
  },
  sizeButtonTextSelected: {
    color: COLORS.text.onAccent,
  },
  info: {
    marginTop: 'auto',
    backgroundColor: COLORS.overlay.dark,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  infoText: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.accent.yellow,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  infoSubtext: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});

export default PatternPreviewScreen;
