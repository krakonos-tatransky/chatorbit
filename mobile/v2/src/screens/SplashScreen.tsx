import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../constants/colors';
import { TEXT_STYLES } from '../constants/typography';
import { SPACING } from '../constants/spacing';

type RootStackParamList = {
  Splash: undefined;
  Landing: undefined;
  Accept: undefined;
  Session: undefined;
};

type SplashScreenProps = NativeStackScreenProps<RootStackParamList, 'Splash'>;

// Use local bundled asset (SVGs from URLs don't work in React Native)
const LogoImage = require('../../assets/splash-icon.png');

export const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Landing');
    }, 2500); // 2.5 seconds

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={LogoImage}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.tagline}>Mobile-to-Mobile</Text>
        <Text style={styles.versionText}>v2</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
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
