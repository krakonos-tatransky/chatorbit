/**
 * @param {import('expo/config').ConfigContext} param0
 */
module.exports = ({ config }) => {
  const baseConfig = config ?? {};
  const plugins = baseConfig.plugins ?? [];
  const baseIOS = baseConfig.ios ?? {};
  const infoPlist = { ...(baseIOS.infoPlist ?? {}) };
  if (!infoPlist.NSMicrophoneUsageDescription) {
    infoPlist.NSMicrophoneUsageDescription =
      'ChatOrbit uses the microphone for secure, real-time audio conversations between participants.';
  }
  if (!infoPlist.NSCameraUsageDescription) {
    infoPlist.NSCameraUsageDescription =
      'ChatOrbit uses the camera for secure, real-time video conversations between participants.';
  }

  return {
    ...baseConfig,
    name: 'ChatOrbit Token',
    slug: 'chatorbit-token',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'chatorbit-token',
    entryPoint: './index.ts',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.chatorbit.token',
      ...baseIOS,
      infoPlist,
    },
    android: {
      package: 'com.chatorbit.token',
      ...(baseConfig.android ?? {}),
    },
    web: {
      bundler: 'metro',
      ...(baseConfig.web ?? {}),
    },
    plugins: [...plugins, 'expo-font', './plugins/withMicrophoneUsage'],
  };
};
