import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Text,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Header } from '../components/layout/Header';
import { LandingContent } from '../components/content/LandingContent';
import { MintContent } from '../components/content/MintContent';
import { AcceptContent } from '../components/content/AcceptContent';
import { TermsConsentModal } from '../components/TermsConsentModal';
import { BackgroundPattern } from '../components/ui';
import { useSettingsStore, selectBackgroundPattern, selectPatternSize } from '../state';

const TERMS_ACCEPTED_KEY = '@chatorbit_terms_accepted';

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
  const [showTermsConsent, setShowTermsConsent] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Get background settings from store
  const backgroundPattern = useSettingsStore(selectBackgroundPattern);
  const patternSize = useSettingsStore(selectPatternSize);

  // Check if user has already accepted terms
  useEffect(() => {
    const checkTermsAccepted = async () => {
      try {
        const accepted = await AsyncStorage.getItem(TERMS_ACCEPTED_KEY);
        if (accepted !== 'true') {
          setShowTermsConsent(true);
        }
        setTermsChecked(true);
      } catch (error) {
        console.error('Failed to check terms acceptance:', error);
        // Show terms modal if we can't check
        setShowTermsConsent(true);
        setTermsChecked(true);
      }
    };
    checkTermsAccepted();
  }, []);

  // Handle terms agreement
  const handleTermsAgree = useCallback(async () => {
    try {
      await AsyncStorage.setItem(TERMS_ACCEPTED_KEY, 'true');
      setShowTermsConsent(false);
    } catch (error) {
      console.error('Failed to save terms acceptance:', error);
      // Still allow proceeding even if save fails
      setShowTermsConsent(false);
    }
  }, []);

  // Handle terms cancel - exit the app
  const handleTermsCancel = useCallback(() => {
    BackHandler.exitApp();
  }, []);

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
      {/* Background Pattern from Settings */}
      <BackgroundPattern variant={backgroundPattern} patternSize={patternSize} />

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

      {/* Terms Consent Modal - shown on first launch */}
      <TermsConsentModal
        visible={showTermsConsent && termsChecked}
        onAgree={handleTermsAgree}
        onCancel={handleTermsCancel}
      />
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
