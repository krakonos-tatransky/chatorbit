/**
 * BackgroundPattern Component
 *
 * Creates 3D embossed pattern backgrounds with ChatOrbit-inspired shapes.
 * Multiple pattern variants available for selection.
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, Pattern, Rect, Path, Circle, G } from 'react-native-svg';
import { COLORS } from '@/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 3D effect colors based on deep blue palette
const BASE_COLOR = '#0A1929';       // Primary deep blue
const HIGHLIGHT = '#1E4976';        // Light edge (top-left highlight)
const SHADOW = '#050D15';           // Dark edge (bottom-right shadow)
const MID_TONE = '#0F2540';         // Mid-tone for depth

export type PatternVariant = 'logo' | 'bubbles' | 'orbits' | 'hexagons' | 'waves';

interface BackgroundPatternProps {
  variant?: PatternVariant;
  patternSize?: number;
  opacity?: number;
}

/**
 * ChatOrbit Logo pattern - Simplified representation of the actual ChatOrbit brand logo
 * Features: Two mirrored chat bubbles facing each other, orbital ring, and padlock
 * The chat bubbles overlap in the center, creating the distinctive ChatOrbit look
 */
const LogoPattern: React.FC<{ size: number }> = ({ size }) => {
  // Center of pattern
  const cx = size * 0.5;
  const cy = size * 0.5;

  // Left chat bubble (facing right) - rounded rectangle with tail pointing right
  const leftBubblePath = `
    M${size * 0.12} ${size * 0.28}
    h${size * 0.32}
    q${size * 0.06} 0 ${size * 0.06} ${size * 0.06}
    v${size * 0.22}
    q0 ${size * 0.06} -${size * 0.06} ${size * 0.06}
    h-${size * 0.18}
    l${size * 0.06} ${size * 0.1}
    l-${size * 0.12} -${size * 0.1}
    h-${size * 0.08}
    q-${size * 0.06} 0 -${size * 0.06} -${size * 0.06}
    v-${size * 0.22}
    q0 -${size * 0.06} ${size * 0.06} -${size * 0.06}
    z
  `;

  // Right chat bubble (facing left, mirrored) - rounded rectangle with tail pointing left
  const rightBubblePath = `
    M${size * 0.88} ${size * 0.32}
    h-${size * 0.32}
    q-${size * 0.06} 0 -${size * 0.06} ${size * 0.06}
    v${size * 0.22}
    q0 ${size * 0.06} ${size * 0.06} ${size * 0.06}
    h${size * 0.18}
    l-${size * 0.06} ${size * 0.1}
    l${size * 0.12} -${size * 0.1}
    h${size * 0.08}
    q${size * 0.06} 0 ${size * 0.06} -${size * 0.06}
    v-${size * 0.22}
    q0 -${size * 0.06} -${size * 0.06} -${size * 0.06}
    z
  `;

  // Orbital ellipse path (tilted ring around the bubbles)
  const orbitRx = size * 0.42;
  const orbitRy = size * 0.22;

  return (
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="logo" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
          {/* Background */}
          <Rect x="0" y="0" width={size} height={size} fill={BASE_COLOR} />

          {/* Orbital ring - Shadow (behind everything) */}
          <G transform={`translate(2, 2) rotate(-15, ${cx}, ${cy})`}>
            <Path
              d={`M${cx - orbitRx} ${cy} a${orbitRx} ${orbitRy} 0 1 1 ${orbitRx * 2} 0 a${orbitRx} ${orbitRy} 0 1 1 -${orbitRx * 2} 0`}
              fill="none"
              stroke={SHADOW}
              strokeWidth={size * 0.035}
            />
          </G>
          {/* Orbital ring - Highlight */}
          <G transform={`translate(-1, -1) rotate(-15, ${cx}, ${cy})`}>
            <Path
              d={`M${cx - orbitRx} ${cy} a${orbitRx} ${orbitRy} 0 1 1 ${orbitRx * 2} 0 a${orbitRx} ${orbitRy} 0 1 1 -${orbitRx * 2} 0`}
              fill="none"
              stroke={HIGHLIGHT}
              strokeWidth={size * 0.035}
            />
          </G>
          {/* Orbital ring - Main */}
          <G transform={`rotate(-15, ${cx}, ${cy})`}>
            <Path
              d={`M${cx - orbitRx} ${cy} a${orbitRx} ${orbitRy} 0 1 1 ${orbitRx * 2} 0 a${orbitRx} ${orbitRy} 0 1 1 -${orbitRx * 2} 0`}
              fill="none"
              stroke={MID_TONE}
              strokeWidth={size * 0.022}
            />
          </G>

          {/* Right chat bubble (back, appears behind left) - Shadow */}
          <Path d={rightBubblePath} fill={SHADOW} transform="translate(2, 2)" />
          {/* Right chat bubble - Highlight */}
          <Path d={rightBubblePath} fill={HIGHLIGHT} transform="translate(-1, -1)" />
          {/* Right chat bubble - Main */}
          <Path d={rightBubblePath} fill={MID_TONE} />

          {/* Left chat bubble (front) - Shadow */}
          <Path d={leftBubblePath} fill={SHADOW} transform="translate(2, 2)" />
          {/* Left chat bubble - Highlight */}
          <Path d={leftBubblePath} fill={HIGHLIGHT} transform="translate(-1, -1)" />
          {/* Left chat bubble - Main */}
          <Path d={leftBubblePath} fill={MID_TONE} />

          {/* Padlock - centered at bottom */}
          {/* Padlock body - Shadow */}
          <Rect
            x={size * 0.38 + 2}
            y={size * 0.68 + 2}
            width={size * 0.24}
            height={size * 0.2}
            rx={size * 0.04}
            fill={SHADOW}
          />
          {/* Padlock body - Highlight */}
          <Rect
            x={size * 0.38 - 1}
            y={size * 0.68 - 1}
            width={size * 0.24}
            height={size * 0.2}
            rx={size * 0.04}
            fill={HIGHLIGHT}
          />
          {/* Padlock body - Main */}
          <Rect
            x={size * 0.38}
            y={size * 0.68}
            width={size * 0.24}
            height={size * 0.2}
            rx={size * 0.04}
            fill={MID_TONE}
          />

          {/* Padlock shackle - Shadow */}
          <Path
            d={`M${size * 0.43} ${size * 0.68}
                v-${size * 0.08}
                a${size * 0.07} ${size * 0.07} 0 0 1 ${size * 0.14} 0
                v${size * 0.08}`}
            fill="none"
            stroke={SHADOW}
            strokeWidth={size * 0.03}
            transform="translate(2, 2)"
          />
          {/* Padlock shackle - Highlight */}
          <Path
            d={`M${size * 0.43} ${size * 0.68}
                v-${size * 0.08}
                a${size * 0.07} ${size * 0.07} 0 0 1 ${size * 0.14} 0
                v${size * 0.08}`}
            fill="none"
            stroke={HIGHLIGHT}
            strokeWidth={size * 0.03}
            transform="translate(-1, -1)"
          />
          {/* Padlock shackle - Main */}
          <Path
            d={`M${size * 0.43} ${size * 0.68}
                v-${size * 0.08}
                a${size * 0.07} ${size * 0.07} 0 0 1 ${size * 0.14} 0
                v${size * 0.08}`}
            fill="none"
            stroke={MID_TONE}
            strokeWidth={size * 0.022}
          />

          {/* Keyhole on padlock */}
          <Circle cx={size * 0.5} cy={size * 0.75} r={size * 0.025} fill={HIGHLIGHT} />
          <Rect x={size * 0.485} y={size * 0.765} width={size * 0.03} height={size * 0.06} rx={size * 0.008} fill={HIGHLIGHT} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#logo)" />
    </Svg>
  );
};

