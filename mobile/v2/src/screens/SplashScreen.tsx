import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../constants/colors';
import { TEXT_STYLES } from '../constants/typography';
import { SPACING } from '../constants/spacing';

type RootStackParamList = {
  Splash: undefined;
  Main: undefined;
  Session: undefined;
};

type SplashScreenProps = NativeStackScreenProps<RootStackParamList, 'Splash'>;

// Use local bundled asset (SVGs from URLs don't work in React Native)
const LogoImage = require('../../assets/splash-icon.png');

export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Main');
    }, 2500); // 2.5 seconds

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <LinearGradient
      colors={['#0a1628', '#122a4d', '#1a3a5c', '#0d2137']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.gradient}
    >
      <View style={styles.logoContainer}>
        <Image
          source={LogoImage}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>Mobile-to-Mobile</Text>
        <Text style={styles.versionText}>v2</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 280,
    height: 180,
    marginBottom: SPACING.lg,
  },
  tagline: {
    ...TEXT_STYLES.body,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  versionText: {
    ...TEXT_STYLES.caption,
    color: COLORS.accent.orange,
    fontSize: 16,
    fontWeight: '600',
  },
});
