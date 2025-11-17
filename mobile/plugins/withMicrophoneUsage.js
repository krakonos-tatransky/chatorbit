const { withInfoPlist } = require('@expo/config-plugins');

const DEFAULT_MESSAGE =
  'ChatOrbit uses the microphone for secure, real-time audio conversations between participants.';

module.exports = (config) =>
  withInfoPlist(config, (config) => {
    const infoPlist = config.modResults || {};
    if (!infoPlist.NSMicrophoneUsageDescription) {
      infoPlist.NSMicrophoneUsageDescription = DEFAULT_MESSAGE;
    }
    return config;
  });
