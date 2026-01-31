import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PlaceholderAdBannerProps {
  style?: object;
}

const PLACEHOLDER_ADS = [
  {
    title: 'ChatOrbit Pro',
    description: 'Upgrade for longer sessions',
    cta: 'Learn More',
    gradientColors: ['#667eea', '#764ba2'] as const,
  },
  {
    title: 'Secure Messaging',
    description: 'End-to-end encrypted chats',
    cta: 'Try Now',
    gradientColors: ['#f093fb', '#f5576c'] as const,
  },
  {
    title: 'Video Calls',
    description: 'Crystal clear P2P video',
    cta: 'Start Call',
    gradientColors: ['#4facfe', '#00f2fe'] as const,
  },
  {
    title: 'Privacy First',
    description: 'No message storage',
    cta: 'Learn More',
    gradientColors: ['#43e97b', '#38f9d7'] as const,
  },
];

const AD_ROTATION_INTERVAL = 8000; // 8 seconds

export const PlaceholderAdBanner: React.FC<PlaceholderAdBannerProps> = ({ style }) => {
  const [adIndex, setAdIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Change ad
        setAdIndex((prev) => (prev + 1) % PLACEHOLDER_ADS.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, AD_ROTATION_INTERVAL);

    return () => clearInterval(interval);
  }, [fadeAnim]);

  const currentAd = PLACEHOLDER_ADS[adIndex];

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={[...currentAd.gradientColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {/* Ad badge */}
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>Ad</Text>
        </View>

        {/* Demo badge */}
        <View style={styles.demoBadge}>
          <Text style={styles.demoBadgeText}>Demo</Text>
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{currentAd.title}</Text>
            <Text style={styles.description}>{currentAd.description}</Text>
          </View>

          <TouchableOpacity style={styles.ctaButton} activeOpacity={0.8}>
            <Text style={styles.ctaText}>{currentAd.cta}</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: 60,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    position: 'relative',
  },
  adBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  demoBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  demoBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '400',
  },
  ctaButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
