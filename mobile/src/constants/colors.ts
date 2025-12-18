export const COLORS = {
  midnight: '#020B1F',
  abyss: '#041335',
  deepBlue: '#06255E',
  ocean: '#0A4A89',
  lagoon: '#0F6FBA',
  aurora: '#6FE7FF',
  ice: '#F4F9FF',
  mint: '#88E6FF',
  white: '#FFFFFF',
  glowSoft: 'rgba(4, 23, 60, 0.96)',
  glowWarm: 'rgba(9, 54, 120, 0.88)',
  glowEdge: 'rgba(111, 214, 255, 0.55)',
  cobaltShadow: 'rgba(3, 20, 46, 0.6)',
  danger: '#EF476F'
} as const;

export type ColorValues = typeof COLORS;
