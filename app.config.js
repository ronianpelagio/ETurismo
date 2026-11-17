module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  return {
    ...config,

    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        ...(googleMapsApiKey
          ? {
              googleMaps: {
                ...config.android?.config?.googleMaps,
                apiKey: googleMapsApiKey,
              },
            }
          : {}),
      },

      // Firebase / FCM
      googleServicesFile: './google-services.json',

      // ETurismo Android package
      package:
        config.android?.package ||
        'com.ronian.eturismo',
    },
  };
};
