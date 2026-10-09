module.exports = ({ config }) => {
  return {
    ...config,

    android: {
      ...config.android,

      // Firebase / FCM
      googleServicesFile: './google-services.json',

      // ETurismo Android package
      package:
        config.android?.package ||
        'com.ronian.eturismo',
    },
  };
};
