// Load environment variables from .env file
require('dotenv').config();

module.exports = {
  expo: {
    name: 'ChatOrbit',
    slug: 'chatorbit-v2',
    version: '2.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: false,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#020617',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.chatorbit.mobile.v2',
      infoPlist: {
        NSMicrophoneUsageDescription:
          'ChatOrbit uses the microphone for secure, real-time audio conversations between participants.',
        NSCameraUsageDescription:
          'ChatOrbit uses the camera for secure, real-time video conversations between participants.',
        ITSAppUsesNonExemptEncryption: false,
      },
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            // AsyncStorage, SecureStore, and other libraries use UserDefaults
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
            NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
          },
          {
            // File operations may access timestamps
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
            NSPrivacyAccessedAPITypeReasons: ['0A2A.1', '3B52.1', 'C617.1'],
          },
          {
            // Some libraries check available disk space
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
            NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
          },
          {
            // Performance monitoring may access boot time
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
            NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
          },
        ],
        NSPrivacyCollectedDataTypes: [],
        NSPrivacyTracking: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#020617',
      },
      package: 'com.chatorbit.mobile.v2',
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-font',
    ],
    extra: {
      eas: {
        projectId: 'ffb1c8a9-17e9-4dca-8e57-3678b8088638',
      },
      // Expose environment variables to the app
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
      EXPO_PUBLIC_WS_BASE_URL: process.env.EXPO_PUBLIC_WS_BASE_URL,
      EXPO_PUBLIC_WEBRTC_STUN_URLS: process.env.EXPO_PUBLIC_WEBRTC_STUN_URLS,
      EXPO_PUBLIC_WEBRTC_TURN_URLS: process.env.EXPO_PUBLIC_WEBRTC_TURN_URLS,
      EXPO_PUBLIC_WEBRTC_TURN_USER: process.env.EXPO_PUBLIC_WEBRTC_TURN_USER,
      EXPO_PUBLIC_WEBRTC_TURN_PASSWORD: process.env.EXPO_PUBLIC_WEBRTC_TURN_PASSWORD,
    },
  },
};