/**
 * Chat bubble pattern - Two mirrored chat bubbles with 3D emboss effect
 */
const BubblesPattern: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
    <Defs>
      <Pattern id="bubbles" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
        {/* Background */}
        <Rect x="0" y="0" width={size} height={size} fill={BASE_COLOR} />

        {/* Left chat bubble - Shadow (bottom-right offset) */}
        <Path
          d={`M${size * 0.12} ${size * 0.22}
              h${size * 0.3}
              q${size * 0.06} 0 ${size * 0.06} ${size * 0.06}
              v${size * 0.2}
              q0 ${size * 0.06} -${size * 0.06} ${size * 0.06}
              h-${size * 0.2}
              l-${size * 0.08} ${size * 0.08}
              v-${size * 0.08}
              h-${size * 0.02}
              q-${size * 0.06} 0 -${size * 0.06} -${size * 0.06}
              v-${size * 0.2}
              q0 -${size * 0.06} ${size * 0.06} -${size * 0.06}z`}
          fill={SHADOW}
          transform={`translate(2, 2)`}
        />

        {/* Left chat bubble - Highlight (top-left offset) */}
        <Path
          d={`M${size * 0.12} ${size * 0.22}
              h${size * 0.3}
              q${size * 0.06} 0 ${size * 0.06} ${size * 0.06}
              v${size * 0.2}
              q0 ${size * 0.06} -${size * 0.06} ${size * 0.06}
              h-${size * 0.2}
              l-${size * 0.08} ${size * 0.08}
              v-${size * 0.08}
              h-${size * 0.02}
              q-${size * 0.06} 0 -${size * 0.06} -${size * 0.06}
              v-${size * 0.2}
              q0 -${size * 0.06} ${size * 0.06} -${size * 0.06}z`}
          fill={HIGHLIGHT}
          transform={`translate(-1, -1)`}
        />

        {/* Left chat bubble - Main */}
        <Path
          d={`M${size * 0.12} ${size * 0.22}
              h${size * 0.3}
              q${size * 0.06} 0 ${size * 0.06} ${size * 0.06}
              v${size * 0.2}
              q0 ${size * 0.06} -${size * 0.06} ${size * 0.06}
              h-${size * 0.2}
              l-${size * 0.08} ${size * 0.08}
              v-${size * 0.08}
              h-${size * 0.02}
              q-${size * 0.06} 0 -${size * 0.06} -${size * 0.06}
              v-${size * 0.2}
              q0 -${size * 0.06} ${size * 0.06} -${size * 0.06}z`}
          fill={MID_TONE}
        />

        {/* Right chat bubble (mirrored) - Shadow */}
        <Path
          d={`M${size * 0.88} ${size * 0.52}
              h-${size * 0.3}
              q-${size * 0.06} 0 -${size * 0.06} ${size * 0.06}
              v${size * 0.2}
              q0 ${size * 0.06} ${size * 0.06} ${size * 0.06}
              h${size * 0.2}
              l${size * 0.08} ${size * 0.08}
              v-${size * 0.08}
              h${size * 0.02}
              q${size * 0.06} 0 ${size * 0.06} -${size * 0.06}
              v-${size * 0.2}
              q0 -${size * 0.06} -${size * 0.06} -${size * 0.06}z`}
          fill={SHADOW}
          transform={`translate(2, 2)`}
        />

        {/* Right chat bubble - Highlight */}
        <Path
          d={`M${size * 0.88} ${size * 0.52}
              h-${size * 0.3}
              q-${size * 0.06} 0 -${size * 0.06} ${size * 0.06}
              v${size * 0.2}
              q0 ${size * 0.06} ${size * 0.06} ${size * 0.06}
              h${size * 0.2}
              l${size * 0.08} ${size * 0.08}
              v-${size * 0.08}
              h${size * 0.02}
              q${size * 0.06} 0 ${size * 0.06} -${size * 0.06}
              v-${size * 0.2}
              q0 -${size * 0.06} -${size * 0.06} -${size * 0.06}z`}
          fill={HIGHLIGHT}
          transform={`translate(-1, -1)`}
        />

        {/* Right chat bubble - Main */}
        <Path
          d={`M${size * 0.88} ${size * 0.52}
              h-${size * 0.3}
              q-${size * 0.06} 0 -${size * 0.06} ${size * 0.06}
              v${size * 0.2}
              q0 ${size * 0.06} ${size * 0.06} ${size * 0.06}
              h${size * 0.2}
              l${size * 0.08} ${size * 0.08}
              v-${size * 0.08}
              h${size * 0.02}
              q${size * 0.06} 0 ${size * 0.06} -${size * 0.06}
              v-${size * 0.2}
              q0 -${size * 0.06} -${size * 0.06} -${size * 0.06}z`}
          fill={MID_TONE}
        />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#bubbles)" />
  </Svg>
);

