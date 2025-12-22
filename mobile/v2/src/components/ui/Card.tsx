/**
 * Card Component
 *
 * Container component for grouping related content.
 * Provides elevation, padding, and consistent styling.
 */

import React from 'react';
import { View, StyleSheet, type ViewProps, type ViewStyle } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants';

export interface CardProps extends ViewProps {
  /** Card content */
  children: React.ReactNode;
  /** Custom padding (overrides default) */
  padding?: number;
  /** No padding */
  noPadding?: boolean;
  /** Custom container style */
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding,
  noPadding = false,
  style,
  ...props
}) => {
  const paddingStyle = noPadding
    ? undefined
    : { padding: padding ?? SPACING.md };

  return (
    <View style={[styles.card, paddingStyle, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background.secondary,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border.default,
  },
});

export default Card;
