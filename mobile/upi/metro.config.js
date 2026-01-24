const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional file extensions if needed
config.resolver.assetExts.push('db', 'mp3', 'ttf', 'obj', 'png', 'jpg');

// Add Node.js polyfills for React Native
config.resolver.alias = {
  ...config.resolver.alias,
  'crypto': require.resolve('expo-crypto'),
  'stream': require.resolve('readable-stream'),
  'url': require.resolve('react-native-url-polyfill'),
  'events': require.resolve('events'),
  'util': require.resolve('util'),
  'buffer': require.resolve('buffer'),
};

// Ensure these modules are treated as source code
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;