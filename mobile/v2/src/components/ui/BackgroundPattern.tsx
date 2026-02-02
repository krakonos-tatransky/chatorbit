/**
 * BackgroundPattern Component
 *
 * Creates 3D embossed pattern backgrounds with ChatOrbit-inspired shapes.
 * Multiple pattern variants available for selection.
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, Pattern, Rect, Path, Circle, G, Line, LinearGradient as SvgLinearGradient, Stop, Ellipse } from 'react-native-svg';
import { COLORS } from '@/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 3D effect colors based on deep blue palette
const BASE_COLOR = '#0A1929';       // Primary deep blue
const HIGHLIGHT = '#1E4976';        // Light edge (top-left highlight)
const SHADOW = '#050D15';           // Dark edge (bottom-right shadow)
const MID_TONE = '#0F2540';         // Mid-tone for depth

// Sci-fi glow colors (The Expanse style)
const GLOW_CYAN = '#00D4FF';        // Bright cyan for highlights
const GLOW_BLUE = '#0088CC';        // Medium blue glow
const GLOW_DIM = '#004466';         // Dimmer glow
const PANEL_DARK = '#061322';       // Very dark panel background
const PANEL_EDGE = '#0A3D62';       // Panel edge color

export type PatternVariant =
  | 'logo'
  | 'bubbles'
  | 'orbits'
  | 'hexagons'
  | 'waves'
  | 'constellation'
  | 'mesh'
  | 'diamonds'
  | 'shields'
  | 'circuits'
  | 'hologram'
  | 'panels'
  | 'scanlines'
  | 'reactor';

interface BackgroundPatternProps {
  variant?: PatternVariant;
  patternSize?: number;
  opacity?: number;
}

/**
 * ChatOrbit Logo pattern
 */
const LogoPattern: React.FC<{ size: number }> = ({ size }) => {
  const cx = size * 0.5;
  const cy = size * 0.5;

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

  const orbitRx = size * 0.42;
  const orbitRy = size * 0.22;

  return (
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="logo" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
          <Rect x="0" y="0" width={size} height={size} fill={BASE_COLOR} />
          <G transform={`translate(2, 2) rotate(-15, ${cx}, ${cy})`}>
            <Path d={`M${cx - orbitRx} ${cy} a${orbitRx} ${orbitRy} 0 1 1 ${orbitRx * 2} 0 a${orbitRx} ${orbitRy} 0 1 1 -${orbitRx * 2} 0`} fill="none" stroke={SHADOW} strokeWidth={size * 0.035} />
          </G>
          <G transform={`translate(-1, -1) rotate(-15, ${cx}, ${cy})`}>
            <Path d={`M${cx - orbitRx} ${cy} a${orbitRx} ${orbitRy} 0 1 1 ${orbitRx * 2} 0 a${orbitRx} ${orbitRy} 0 1 1 -${orbitRx * 2} 0`} fill="none" stroke={HIGHLIGHT} strokeWidth={size * 0.035} />
          </G>
          <G transform={`rotate(-15, ${cx}, ${cy})`}>
            <Path d={`M${cx - orbitRx} ${cy} a${orbitRx} ${orbitRy} 0 1 1 ${orbitRx * 2} 0 a${orbitRx} ${orbitRy} 0 1 1 -${orbitRx * 2} 0`} fill="none" stroke={MID_TONE} strokeWidth={size * 0.022} />
          </G>
          <Path d={rightBubblePath} fill={SHADOW} transform="translate(2, 2)" />
          <Path d={rightBubblePath} fill={HIGHLIGHT} transform="translate(-1, -1)" />
          <Path d={rightBubblePath} fill={MID_TONE} />
          <Path d={leftBubblePath} fill={SHADOW} transform="translate(2, 2)" />
          <Path d={leftBubblePath} fill={HIGHLIGHT} transform="translate(-1, -1)" />
          <Path d={leftBubblePath} fill={MID_TONE} />
          <Rect x={size * 0.38 + 2} y={size * 0.68 + 2} width={size * 0.24} height={size * 0.2} rx={size * 0.04} fill={SHADOW} />
          <Rect x={size * 0.38 - 1} y={size * 0.68 - 1} width={size * 0.24} height={size * 0.2} rx={size * 0.04} fill={HIGHLIGHT} />
          <Rect x={size * 0.38} y={size * 0.68} width={size * 0.24} height={size * 0.2} rx={size * 0.04} fill={MID_TONE} />
          <Path d={`M${size * 0.43} ${size * 0.68} v-${size * 0.08} a${size * 0.07} ${size * 0.07} 0 0 1 ${size * 0.14} 0 v${size * 0.08}`} fill="none" stroke={SHADOW} strokeWidth={size * 0.03} transform="translate(2, 2)" />
          <Path d={`M${size * 0.43} ${size * 0.68} v-${size * 0.08} a${size * 0.07} ${size * 0.07} 0 0 1 ${size * 0.14} 0 v${size * 0.08}`} fill="none" stroke={HIGHLIGHT} strokeWidth={size * 0.03} transform="translate(-1, -1)" />
          <Path d={`M${size * 0.43} ${size * 0.68} v-${size * 0.08} a${size * 0.07} ${size * 0.07} 0 0 1 ${size * 0.14} 0 v${size * 0.08}`} fill="none" stroke={MID_TONE} strokeWidth={size * 0.022} />
          <Circle cx={size * 0.5} cy={size * 0.75} r={size * 0.025} fill={HIGHLIGHT} />
          <Rect x={size * 0.485} y={size * 0.765} width={size * 0.03} height={size * 0.06} rx={size * 0.008} fill={HIGHLIGHT} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#logo)" />
    </Svg>
  );
};

