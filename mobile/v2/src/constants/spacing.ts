/**
 * Spacing System
 *
 * Consistent spacing scale for padding, margin, and layout.
 * Based on 4px grid system.
 */

/**
 * Base spacing scale
 */
export const SPACING = {
  /** Extra extra small - 2px */
  xxs: 2,
  /** Extra small - 4px */
  xs: 4,
  /** Small - 8px */
  sm: 8,
  /** Medium - 16px */
  md: 16,
  /** Large - 24px */
  lg: 24,
  /** Extra large - 32px */
  xl: 32,
  /** Extra extra large - 40px */
  xxl: 40,
  /** Extra extra extra large - 48px */
  xxxl: 48,
} as const;

/**
 * Border radius values
 */
export const RADIUS = {
  /** No radius */
  none: 0,
  /** Extra small radius - 2px */
  xs: 2,
  /** Small radius - 4px */
  sm: 4,
  /** Medium radius - 8px */
  md: 8,
  /** Large radius - 12px */
  lg: 12,
  /** Extra large radius - 16px */
  xl: 16,
  /** Extra extra large radius - 20px */
  xxl: 20,
  /** Full circle/pill */
  full: 9999,
} as const;

/**
 * Common layout measurements
 */
export const LAYOUT = {
  /** Header height */
  headerHeight: 60,
  /** Footer/input height */
  footerHeight: 72,
  /** Minimum touch target size */
  touchTarget: 44,
  /** Icon size small */
  iconSm: 16,
  /** Icon size medium */
  iconMd: 24,
  /** Icon size large */
  iconLg: 32,
  /** Avatar size small */
  avatarSm: 32,
  /** Avatar size medium */
  avatarMd: 40,
  /** Avatar size large */
  avatarLg: 56,
} as const;

/**
 * Container padding/margin presets
 */
export const CONTAINER = {
  /** Screen edge padding (horizontal) */
  screenPadding: SPACING.md,
  /** Card padding */
  cardPadding: SPACING.md,
  /** Section spacing (vertical) */
  sectionSpacing: SPACING.lg,
  /** Item spacing in lists */
  itemSpacing: SPACING.sm,
} as const;

/**
 * Complete spacing system
 */
export const SPACING_SYSTEM = {
  spacing: SPACING,
  radius: RADIUS,
  layout: LAYOUT,
  container: CONTAINER,
} as const;

export default SPACING_SYSTEM;
