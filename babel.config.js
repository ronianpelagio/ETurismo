// babel.config.js
// SDK 54 note: babel-preset-expo automatically handles the reanimated plugin.
// Do NOT manually add 'react-native-reanimated/plugin' or 'react-native-worklets/plugin'.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'nativewind',
        },
      ],
    ],
  };
};
