/**
 * ChatOrbit Mobile v2 App
 *
 * Main entry point with navigation setup.
 */

import React, { useEffect } from 'react';
import { Text, TextInput, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { SplashScreen } from './src/screens/SplashScreen';
import { MainScreen } from './src/screens/MainScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { PatternPreviewScreen } from './src/screens/PatternPreviewScreen';
import { HelpScreen } from './src/screens/HelpScreen';
import { TermsScreen } from './src/screens/TermsScreen';
import { PrivacyScreen } from './src/screens/PrivacyScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { COLORS } from './src/constants';
import { LanguageProvider } from './src/i18n';
import { useSettingsStore, selectShouldShowAds } from './src/state';
// TODO: Re-install react-native-google-mobile-ads when app is linked to App Store
// import { initializeAdMob } from './src/services/admob';

/**
 * Dynamic Type Support
 * Allow text to scale with iOS accessibility settings.
 * Max multiplier of 1.2 provides basic accessibility while
 * preventing extreme sizes that break layouts.
 */
const MAX_FONT_SCALE = 1.2;

// Set global defaults for Text - allow Dynamic Type with reasonable max
const TextComponent = Text as any;
if (TextComponent.defaultProps == null) {
  TextComponent.defaultProps = {};
}
TextComponent.defaultProps.allowFontScaling = true;
TextComponent.defaultProps.maxFontSizeMultiplier = MAX_FONT_SCALE;

// Set global defaults for TextInput
const TextInputComponent = TextInput as any;
if (TextInputComponent.defaultProps == null) {
  TextInputComponent.defaultProps = {};
}
TextInputComponent.defaultProps.allowFontScaling = true;
TextInputComponent.defaultProps.maxFontSizeMultiplier = MAX_FONT_SCALE;

export type RootStackParamList = {
  Splash: undefined;
  Main: undefined;
  Session: undefined;
  PatternPreview: undefined;
  Help: undefined;
  Terms: undefined;
  Privacy: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [fontsLoaded] = useFonts({
    JetBrainsMono: JetBrainsMono_400Regular,
  });
  const shouldShowAds = useSettingsStore(selectShouldShowAds);

  // AdMob initialization - only for free version (when shouldShowAds is true)
  // Currently disabled because AdMob requires app to be linked to App Store
  // TODO: When ready to enable ads:
  // 1. Set isPaidVersion to false in settingsStore.ts
  // 2. Uncomment the useEffect below
  // useEffect(() => {
  //   // Only initialize AdMob for free version
  //   if (!shouldShowAds) {
  //     console.log('[App] Paid version - skipping AdMob initialization');
  //     return;
  //   }
  //
  //   const timer = setTimeout(() => {
  //     initializeAdMob().catch((error) => {
  //       console.error('[App] Failed to initialize AdMob:', error);
  //     });
  //   }, 3000);
  //   return () => clearTimeout(timer);
  // }, [shouldShowAds]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background.primary }}>
        <ActivityIndicator size="large" color={COLORS.accent.yellow} />
      </View>
    );
  }

  return (
    <LanguageProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.background.secondary,
          },
          headerTintColor: COLORS.text.primary,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: COLORS.background.primary,
          },
        }}
      >
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{
            title: 'ChatOrbit',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Main"
          component={MainScreen}
          options={{
            title: 'ChatOrbit',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Session"
          component={SessionScreen}
          options={{
            title: 'Video Session',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="PatternPreview"
          component={PatternPreviewScreen}
          options={{
            title: 'Pattern Preview',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Help"
          component={HelpScreen}
          options={{
            title: 'Help',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Terms"
          component={TermsScreen}
          options={{
            title: 'Terms of Service',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Privacy"
          component={PrivacyScreen}
          options={{
            title: 'Privacy Policy',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            headerShown: false,
          }}
        />
        </Stack.Navigator>
      </NavigationContainer>
    </LanguageProvider>
  );
}
