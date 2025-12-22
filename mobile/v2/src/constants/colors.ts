/**
 * Color Palette
 *
 * ChatOrbit v2 design system colors.
 * Deep blue backgrounds with yellow/orange accents.
 */

/**
 * Primary background colors
 */
export const BACKGROUND = {
  /** Primary background - Deep blue */
  primary: '#0A1929',
  /** Secondary background - Slightly lighter blue */
  secondary: '#132F4C',
  /** Tertiary background - Card/elevated surfaces */
  tertiary: '#1E3A5F',
} as const;

/**
 * Accent colors for actions and highlights
 */
export const ACCENT = {
  /** Primary accent - Yellow */
  yellow: '#FFCA28',
  /** Secondary accent - Orange */
  orange: '#FF9800',
  /** Hover/pressed state - Darker yellow */
  yellowDark: '#FFA000',
  /** Hover/pressed state - Darker orange */
  orangeDark: '#E65100',
} as const;

/**
 * Status indicator colors
 */
export const STATUS = {
  /** Connected/success state */
  success: '#4CAF50',
  /** Waiting/negotiating state */
  warning: '#FF9800',
  /** Error/disconnected state */
  error: '#F44336',
  /** Info state */
  info: '#2196F3',
} as const;

/**
 * Text colors
 */
export const TEXT = {
  /** Primary text - White */
  primary: '#FFFFFF',
  /** Secondary text - Light gray */
  secondary: '#B0BEC5',
  /** Disabled text */
  disabled: '#607D8B',
  /** Text on accent backgrounds */
  onAccent: '#000000',
} as const;

/**
 * Border and divider colors
 */
export const BORDER = {
  /** Default border */
  default: 'rgba(255, 255, 255, 0.12)',
  /** Focused border */
  focus: '#FFCA28',
  /** Error border */
  error: '#F44336',
} as const;

/**
 * Overlay colors (for modals, shadows, etc.)
 */
export const OVERLAY = {
  /** Modal backdrop */
  backdrop: 'rgba(0, 0, 0, 0.7)',
  /** Light overlay */
  light: 'rgba(255, 255, 255, 0.08)',
  /** Dark overlay */
  dark: 'rgba(0, 0, 0, 0.3)',
} as const;

/**
 * Complete color palette
 */
export const COLORS = {
  background: BACKGROUND,
  accent: ACCENT,
  status: STATUS,
  text: TEXT,
  border: BORDER,
  overlay: OVERLAY,
} as const;

/**
 * Flat color palette for convenience
 * Use this for direct access to colors without nesting
 */
export const FLAT_COLORS = {
  // Backgrounds
  deepBlue: BACKGROUND.primary,
  darkBlue: BACKGROUND.secondary,
  cardBlue: BACKGROUND.tertiary,

  // Accents
  yellow: ACCENT.yellow,
  orange: ACCENT.orange,
  yellowDark: ACCENT.yellowDark,
  orangeDark: ACCENT.orangeDark,

  // Status
  green: STATUS.success,
  red: STATUS.error,
  blue: STATUS.info,

  // Text
  white: TEXT.primary,
  gray: TEXT.secondary,
  grayDark: TEXT.disabled,
  black: TEXT.onAccent,

  // Special
  transparent: 'transparent',
} as const;

export default COLORS;
