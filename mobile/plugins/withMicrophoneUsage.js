const { withInfoPlist } = require('@expo/config-plugins');

const DEFAULT_MIC_MESSAGE =
  'ChatOrbit uses the microphone for secure, real-time audio conversations between participants.';

const DEFAULT_CAMERA_MESSAGE =
  'ChatOrbit uses the camera for secure, real-time video conversations between participants.';

module.exports = (config) =>
  withInfoPlist(config, (config) => {
    const infoPlist = config.modResults || {};

    if (!infoPlist.NSMicrophoneUsageDescription) {
      infoPlist.NSMicrophoneUsageDescription = DEFAULT_MIC_MESSAGE;
    }

    if (!infoPlist.NSCameraUsageDescription) {
      infoPlist.NSCameraUsageDescription = DEFAULT_CAMERA_MESSAGE;
    }

    return config;
  });