/**
 * Chat bubble pattern
 */
const BubblesPattern: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
    <Defs>
      <Pattern id="bubbles" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
        <Rect x="0" y="0" width={size} height={size} fill={BASE_COLOR} />
        <Path d={`M${size * 0.12} ${size * 0.22} h${size * 0.3} q${size * 0.06} 0 ${size * 0.06} ${size * 0.06} v${size * 0.2} q0 ${size * 0.06} -${size * 0.06} ${size * 0.06} h-${size * 0.2} l-${size * 0.08} ${size * 0.08} v-${size * 0.08} h-${size * 0.02} q-${size * 0.06} 0 -${size * 0.06} -${size * 0.06} v-${size * 0.2} q0 -${size * 0.06} ${size * 0.06} -${size * 0.06}z`} fill={SHADOW} transform="translate(2, 2)" />
        <Path d={`M${size * 0.12} ${size * 0.22} h${size * 0.3} q${size * 0.06} 0 ${size * 0.06} ${size * 0.06} v${size * 0.2} q0 ${size * 0.06} -${size * 0.06} ${size * 0.06} h-${size * 0.2} l-${size * 0.08} ${size * 0.08} v-${size * 0.08} h-${size * 0.02} q-${size * 0.06} 0 -${size * 0.06} -${size * 0.06} v-${size * 0.2} q0 -${size * 0.06} ${size * 0.06} -${size * 0.06}z`} fill={HIGHLIGHT} transform="translate(-1, -1)" />
        <Path d={`M${size * 0.12} ${size * 0.22} h${size * 0.3} q${size * 0.06} 0 ${size * 0.06} ${size * 0.06} v${size * 0.2} q0 ${size * 0.06} -${size * 0.06} ${size * 0.06} h-${size * 0.2} l-${size * 0.08} ${size * 0.08} v-${size * 0.08} h-${size * 0.02} q-${size * 0.06} 0 -${size * 0.06} -${size * 0.06} v-${size * 0.2} q0 -${size * 0.06} ${size * 0.06} -${size * 0.06}z`} fill={MID_TONE} />
        <Path d={`M${size * 0.88} ${size * 0.52} h-${size * 0.3} q-${size * 0.06} 0 -${size * 0.06} ${size * 0.06} v${size * 0.2} q0 ${size * 0.06} ${size * 0.06} ${size * 0.06} h${size * 0.2} l${size * 0.08} ${size * 0.08} v-${size * 0.08} h${size * 0.02} q${size * 0.06} 0 ${size * 0.06} -${size * 0.06} v-${size * 0.2} q0 -${size * 0.06} -${size * 0.06} -${size * 0.06}z`} fill={SHADOW} transform="translate(2, 2)" />
        <Path d={`M${size * 0.88} ${size * 0.52} h-${size * 0.3} q-${size * 0.06} 0 -${size * 0.06} ${size * 0.06} v${size * 0.2} q0 ${size * 0.06} ${size * 0.06} ${size * 0.06} h${size * 0.2} l${size * 0.08} ${size * 0.08} v-${size * 0.08} h${size * 0.02} q${size * 0.06} 0 ${size * 0.06} -${size * 0.06} v-${size * 0.2} q0 -${size * 0.06} -${size * 0.06} -${size * 0.06}z`} fill={HIGHLIGHT} transform="translate(-1, -1)" />
        <Path d={`M${size * 0.88} ${size * 0.52} h-${size * 0.3} q-${size * 0.06} 0 -${size * 0.06} ${size * 0.06} v${size * 0.2} q0 ${size * 0.06} ${size * 0.06} ${size * 0.06} h${size * 0.2} l${size * 0.08} ${size * 0.08} v-${size * 0.08} h${size * 0.02} q${size * 0.06} 0 ${size * 0.06} -${size * 0.06} v-${size * 0.2} q0 -${size * 0.06} -${size * 0.06} -${size * 0.06}z`} fill={MID_TONE} />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#bubbles)" />
  </Svg>
);

/**
 * Orbital rings pattern
 */
