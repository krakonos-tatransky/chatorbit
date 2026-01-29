/**
 * Input Component
 *
 * Text input field with validation styling and label support.
 */

import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { COLORS, TEXT_STYLES, SPACING, RADIUS, LAYOUT } from '../../constants';

export interface InputProps extends TextInputProps {
  /** Input label */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Container style */
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  containerStyle,
  style,
  ...props
}) => {
  const hasError = Boolean(error);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TextInput
        style={[
          styles.input,
          hasError && styles.inputError,
          style,
        ]}
        placeholderTextColor={COLORS.text.disabled}
        {...props}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}
      {!error && helperText && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    ...TEXT_STYLES.bodyMedium,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  input: {
    ...TEXT_STYLES.body,
    height: LAYOUT.touchTarget,
    paddingHorizontal: SPACING.md,
    paddingVertical: 0,
    backgroundColor: COLORS.background.secondary,
    borderWidth: 2,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.lg,
    color: COLORS.text.primary,
    textAlignVertical: 'center',
  },
  inputError: {
    borderColor: COLORS.border.error,
  },
  errorText: {
    ...TEXT_STYLES.caption,
    color: COLORS.status.error,
    marginTop: SPACING.xs,
  },
  helperText: {
    ...TEXT_STYLES.caption,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
});

export default Input;
