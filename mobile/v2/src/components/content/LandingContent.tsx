import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/spacing';

interface LandingContentProps {
  onNeedToken: () => void;
  onHaveToken: () => void;
}

// Neon blue color matching the design
const NEON_BLUE = '#4FC3F7';
const NEON_BLUE_LIGHT = '#88E6FF';
const NEON_BLUE_DARK = '#29B6F6';

// Key icon SVG path (Material Design key icon)
const KeyIcon: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={NEON_BLUE}>
    <Path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
  </Svg>
);

// Checkmark icon for the door badge
const CheckIcon: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#0a1628">
    <Path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
  </Svg>
);

// Shield icon for footer
const ShieldIcon: React.FC = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="#4CAF50">
    <Path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
  </Svg>
);

// Lock icon for footer
const LockIcon: React.FC = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill={NEON_BLUE}>
    <Path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
  </Svg>
);

// Clock icon for footer
const ClockIcon: React.FC = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="#FF9800">
    <Path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
  </Svg>
);

export const LandingContent: React.FC<LandingContentProps> = ({
  onNeedToken,
  onHaveToken,
}) => {
  // Animation values
  const ringRotation = useRef(new Animated.Value(0)).current;
  const dashedRingRotation = useRef(new Animated.Value(0)).current;
  const fadeInAnim1 = useRef(new Animated.Value(0)).current;
  const fadeInAnim2 = useRef(new Animated.Value(0)).current;
  const fadeInAnim3 = useRef(new Animated.Value(0)).current;
  const scaleAnim1 = useRef(new Animated.Value(0.8)).current;
  const scaleAnim2 = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Spinning ring animation
    Animated.loop(
      Animated.timing(ringRotation, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Reverse spinning dashed ring
    Animated.loop(
      Animated.timing(dashedRingRotation, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Entry animations
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeInAnim1, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim1, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeInAnim2, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim2, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(fadeInAnim3, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const ringRotationInterpolate = ringRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const dashedRingRotationInterpolate = dashedRingRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Action Buttons Container */}
        <View style={styles.actionsContainer}>
          {/* Generate Token Button */}
          <Animated.View
            style={[
              styles.actionItem,
              {
                opacity: fadeInAnim1,
                transform: [{ scale: scaleAnim1 }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.actionTouchable}
              onPress={onNeedToken}
              activeOpacity={0.8}
            >
              <View style={styles.iconWrapper}>
                {/* Glow effect */}
                <View style={styles.iconGlow} />

                {/* Animated rings */}
                <Animated.View
                  style={[
                    styles.ring,
                    { transform: [{ rotate: ringRotationInterpolate }] },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.ringDashed,
                    { transform: [{ rotate: dashedRingRotationInterpolate }] },
                  ]}
                />

                {/* Key icon */}
                <View style={styles.iconCenter}>
                  <KeyIcon size={44} />
                </View>

                {/* Plus badge */}
                <View style={styles.plusBadge}>
                  <Text style={styles.plusText}>+</Text>
                </View>
              </View>

              <Text style={styles.actionTitle}>Get Token</Text>
              <Text style={styles.actionSubtitle}>Create Room</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Enter Room Button */}
          <Animated.View
            style={[
              styles.actionItem,
              {
                opacity: fadeInAnim2,
                transform: [{ scale: scaleAnim2 }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.actionTouchable}
              onPress={onHaveToken}
              activeOpacity={0.8}
            >
              <View style={styles.iconWrapper}>
                {/* Glow effect */}
                <View style={styles.iconGlow} />

                {/* Door icon container */}
                <View style={styles.doorContainer}>
                  {/* Light beam */}
                  <View style={styles.lightBeam} />

                  {/* Door frame */}
                  <View style={styles.doorFrame}>
                    {/* Door light inside */}
                    <View style={styles.doorLight} />

                    {/* Open door panel */}
                    <View style={styles.doorPanel}>
                      <View style={styles.doorHandle} />
                    </View>
                  </View>
                </View>

                {/* Check badge */}
                <View style={styles.checkBadge}>
                  <CheckIcon size={16} />
                </View>
              </View>

              <Text style={styles.actionTitle}>Has Token</Text>
              <Text style={styles.actionSubtitle}>Join Room</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Description */}
        <Animated.View
          style={[styles.descriptionSection, { opacity: fadeInAnim3 }]}
        >
          <Text style={styles.descriptionText}>
            Generate a shareable access token, send it to your contact, and meet
            in an ephemeral chat room. Once connected, a secure countdown begins.
          </Text>
        </Animated.View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerBadges}>
          <View style={styles.footerBadge}>
            <ShieldIcon />
            <Text style={styles.footerBadgeText}>Private</Text>
          </View>
          <View style={styles.footerBadge}>
            <LockIcon />
            <Text style={styles.footerBadgeText}>Encrypted</Text>
          </View>
          <View style={styles.footerBadge}>
            <ClockIcon />
            <Text style={styles.footerBadgeText}>Ephemeral</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: SPACING.xl,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 40,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionTouchable: {
    alignItems: 'center',
  },
  iconWrapper: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: NEON_BLUE,
    opacity: 0.15,
  },
  ring: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: 'rgba(79, 195, 247, 0.5)',
    borderTopColor: NEON_BLUE,
    borderRightColor: NEON_BLUE,
  },
  ringDashed: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
    borderColor: 'rgba(79, 195, 247, 0.3)',
    borderStyle: 'dashed',
  },
  iconCenter: {
    shadowColor: NEON_BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  plusBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: NEON_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: NEON_BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  plusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a1628',
  },

  // Door styles
  doorContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightBeam: {
    position: 'absolute',
    top: 15,
    left: 5,
    width: 35,
    height: 50,
    backgroundColor: NEON_BLUE,
    opacity: 0.15,
    transform: [{ skewX: '-15deg' }],
  },
  doorFrame: {
    width: 55,
    height: 70,
    borderWidth: 3,
    borderColor: NEON_BLUE,
    borderRadius: 4,
    backgroundColor: 'rgba(79, 195, 247, 0.05)',
    shadowColor: NEON_BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    overflow: 'visible',
  },
  doorLight: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    backgroundColor: NEON_BLUE,
    opacity: 0.1,
    borderRadius: 2,
  },
  doorPanel: {
    position: 'absolute',
    top: 2,
    left: -18,
    width: 30,
    height: 62,
    backgroundColor: 'rgba(79, 195, 247, 0.2)',
    borderWidth: 2,
    borderRightWidth: 0,
    borderColor: NEON_BLUE,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    transform: [{ perspective: 100 }, { rotateY: '-25deg' }],
    shadowColor: NEON_BLUE,
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  doorHandle: {
    position: 'absolute',
    top: '50%',
    right: 5,
    width: 4,
    height: 10,
    marginTop: -5,
    backgroundColor: NEON_BLUE,
    borderRadius: 2,
    shadowColor: NEON_BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  checkBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: NEON_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: NEON_BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },

  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 2,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },

  descriptionSection: {
    paddingHorizontal: 12,
    marginTop: 20,
  },
  descriptionText: {
    fontSize: 12,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },

  footer: {
    alignItems: 'center',
    paddingBottom: SPACING.lg,
  },
  footerBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerBadgeText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
