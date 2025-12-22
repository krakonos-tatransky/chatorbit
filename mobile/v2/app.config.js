// Load environment variables from .env file
require('dotenv').config();

module.exports = {
  expo: {
    name: 'ChatOrbit v2',
    slug: 'chatorbit-v2',
    version: '2.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0A1929',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.chatorbit.mobile.v2',
      infoPlist: {
        NSMicrophoneUsageDescription:
          'ChatOrbit uses the microphone for secure, real-time audio conversations between participants.',
        NSCameraUsageDescription:
          'ChatOrbit uses the camera for secure, real-time video conversations between participants.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0A1929',
      },
      package: 'com.chatorbit.mobile.v2',
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
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
