import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Header } from '../components/layout/Header';
import { LandingContent } from '../components/content/LandingContent';
import { MintContent } from '../components/content/MintContent';
import { AcceptContent } from '../components/content/AcceptContent';
import { BackgroundPattern } from '../components/ui';
import { useSettingsStore, selectBackgroundPattern, selectPatternSize } from '../state';

type RootStackParamList = {
  Splash: undefined;
  Main: undefined;
  Session: undefined;
};

type MainScreenProps = NativeStackScreenProps<RootStackParamList, 'Main'>;

type ContentView = 'landing' | 'mint' | 'accept';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ANIMATION_DURATION = 300;

export const MainScreen: React.FC<MainScreenProps> = ({ navigation }) => {
  const [currentView, setCurrentView] = useState<ContentView>('landing');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentPattern = useSettingsStore(selectBackgroundPattern);
  const currentSize = useSettingsStore(selectPatternSize);

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
      <BackgroundPattern variant={currentPattern} patternSize={currentSize} />

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
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
});
