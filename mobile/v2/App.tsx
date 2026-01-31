/**
 * ChatOrbit Mobile v2 App
 *
 * Main entry point with navigation setup.
 */

import React from 'react';
import { Text, TextInput, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { SplashScreen } from './src/screens/SplashScreen';
import { MainScreen } from './src/screens/MainScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { COLORS } from './src/constants';

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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [fontsLoaded] = useFonts({
    JetBrainsMono: JetBrainsMono_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background.primary }}>
        <ActivityIndicator size="large" color={COLORS.accent.yellow} />
      </View>
    );
  }

  return (
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
