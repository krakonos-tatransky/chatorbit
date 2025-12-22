/**
 * Button Component
 *
 * Primary UI button with multiple variants.
 * Supports primary (yellow), secondary (outlined), and text variants.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type TouchableOpacityProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { COLORS, TEXT_STYLES, SPACING, RADIUS, LAYOUT } from '../../constants';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'danger';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  /** Button content (text or icon) */
  children: React.ReactNode;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle[] = [
    styles.base,
    styles[variant],
    fullWidth ? styles.fullWidth : undefined,
    isDisabled ? styles.disabled : undefined,
    style,
  ].filter(Boolean) as ViewStyle[];

  const textStyles: TextStyle[] = [
    styles.textBase,
    styles[`${variant}Text` as keyof typeof styles] as TextStyle,
    isDisabled ? styles.disabledText : undefined,
    textStyle,
  ].filter(Boolean) as TextStyle[];

  return (
    <TouchableOpacity
      style={containerStyle}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? COLORS.text.onAccent : COLORS.accent.yellow}
        />
      ) : typeof children === 'string' ? (
        <Text style={textStyles}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: LAYOUT.touchTarget,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },

  // Variants
  primary: {
    backgroundColor: COLORS.accent.yellow,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.accent.yellow,
  },
  text: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: COLORS.status.error,
  },

  // Disabled state
  disabled: {
    opacity: 0.5,
  },

  // Text styles
  textBase: {
    ...TEXT_STYLES.button,
  },
  primaryText: {
    color: COLORS.text.onAccent,
  },
  secondaryText: {
    color: COLORS.accent.yellow,
  },
  textText: {
    color: COLORS.accent.yellow,
  },
  dangerText: {
    color: COLORS.text.primary,
  },
  disabledText: {
    opacity: 0.7,
  },
});

export default Button;
