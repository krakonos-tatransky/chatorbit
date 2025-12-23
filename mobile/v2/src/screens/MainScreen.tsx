import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Text,
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
  PatternPreview: undefined;
};

type MainScreenProps = NativeStackScreenProps<RootStackParamList, 'Main'>;

type ContentView = 'landing' | 'mint' | 'accept';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ANIMATION_DURATION = 300;

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
    <LinearGradient
      colors={['#0a1628', '#122a4d', '#1a3a5c', '#0d2137']}
      locations={[0, 0.3, 0.7, 1]}
      style={styles.gradient}
    >
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

        {/* DEV: Pattern preview button - remove after selection */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.devButton}
            onPress={() => navigation.navigate('PatternPreview')}
          >
            <Text style={styles.devButtonText}>BG</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  devButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 202, 40, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  devButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
});
