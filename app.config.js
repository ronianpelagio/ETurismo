module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  console.log(
    '[MAPS TEST]',
    googleMapsApiKey
      ? 'GOOGLE MAPS KEY LOADED'
      : 'GOOGLE MAPS KEY NOT LOADED'
  );

  if (!googleMapsApiKey) {
    console.warn(
      '[app.config.js] GOOGLE_MAPS_API_KEY is not defined.'
    );
  }

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

      // Google Maps
      config: {
        ...config.android?.config,

        googleMaps: {
          apiKey: googleMapsApiKey || '',
        },
      },
    },
  };
};