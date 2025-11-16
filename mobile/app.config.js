const scriptPhaseWarningsPlugin = './plugins/ensure-script-phase-outputs';

/**
 * @param {import('expo/config').ConfigContext} param0
 */
module.exports = ({ config }) => {
  const baseConfig = config ?? {};
  const plugins = baseConfig.plugins ?? [];

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
      ...(baseConfig.ios ?? {}),
    },
    android: {
      package: 'com.chatorbit.token',
      ...(baseConfig.android ?? {}),
    },
    web: {
      bundler: 'metro',
      ...(baseConfig.web ?? {}),
    },
    plugins: [...plugins, scriptPhaseWarningsPlugin],
  };
};
