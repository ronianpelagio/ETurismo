const { withAppBuildGradle } = require('@expo/config-plugins');

function withGoogleMapsEnvironment(config) {
  return withAppBuildGradle(config, (modConfig) => {
    const placeholderLine =
      '        manifestPlaceholders.googleMapsApiKey = System.getenv("GOOGLE_MAPS_API_KEY") ?: ""';

    if (!modConfig.modResults.contents.includes('manifestPlaceholders.googleMapsApiKey')) {
      modConfig.modResults.contents = modConfig.modResults.contents.replace(
        /(\s+versionName\s+[^\n]+\n)/,
        `$1${placeholderLine}\n`,
      );
    }

    return modConfig;
  });
}

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  return withGoogleMapsEnvironment({
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: { apiKey: googleMapsApiKey || undefined },
      },
    },
  });
};