/**
 * Orbital rings pattern - Concentric circles with 3D depth
 */
const OrbitsPattern: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
    <Defs>
      <Pattern id="orbits" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
        <Rect x="0" y="0" width={size} height={size} fill={BASE_COLOR} />

        {/* Outer ring - shadow */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.38}
          fill="none"
          stroke={SHADOW}
          strokeWidth={size * 0.06}
          transform={`translate(1.5, 1.5)`}
        />
        {/* Outer ring - highlight */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.38}
          fill="none"
          stroke={HIGHLIGHT}
          strokeWidth={size * 0.06}
          transform={`translate(-1, -1)`}
        />
        {/* Outer ring - main */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.38}
          fill="none"
          stroke={MID_TONE}
          strokeWidth={size * 0.04}
        />

        {/* Inner ring - shadow */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.22}
          fill="none"
          stroke={SHADOW}
          strokeWidth={size * 0.04}
          transform={`translate(1, 1)`}
        />
        {/* Inner ring - highlight */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.22}
          fill="none"
          stroke={HIGHLIGHT}
          strokeWidth={size * 0.04}
          transform={`translate(-0.5, -0.5)`}
        />
        {/* Inner ring - main */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.22}
          fill="none"
          stroke={MID_TONE}
          strokeWidth={size * 0.025}
        />

        {/* Center dot */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.06}
          fill={MID_TONE}
        />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#orbits)" />
  </Svg>
);

/**
 * Hexagon pattern - Honeycomb with 3D emboss
 */