const OrbitsPattern: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
    <Defs>
      <Pattern id="orbits" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
        <Rect x="0" y="0" width={size} height={size} fill={BASE_COLOR} />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.38} fill="none" stroke={SHADOW} strokeWidth={size * 0.06} transform="translate(1.5, 1.5)" />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.38} fill="none" stroke={HIGHLIGHT} strokeWidth={size * 0.06} transform="translate(-1, -1)" />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.38} fill="none" stroke={MID_TONE} strokeWidth={size * 0.04} />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.22} fill="none" stroke={SHADOW} strokeWidth={size * 0.04} transform="translate(1, 1)" />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.22} fill="none" stroke={HIGHLIGHT} strokeWidth={size * 0.04} transform="translate(-0.5, -0.5)" />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.22} fill="none" stroke={MID_TONE} strokeWidth={size * 0.025} />
        <Circle cx={size / 2} cy={size / 2} r={size * 0.06} fill={MID_TONE} />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#orbits)" />
  </Svg>
);

/**
 * Hexagon pattern
 */
const HexagonsPattern: React.FC<{ size: number }> = ({ size }) => {
  const hexHeight = size * 0.866;
  return (
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="hexagons" x="0" y="0" width={size * 1.5} height={hexHeight * 2} patternUnits="userSpaceOnUse">
          <Rect x="0" y="0" width={size * 1.5} height={hexHeight * 2} fill={BASE_COLOR} />
          {[{ x: size * 0.5, y: hexHeight * 0.5 }, { x: size * 1.25, y: hexHeight * 1.5 }].map((pos, i) => {
            const hexPath = `M${pos.x} ${pos.y - size * 0.3} l${size * 0.26} ${size * 0.15} l0 ${size * 0.3} l-${size * 0.26} ${size * 0.15} l-${size * 0.26} -${size * 0.15} l0 -${size * 0.3}z`;
            return (
              <G key={i}>
                <Path d={hexPath} fill={SHADOW} transform="translate(2, 2)" />
                <Path d={hexPath} fill={HIGHLIGHT} transform="translate(-1, -1)" />
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
 * Wave pattern
 */
const WavesPattern: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
    <Defs>
      <Pattern id="waves" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
        <Rect x="0" y="0" width={size} height={size} fill={BASE_COLOR} />
        <Path d={`M0 ${size * 0.3} Q${size * 0.25} ${size * 0.15} ${size * 0.5} ${size * 0.3} T${size} ${size * 0.3}`} fill="none" stroke={SHADOW} strokeWidth={size * 0.08} transform="translate(1.5, 1.5)" />
        <Path d={`M0 ${size * 0.3} Q${size * 0.25} ${size * 0.15} ${size * 0.5} ${size * 0.3} T${size} ${size * 0.3}`} fill="none" stroke={HIGHLIGHT} strokeWidth={size * 0.08} transform="translate(-1, -1)" />
        <Path d={`M0 ${size * 0.3} Q${size * 0.25} ${size * 0.15} ${size * 0.5} ${size * 0.3} T${size} ${size * 0.3}`} fill="none" stroke={MID_TONE} strokeWidth={size * 0.05} />
        <Path d={`M0 ${size * 0.7} Q${size * 0.25} ${size * 0.55} ${size * 0.5} ${size * 0.7} T${size} ${size * 0.7}`} fill="none" stroke={SHADOW} strokeWidth={size * 0.06} transform="translate(1.5, 1.5)" />
        <Path d={`M0 ${size * 0.7} Q${size * 0.25} ${size * 0.55} ${size * 0.5} ${size * 0.7} T${size} ${size * 0.7}`} fill="none" stroke={HIGHLIGHT} strokeWidth={size * 0.06} transform="translate(-1, -1)" />
        <Path d={`M0 ${size * 0.7} Q${size * 0.25} ${size * 0.55} ${size * 0.5} ${size * 0.7} T${size} ${size * 0.7}`} fill="none" stroke={MID_TONE} strokeWidth={size * 0.04} />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#waves)" />
  </Svg>
);

/**
 * Constellation pattern
 */
const ConstellationPattern: React.FC<{ size: number }> = ({ size }) => {
  const stars = [
    { x: size * 0.15, y: size * 0.2 }, { x: size * 0.4, y: size * 0.1 }, { x: size * 0.7, y: size * 0.25 }, { x: size * 0.85, y: size * 0.15 },
    { x: size * 0.25, y: size * 0.5 }, { x: size * 0.55, y: size * 0.45 }, { x: size * 0.8, y: size * 0.55 },
    { x: size * 0.1, y: size * 0.75 }, { x: size * 0.35, y: size * 0.85 }, { x: size * 0.6, y: size * 0.75 }, { x: size * 0.9, y: size * 0.9 },
  ];
  const connections = [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 6], [4, 7], [7, 8], [8, 9], [9, 10], [5, 9], [1, 5], [6, 10]];

  return (
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="constellation" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
          <Rect x="0" y="0" width={size} height={size} fill={BASE_COLOR} />
          {connections.map(([from, to], i) => (
            <G key={`line-${i}`}>
              <Line x1={stars[from].x + 1} y1={stars[from].y + 1} x2={stars[to].x + 1} y2={stars[to].y + 1} stroke={SHADOW} strokeWidth={size * 0.015} />
              <Line x1={stars[from].x - 0.5} y1={stars[from].y - 0.5} x2={stars[to].x - 0.5} y2={stars[to].y - 0.5} stroke={HIGHLIGHT} strokeWidth={size * 0.015} />
              <Line x1={stars[from].x} y1={stars[from].y} x2={stars[to].x} y2={stars[to].y} stroke={MID_TONE} strokeWidth={size * 0.01} opacity={0.6} />
            </G>
          ))}
          {stars.map((star, i) => (
            <G key={`star-${i}`}>
              <Circle cx={star.x + 1.5} cy={star.y + 1.5} r={size * 0.025} fill={SHADOW} />
              <Circle cx={star.x - 0.5} cy={star.y - 0.5} r={size * 0.025} fill={HIGHLIGHT} />
              <Circle cx={star.x} cy={star.y} r={size * 0.02} fill={MID_TONE} />
              <Circle cx={star.x} cy={star.y} r={size * 0.008} fill={HIGHLIGHT} opacity={0.8} />
            </G>
          ))}
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#constellation)" />
    </Svg>
  );
};

/**
 * Mesh pattern
 */
const MeshPattern: React.FC<{ size: number }> = ({ size }) => {
  const nodeRadius = size * 0.06;
  const nodes = [{ x: size * 0.5, y: size * 0.5 }, { x: size * 0.2, y: size * 0.2 }, { x: size * 0.8, y: size * 0.2 }, { x: size * 0.2, y: size * 0.8 }, { x: size * 0.8, y: size * 0.8 }];

  return (
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="mesh" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
          <Rect x="0" y="0" width={size} height={size} fill={BASE_COLOR} />
          {[1, 2, 3, 4].map((i) => (
            <G key={`line-${i}`}>
              <Line x1={nodes[0].x + 1.5} y1={nodes[0].y + 1.5} x2={nodes[i].x + 1.5} y2={nodes[i].y + 1.5} stroke={SHADOW} strokeWidth={size * 0.025} />
              <Line x1={nodes[0].x - 1} y1={nodes[0].y - 1} x2={nodes[i].x - 1} y2={nodes[i].y - 1} stroke={HIGHLIGHT} strokeWidth={size * 0.025} />
              <Line x1={nodes[0].x} y1={nodes[0].y} x2={nodes[i].x} y2={nodes[i].y} stroke={MID_TONE} strokeWidth={size * 0.018} />
            </G>
          ))}
          {[[1, 2], [2, 4], [4, 3], [3, 1]].map(([from, to], i) => (
            <G key={`perimeter-${i}`}>
              <Line x1={nodes[from].x + 1.5} y1={nodes[from].y + 1.5} x2={nodes[to].x + 1.5} y2={nodes[to].y + 1.5} stroke={SHADOW} strokeWidth={size * 0.02} />
              <Line x1={nodes[from].x - 1} y1={nodes[from].y - 1} x2={nodes[to].x - 1} y2={nodes[to].y - 1} stroke={HIGHLIGHT} strokeWidth={size * 0.02} />
              <Line x1={nodes[from].x} y1={nodes[from].y} x2={nodes[to].x} y2={nodes[to].y} stroke={MID_TONE} strokeWidth={size * 0.012} opacity={0.5} />
            </G>
          ))}
          {nodes.map((node, i) => (
            <G key={`node-${i}`}>
              <Circle cx={node.x + 2} cy={node.y + 2} r={nodeRadius} fill={SHADOW} />
              <Circle cx={node.x - 1} cy={node.y - 1} r={nodeRadius} fill={HIGHLIGHT} />
              <Circle cx={node.x} cy={node.y} r={nodeRadius * 0.85} fill={MID_TONE} />
              <Circle cx={node.x - nodeRadius * 0.2} cy={node.y - nodeRadius * 0.2} r={nodeRadius * 0.3} fill={HIGHLIGHT} opacity={0.4} />
            </G>
          ))}
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#mesh)" />
    </Svg>
  );
};

/**
 * Diamond pattern
 */
const DiamondsPattern: React.FC<{ size: number }> = ({ size }) => {
  const diamondPath = (cx: number, cy: number, w: number, h: number) => `M${cx} ${cy - h/2} L${cx + w/2} ${cy} L${cx} ${cy + h/2} L${cx - w/2} ${cy} Z`;

  return (
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="diamonds" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
          <Rect x="0" y="0" width={size} height={size} fill={BASE_COLOR} />
          <Path d={diamondPath(size * 0.5, size * 0.5, size * 0.5, size * 0.7)} fill={SHADOW} transform="translate(2, 2)" />
          <Path d={diamondPath(size * 0.5, size * 0.5, size * 0.5, size * 0.7)} fill={HIGHLIGHT} transform="translate(-1, -1)" />
          <Path d={diamondPath(size * 0.5, size * 0.5, size * 0.5, size * 0.7)} fill={MID_TONE} />
          <Line x1={size * 0.5} y1={size * 0.15} x2={size * 0.5} y2={size * 0.5} stroke={HIGHLIGHT} strokeWidth={1} opacity={0.3} />
          <Line x1={size * 0.5} y1={size * 0.5} x2={size * 0.75} y2={size * 0.5} stroke={SHADOW} strokeWidth={1} opacity={0.3} />
          <Line x1={size * 0.5} y1={size * 0.5} x2={size * 0.5} y2={size * 0.85} stroke={SHADOW} strokeWidth={1} opacity={0.3} />
          <Line x1={size * 0.5} y1={size * 0.5} x2={size * 0.25} y2={size * 0.5} stroke={HIGHLIGHT} strokeWidth={1} opacity={0.3} />
          {[{ x: size * 0.1, y: size * 0.1 }, { x: size * 0.9, y: size * 0.1 }, { x: size * 0.1, y: size * 0.9 }, { x: size * 0.9, y: size * 0.9 }].map((pos, i) => (
            <G key={i}>
              <Path d={diamondPath(pos.x, pos.y, size * 0.12, size * 0.18)} fill={SHADOW} transform="translate(1, 1)" />
              <Path d={diamondPath(pos.x, pos.y, size * 0.12, size * 0.18)} fill={HIGHLIGHT} transform="translate(-0.5, -0.5)" />
              <Path d={diamondPath(pos.x, pos.y, size * 0.12, size * 0.18)} fill={MID_TONE} />
            </G>
          ))}
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#diamonds)" />
    </Svg>
  );
};

/**
 * Shield pattern
 */
const ShieldsPattern: React.FC<{ size: number }> = ({ size }) => {
  const shieldPath = (cx: number, cy: number, w: number, h: number) => `M${cx} ${cy - h * 0.5} L${cx + w * 0.5} ${cy - h * 0.3} L${cx + w * 0.5} ${cy + h * 0.1} Q${cx + w * 0.5} ${cy + h * 0.4} ${cx} ${cy + h * 0.5} Q${cx - w * 0.5} ${cy + h * 0.4} ${cx - w * 0.5} ${cy + h * 0.1} L${cx - w * 0.5} ${cy - h * 0.3} Z`;

  return (
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="shields" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
          <Rect x="0" y="0" width={size} height={size} fill={BASE_COLOR} />
          <Path d={shieldPath(size * 0.5, size * 0.5, size * 0.6, size * 0.7)} fill={SHADOW} transform="translate(2, 2)" />
          <Path d={shieldPath(size * 0.5, size * 0.5, size * 0.6, size * 0.7)} fill={HIGHLIGHT} transform="translate(-1, -1)" />
          <Path d={shieldPath(size * 0.5, size * 0.5, size * 0.6, size * 0.7)} fill={MID_TONE} />
          <Path d={shieldPath(size * 0.5, size * 0.5, size * 0.4, size * 0.5)} fill={HIGHLIGHT} opacity={0.15} />
          <Path d={`M${size * 0.35} ${size * 0.5} L${size * 0.45} ${size * 0.6} L${size * 0.65} ${size * 0.4}`} fill="none" stroke={HIGHLIGHT} strokeWidth={size * 0.04} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#shields)" />
    </Svg>
  );
};

/**
 * Circuit pattern
 */
const CircuitsPattern: React.FC<{ size: number }> = ({ size }) => {
  const nodeSize = size * 0.04;

  return (
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="circuits" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
          <Rect x="0" y="0" width={size} height={size} fill={BASE_COLOR} />
          {[0.25, 0.5, 0.75].map((y, i) => (
            <G key={`h-${i}`}>
              <Line x1={0} y1={size * y + 1.5} x2={size} y2={size * y + 1.5} stroke={SHADOW} strokeWidth={size * 0.025} />
              <Line x1={0} y1={size * y - 0.5} x2={size} y2={size * y - 0.5} stroke={HIGHLIGHT} strokeWidth={size * 0.025} />
              <Line x1={0} y1={size * y} x2={size} y2={size * y} stroke={MID_TONE} strokeWidth={size * 0.015} />
            </G>
          ))}
          {[0.25, 0.5, 0.75].map((x, i) => (
            <G key={`v-${i}`}>
              <Line x1={size * x + 1.5} y1={0} x2={size * x + 1.5} y2={size} stroke={SHADOW} strokeWidth={size * 0.025} />
              <Line x1={size * x - 0.5} y1={0} x2={size * x - 0.5} y2={size} stroke={HIGHLIGHT} strokeWidth={size * 0.025} />
              <Line x1={size * x} y1={0} x2={size * x} y2={size} stroke={MID_TONE} strokeWidth={size * 0.015} />
            </G>
          ))}
          {[0.25, 0.5, 0.75].flatMap((x) => [0.25, 0.5, 0.75].map((y) => ({ x: size * x, y: size * y }))).map((pos, i) => (
            <G key={`node-${i}`}>
              <Circle cx={pos.x + 1.5} cy={pos.y + 1.5} r={nodeSize} fill={SHADOW} />
              <Circle cx={pos.x - 0.5} cy={pos.y - 0.5} r={nodeSize} fill={HIGHLIGHT} />
              <Circle cx={pos.x} cy={pos.y} r={nodeSize * 0.8} fill={MID_TONE} />
              <Circle cx={pos.x} cy={pos.y} r={nodeSize * 0.3} fill={HIGHLIGHT} opacity={0.6} />
            </G>
          ))}
          {[{ x: size * 0.1, y: size * 0.1 }, { x: size * 0.9, y: size * 0.9 }].map((pos, i) => (
            <G key={`chip-${i}`}>
              <Rect x={pos.x - size * 0.06 + 1.5} y={pos.y - size * 0.06 + 1.5} width={size * 0.12} height={size * 0.12} rx={2} fill={SHADOW} />
              <Rect x={pos.x - size * 0.06 - 0.5} y={pos.y - size * 0.06 - 0.5} width={size * 0.12} height={size * 0.12} rx={2} fill={HIGHLIGHT} />
              <Rect x={pos.x - size * 0.06} y={pos.y - size * 0.06} width={size * 0.12} height={size * 0.12} rx={2} fill={MID_TONE} />
            </G>
          ))}
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#circuits)" />
    </Svg>
  );
};

/**
 * Hologram pattern - Sci-fi holographic grid (The Expanse style)
 * Glowing intersections with cyan highlights
 */
const HologramPattern: React.FC<{ size: number }> = ({ size }) => {
  const gridSpacing = size / 4;

  return (
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="hologram" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
          <Rect x="0" y="0" width={size} height={size} fill={PANEL_DARK} />

          {/* Grid lines - horizontal */}
          {[1, 2, 3].map((i) => (
            <G key={`h-${i}`}>
              {/* Outer glow */}
              <Line x1={0} y1={gridSpacing * i} x2={size} y2={gridSpacing * i} stroke={GLOW_DIM} strokeWidth={3} opacity={0.3} />
              {/* Core line */}
              <Line x1={0} y1={gridSpacing * i} x2={size} y2={gridSpacing * i} stroke={GLOW_BLUE} strokeWidth={1} opacity={0.6} />
            </G>
          ))}

          {/* Grid lines - vertical */}
          {[1, 2, 3].map((i) => (
            <G key={`v-${i}`}>
              {/* Outer glow */}
              <Line x1={gridSpacing * i} y1={0} x2={gridSpacing * i} y2={size} stroke={GLOW_DIM} strokeWidth={3} opacity={0.3} />
              {/* Core line */}
              <Line x1={gridSpacing * i} y1={0} x2={gridSpacing * i} y2={size} stroke={GLOW_BLUE} strokeWidth={1} opacity={0.6} />
            </G>
          ))}

          {/* Glowing intersection points */}
          {[1, 2, 3].flatMap((x) =>
            [1, 2, 3].map((y) => ({ x: gridSpacing * x, y: gridSpacing * y }))
          ).map((pos, i) => (
            <G key={`node-${i}`}>
              {/* Outer glow */}
              <Circle cx={pos.x} cy={pos.y} r={size * 0.04} fill={GLOW_CYAN} opacity={0.15} />
              {/* Inner glow */}
              <Circle cx={pos.x} cy={pos.y} r={size * 0.025} fill={GLOW_CYAN} opacity={0.3} />
              {/* Bright center */}
              <Circle cx={pos.x} cy={pos.y} r={size * 0.012} fill={GLOW_CYAN} opacity={0.8} />
              {/* Highlight dot */}
              <Circle cx={pos.x} cy={pos.y} r={size * 0.005} fill="#FFFFFF" opacity={0.9} />
            </G>
          ))}

          {/* Corner accents */}
          <Path d={`M0 ${size * 0.15} L0 0 L${size * 0.15} 0`} fill="none" stroke={GLOW_CYAN} strokeWidth={2} opacity={0.4} />
          <Path d={`M${size - size * 0.15} 0 L${size} 0 L${size} ${size * 0.15}`} fill="none" stroke={GLOW_CYAN} strokeWidth={2} opacity={0.4} />
          <Path d={`M${size} ${size - size * 0.15} L${size} ${size} L${size - size * 0.15} ${size}`} fill="none" stroke={GLOW_CYAN} strokeWidth={2} opacity={0.4} />
          <Path d={`M${size * 0.15} ${size} L0 ${size} L0 ${size - size * 0.15}`} fill="none" stroke={GLOW_CYAN} strokeWidth={2} opacity={0.4} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#hologram)" />
    </Svg>
  );
};

/**
 * Panels pattern - Sci-fi beveled tech panels with glowing edges
 * Like spaceship hull panels
 */
const PanelsPattern: React.FC<{ size: number }> = ({ size }) => {
  const padding = size * 0.08;
  const panelSize = size - padding * 2;
  const bevel = size * 0.03;

  return (
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="panels" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
          <Rect x="0" y="0" width={size} height={size} fill={PANEL_DARK} />

          {/* Main panel body */}
          <Rect x={padding} y={padding} width={panelSize} height={panelSize} fill={BASE_COLOR} rx={4} />

          {/* Top edge highlight */}
          <Line x1={padding + bevel} y1={padding + 1} x2={padding + panelSize - bevel} y2={padding + 1} stroke={GLOW_BLUE} strokeWidth={1.5} opacity={0.5} />

          {/* Left edge highlight */}
          <Line x1={padding + 1} y1={padding + bevel} x2={padding + 1} y2={padding + panelSize - bevel} stroke={GLOW_BLUE} strokeWidth={1.5} opacity={0.3} />

          {/* Bottom edge shadow */}
          <Line x1={padding + bevel} y1={padding + panelSize - 1} x2={padding + panelSize - bevel} y2={padding + panelSize - 1} stroke={SHADOW} strokeWidth={2} opacity={0.8} />

          {/* Right edge shadow */}
          <Line x1={padding + panelSize - 1} y1={padding + bevel} x2={padding + panelSize - 1} y2={padding + panelSize - bevel} stroke={SHADOW} strokeWidth={2} opacity={0.6} />

          {/* Corner glow accents */}
          <Circle cx={padding + size * 0.12} cy={padding + size * 0.12} r={size * 0.02} fill={GLOW_CYAN} opacity={0.4} />
          <Circle cx={padding + panelSize - size * 0.12} cy={padding + size * 0.12} r={size * 0.02} fill={GLOW_CYAN} opacity={0.4} />

          {/* Inner detail lines */}
          <Line x1={padding + size * 0.2} y1={size * 0.5} x2={padding + panelSize - size * 0.2} y2={size * 0.5} stroke={PANEL_EDGE} strokeWidth={1} opacity={0.4} />
          <Line x1={size * 0.5} y1={padding + size * 0.2} x2={size * 0.5} y2={padding + panelSize - size * 0.2} stroke={PANEL_EDGE} strokeWidth={1} opacity={0.4} />

          {/* Center node */}
          <Circle cx={size * 0.5} cy={size * 0.5} r={size * 0.03} fill={PANEL_EDGE} opacity={0.6} />
          <Circle cx={size * 0.5} cy={size * 0.5} r={size * 0.015} fill={GLOW_BLUE} opacity={0.4} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#panels)" />
    </Svg>
  );
};

/**
 * Scanlines pattern - Retro-futuristic scan lines with data streams
 */
const ScanlinesPattern: React.FC<{ size: number }> = ({ size }) => {
  const lineSpacing = size / 12;

  return (
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="scanlines" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
          <Rect x="0" y="0" width={size} height={size} fill={PANEL_DARK} />

          {/* Horizontal scan lines */}
          {Array.from({ length: 12 }, (_, i) => (
            <G key={`line-${i}`}>
              <Line
                x1={0}
                y1={lineSpacing * i + lineSpacing / 2}
                x2={size}
                y2={lineSpacing * i + lineSpacing / 2}
                stroke={GLOW_BLUE}
                strokeWidth={1}
                opacity={i % 3 === 0 ? 0.4 : 0.15}
              />
            </G>
          ))}

          {/* Data stream highlights - varying lengths */}
          <Line x1={size * 0.1} y1={lineSpacing * 2.5} x2={size * 0.4} y2={lineSpacing * 2.5} stroke={GLOW_CYAN} strokeWidth={2} opacity={0.6} />
          <Line x1={size * 0.6} y1={lineSpacing * 5.5} x2={size * 0.95} y2={lineSpacing * 5.5} stroke={GLOW_CYAN} strokeWidth={2} opacity={0.5} />
          <Line x1={size * 0.2} y1={lineSpacing * 8.5} x2={size * 0.55} y2={lineSpacing * 8.5} stroke={GLOW_CYAN} strokeWidth={2} opacity={0.4} />
          <Line x1={size * 0.7} y1={lineSpacing * 11.5} x2={size * 0.9} y2={lineSpacing * 11.5} stroke={GLOW_CYAN} strokeWidth={2} opacity={0.6} />

          {/* Vertical accent line */}
          <Line x1={size * 0.15} y1={0} x2={size * 0.15} y2={size} stroke={GLOW_CYAN} strokeWidth={1} opacity={0.2} />
          <Line x1={size * 0.85} y1={0} x2={size * 0.85} y2={size} stroke={GLOW_CYAN} strokeWidth={1} opacity={0.2} />

          {/* Glowing nodes at intersections */}
          <Circle cx={size * 0.15} cy={lineSpacing * 2.5} r={size * 0.015} fill={GLOW_CYAN} opacity={0.7} />
          <Circle cx={size * 0.85} cy={lineSpacing * 5.5} r={size * 0.015} fill={GLOW_CYAN} opacity={0.7} />
          <Circle cx={size * 0.15} cy={lineSpacing * 8.5} r={size * 0.015} fill={GLOW_CYAN} opacity={0.7} />
          <Circle cx={size * 0.85} cy={lineSpacing * 11.5} r={size * 0.015} fill={GLOW_CYAN} opacity={0.7} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#scanlines)" />
    </Svg>
  );
};

/**
 * Reactor pattern - Power core with radiating energy lines
 * Central glowing core with emanating power conduits
 */
const ReactorPattern: React.FC<{ size: number }> = ({ size }) => {
  const cx = size / 2;
  const cy = size / 2;

  return (
    <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="reactor" x="0" y="0" width={size} height={size} patternUnits="userSpaceOnUse">
          <Rect x="0" y="0" width={size} height={size} fill={PANEL_DARK} />

          {/* Outer ring - dim */}
          <Circle cx={cx} cy={cy} r={size * 0.42} fill="none" stroke={PANEL_EDGE} strokeWidth={size * 0.02} opacity={0.4} />

          {/* Middle ring - medium glow */}
          <Circle cx={cx} cy={cy} r={size * 0.32} fill="none" stroke={GLOW_DIM} strokeWidth={size * 0.015} opacity={0.5} />
          <Circle cx={cx} cy={cy} r={size * 0.32} fill="none" stroke={GLOW_BLUE} strokeWidth={size * 0.005} opacity={0.8} />

          {/* Inner ring - bright */}
          <Circle cx={cx} cy={cy} r={size * 0.2} fill="none" stroke={GLOW_BLUE} strokeWidth={size * 0.02} opacity={0.4} />
          <Circle cx={cx} cy={cy} r={size * 0.2} fill="none" stroke={GLOW_CYAN} strokeWidth={size * 0.008} opacity={0.9} />

          {/* Radiating lines */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = cx + Math.cos(rad) * size * 0.22;
            const y1 = cy + Math.sin(rad) * size * 0.22;
            const x2 = cx + Math.cos(rad) * size * 0.4;
            const y2 = cy + Math.sin(rad) * size * 0.4;
            return (
              <G key={`ray-${i}`}>
                <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={GLOW_DIM} strokeWidth={size * 0.02} opacity={0.3} />
                <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={GLOW_BLUE} strokeWidth={size * 0.008} opacity={0.6} />
              </G>
            );
          })}

          {/* Core glow layers */}
          <Circle cx={cx} cy={cy} r={size * 0.12} fill={GLOW_DIM} opacity={0.4} />
          <Circle cx={cx} cy={cy} r={size * 0.08} fill={GLOW_BLUE} opacity={0.5} />
          <Circle cx={cx} cy={cy} r={size * 0.05} fill={GLOW_CYAN} opacity={0.7} />
          <Circle cx={cx} cy={cy} r={size * 0.025} fill="#FFFFFF" opacity={0.9} />

          {/* Corner brackets */}
          <Path d={`M${size * 0.05} ${size * 0.15} L${size * 0.05} ${size * 0.05} L${size * 0.15} ${size * 0.05}`} fill="none" stroke={GLOW_CYAN} strokeWidth={1.5} opacity={0.5} />
          <Path d={`M${size * 0.85} ${size * 0.05} L${size * 0.95} ${size * 0.05} L${size * 0.95} ${size * 0.15}`} fill="none" stroke={GLOW_CYAN} strokeWidth={1.5} opacity={0.5} />
          <Path d={`M${size * 0.95} ${size * 0.85} L${size * 0.95} ${size * 0.95} L${size * 0.85} ${size * 0.95}`} fill="none" stroke={GLOW_CYAN} strokeWidth={1.5} opacity={0.5} />
          <Path d={`M${size * 0.15} ${size * 0.95} L${size * 0.05} ${size * 0.95} L${size * 0.05} ${size * 0.85}`} fill="none" stroke={GLOW_CYAN} strokeWidth={1.5} opacity={0.5} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#reactor)" />
    </Svg>
  );
};

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
      case 'constellation':
        return <ConstellationPattern size={patternSize} />;
      case 'mesh':
        return <MeshPattern size={patternSize} />;
      case 'diamonds':
        return <DiamondsPattern size={patternSize} />;
      case 'shields':
        return <ShieldsPattern size={patternSize} />;
      case 'circuits':
        return <CircuitsPattern size={patternSize} />;
      case 'hologram':
        return <HologramPattern size={patternSize} />;
      case 'panels':
        return <PanelsPattern size={patternSize} />;
      case 'scanlines':
        return <ScanlinesPattern size={patternSize} />;
      case 'reactor':
        return <ReactorPattern size={patternSize} />;
      default:
        return <BubblesPattern size={patternSize} />;
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
