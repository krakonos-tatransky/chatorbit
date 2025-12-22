/**
 * Typography System
 *
 * Font sizes, weights, and text style presets for ChatOrbit v2.
 * Designed for mobile-first readability and hierarchy.
 */

import type { TextStyle } from 'react-native';

/**
 * Font sizes
 */
export const FONT_SIZE = {
  /** Extra small text - 10px */
  xs: 10,
  /** Small text - 12px */
  sm: 12,
  /** Base/body text - 16px */
  base: 16,
  /** Medium text - 18px */
  md: 18,
  /** Large/header text - 20px */
  lg: 20,
  /** Extra large text - 24px */
  xl: 24,
  /** 2X large text - 28px */
  xxl: 28,
  /** 3X large text - 32px */
  xxxl: 32,
} as const;

/**
 * Font weights
 */
export const FONT_WEIGHT = {
  /** Regular - 400 */
  regular: '400' as TextStyle['fontWeight'],
  /** Medium - 500 */
  medium: '500' as TextStyle['fontWeight'],
  /** Semi-bold - 600 */
  semibold: '600' as TextStyle['fontWeight'],
  /** Bold - 700 */
  bold: '700' as TextStyle['fontWeight'],
} as const;

/**
 * Line heights (multipliers)
 */
export const LINE_HEIGHT = {
  /** Tight - 1.2 */
  tight: 1.2,
  /** Normal - 1.5 */
  normal: 1.5,
  /** Relaxed - 1.75 */
  relaxed: 1.75,
} as const;

/**
 * Text style presets
 * Use these for consistent typography across the app
 */
export const TEXT_STYLES = {
  /** Large header - 32px, bold */
  h1: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: FONT_SIZE.xxxl * LINE_HEIGHT.tight,
  } as TextStyle,

  /** Medium header - 28px, bold */
  h2: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: FONT_SIZE.xxl * LINE_HEIGHT.tight,
  } as TextStyle,

  /** Section header - 24px, semi-bold */
  h3: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: FONT_SIZE.xl * LINE_HEIGHT.tight,
  } as TextStyle,

  /** Component header - 20px, semi-bold */
  header: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: FONT_SIZE.lg * LINE_HEIGHT.normal,
  } as TextStyle,

  /** Subheader - 18px, medium */
  subheader: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: FONT_SIZE.md * LINE_HEIGHT.normal,
  } as TextStyle,

  /** Body text - 16px, regular */
  body: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.normal,
  } as TextStyle,

  /** Body text (medium weight) - 16px, medium */
  bodyMedium: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.normal,
  } as TextStyle,

  /** Small body text - 14px, regular */
  bodySmall: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: 14 * LINE_HEIGHT.normal,
  } as TextStyle,

  /** Caption text - 12px, regular */
  caption: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: FONT_SIZE.sm * LINE_HEIGHT.normal,
  } as TextStyle,

  /** Caption (medium weight) - 12px, medium */
  captionMedium: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: FONT_SIZE.sm * LINE_HEIGHT.normal,
  } as TextStyle,

  /** Tiny text - 10px, regular */
  tiny: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: FONT_SIZE.xs * LINE_HEIGHT.normal,
  } as TextStyle,

  /** Button text - 16px, semi-bold */
  button: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.tight,
  } as TextStyle,

  /** Link text - 16px, medium */
  link: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.normal,
    textDecorationLine: 'underline',
  } as TextStyle,
} as const;

/**
 * Complete typography system
 */
export const TYPOGRAPHY = {
  fontSize: FONT_SIZE,
  fontWeight: FONT_WEIGHT,
  lineHeight: LINE_HEIGHT,
  styles: TEXT_STYLES,
} as const;

export default TYPOGRAPHY;
