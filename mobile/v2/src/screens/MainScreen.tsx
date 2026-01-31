import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Header } from '../components/layout/Header';
import { LandingContent } from '../components/content/LandingContent';
import { MintContent } from '../components/content/MintContent';
import { AcceptContent } from '../components/content/AcceptContent';

type RootStackParamList = {
  Splash: undefined;
  Main: undefined;
  Session: undefined;
};

type MainScreenProps = NativeStackScreenProps<RootStackParamList, 'Main'>;

type ContentView = 'landing' | 'mint' | 'accept';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ANIMATION_DURATION = 300;

// Floating particle component
const FloatingParticle: React.FC<{
  delay: number;
  startX: number;
  startY: number;
  size: number;
}> = ({ delay, startX, startY, size }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: -25,
              duration: 5000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 2500,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1.3,
              duration: 5000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: 0,
              duration: 5000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: 2500,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: 5000,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };
    animate();
  }, [delay, translateY, opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: `${startX}%`,
          top: `${startY}%`,
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    />
  );
};

export const MainScreen: React.FC<MainScreenProps> = ({ navigation }) => {
  const [currentView, setCurrentView] = useState<ContentView>('landing');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateToView = (nextView: ContentView, direction: 'left' | 'right') => {
    const toValue = direction === 'left' ? -SCREEN_WIDTH : SCREEN_WIDTH;

    // Fade out and slide current view
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION / 2,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: toValue,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Switch content
      setCurrentView(nextView);

      // Reset position to opposite side
      slideAnim.setValue(-toValue);

      // Fade in and slide new view
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION / 2,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNeedToken = () => {
    animateToView('mint', 'left');
  };

  const handleHaveToken = () => {
    animateToView('accept', 'left');
  };

  const handleBack = () => {
    animateToView('landing', 'right');
  };

  const handleSessionStart = () => {
    navigation.navigate('Session');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'landing':
        return (
          <LandingContent
            onNeedToken={handleNeedToken}
            onHaveToken={handleHaveToken}
          />
        );
      case 'mint':
        return (
          <MintContent
            onSessionStart={handleSessionStart}
          />
        );
      case 'accept':
        return (
          <AcceptContent
            onSessionStart={handleSessionStart}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Tech Corridor Background */}
      <LinearGradient
        colors={['#000510', '#001233', '#003566', '#001845', '#000510']}
        locations={[0, 0.25, 0.45, 0.6, 1]}
        style={styles.gradient}
      >
        {/* Central glow */}
        <View style={styles.centralGlow} />

        {/* Side glows */}
        <View style={styles.leftGlow} />
        <View style={styles.rightGlow} />

        {/* Floating particles */}
        <FloatingParticle delay={0} startX={15} startY={25} size={3} />
        <FloatingParticle delay={2500} startX={80} startY={55} size={4} />
        <FloatingParticle delay={5000} startX={20} startY={75} size={5} />
        <FloatingParticle delay={1500} startX={85} startY={35} size={3} />
        <FloatingParticle delay={4000} startX={50} startY={65} size={4} />
      </LinearGradient>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header onBack={currentView !== 'landing' ? handleBack : undefined} />

        <Animated.View
          style={[
            styles.contentContainer,
            {
              transform: [{ translateX: slideAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          {renderContent()}
        </Animated.View>

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000510',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  centralGlow: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    right: '10%',
    height: '40%',
    borderRadius: 200,
    backgroundColor: 'rgba(50, 130, 255, 0.2)',
    transform: [{ scaleX: 1.5 }],
  },
  leftGlow: {
    position: 'absolute',
    top: '20%',
    left: '-10%',
    width: '50%',
    height: '50%',
    borderRadius: 150,
    backgroundColor: 'rgba(30, 80, 200, 0.15)',
  },
  rightGlow: {
    position: 'absolute',
    top: '20%',
    right: '-10%',
    width: '50%',
    height: '50%',
    borderRadius: 150,
    backgroundColor: 'rgba(30, 80, 200, 0.15)',
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(100, 180, 255, 0.7)',
    shadowColor: '#64B4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
});
