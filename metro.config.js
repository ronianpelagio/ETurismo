// metro.config.js
// Required for NativeWind v4 + React Native Reanimated v4 + Expo SDK 54
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Enable CSS support for NativeWind
config.resolver.sourceExts.push('mjs', 'cjs');

module.exports = withNativeWind(config, {
  input: './global.css', // entry CSS file for NativeWind
});