const HexagonsPattern: React.FC<{ size: number }> = ({ size }) => {
  const hexWidth = size;
  const hexHeight = size * 0.866; // height of regular hexagon

  return (
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="hexagons" x="0" y="0" width={size * 1.5} height={hexHeight * 2} patternUnits="userSpaceOnUse">
          <Rect x="0" y="0" width={size * 1.5} height={hexHeight * 2} fill={BASE_COLOR} />

          {/* Hexagon function points */}
          {[
            { x: size * 0.5, y: hexHeight * 0.5 },
            { x: size * 1.25, y: hexHeight * 1.5 },
          ].map((pos, i) => {
            const hexPath = `M${pos.x} ${pos.y - size * 0.3}
              l${size * 0.26} ${size * 0.15}
              l0 ${size * 0.3}
              l-${size * 0.26} ${size * 0.15}
              l-${size * 0.26} -${size * 0.15}
              l0 -${size * 0.3}z`;

            return (
              <G key={i}>
                {/* Shadow */}
                <Path d={hexPath} fill={SHADOW} transform="translate(2, 2)" />
                {/* Highlight */}
                <Path d={hexPath} fill={HIGHLIGHT} transform="translate(-1, -1)" />
                {/* Main */}
                <Path d={hexPath} fill={MID_TONE} />
              </G>
            );
          })}
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#hexagons)" />
    </Svg>
  );
};

/**
 * Wave pattern - Flowing curves with 3D depth
 */
const WavesPattern: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
    <Defs>
      <Pattern id="waves" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
        <Rect x="0" y="0" width={size} height={size} fill={BASE_COLOR} />

        {/* Wave 1 - Shadow */}
        <Path
          d={`M0 ${size * 0.3}
              Q${size * 0.25} ${size * 0.15} ${size * 0.5} ${size * 0.3}
              T${size} ${size * 0.3}`}
          fill="none"
          stroke={SHADOW}
          strokeWidth={size * 0.08}
          transform="translate(1.5, 1.5)"
        />
        {/* Wave 1 - Highlight */}
        <Path
          d={`M0 ${size * 0.3}
              Q${size * 0.25} ${size * 0.15} ${size * 0.5} ${size * 0.3}
              T${size} ${size * 0.3}`}
          fill="none"
          stroke={HIGHLIGHT}
          strokeWidth={size * 0.08}
          transform="translate(-1, -1)"
        />
        {/* Wave 1 - Main */}
        <Path
          d={`M0 ${size * 0.3}
              Q${size * 0.25} ${size * 0.15} ${size * 0.5} ${size * 0.3}
              T${size} ${size * 0.3}`}
          fill="none"
          stroke={MID_TONE}
          strokeWidth={size * 0.05}
        />

        {/* Wave 2 - Shadow */}
        <Path
          d={`M0 ${size * 0.7}
              Q${size * 0.25} ${size * 0.55} ${size * 0.5} ${size * 0.7}
              T${size} ${size * 0.7}`}
          fill="none"
          stroke={SHADOW}
          strokeWidth={size * 0.06}
          transform="translate(1.5, 1.5)"
        />
        {/* Wave 2 - Highlight */}
        <Path
          d={`M0 ${size * 0.7}
              Q${size * 0.25} ${size * 0.55} ${size * 0.5} ${size * 0.7}
              T${size} ${size * 0.7}`}
          fill="none"
          stroke={HIGHLIGHT}
          strokeWidth={size * 0.06}
          transform="translate(-1, -1)"
        />
        {/* Wave 2 - Main */}
        <Path
          d={`M0 ${size * 0.7}
              Q${size * 0.25} ${size * 0.55} ${size * 0.5} ${size * 0.7}
              T${size} ${size * 0.7}`}
          fill="none"
          stroke={MID_TONE}
          strokeWidth={size * 0.04}
        />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#waves)" />
  </Svg>
);

/**
 * BackgroundPattern component
 */
export const BackgroundPattern: React.FC<BackgroundPatternProps> = ({
  variant = 'bubbles',
  patternSize = 100,
  opacity = 1,
}) => {
  const renderPattern = () => {
    switch (variant) {
      case 'logo':
        return <LogoPattern size={patternSize} />;
      case 'bubbles':
        return <BubblesPattern size={patternSize} />;
      case 'orbits':
        return <OrbitsPattern size={patternSize} />;
      case 'hexagons':
        return <HexagonsPattern size={patternSize} />;
      case 'waves':
        return <WavesPattern size={patternSize} />;
      default:
        return <LogoPattern size={patternSize} />;
    }
  };

  return (
    <View style={[styles.container, { opacity }]}>
      {renderPattern()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background.primary,
  },
});

export default BackgroundPattern;
