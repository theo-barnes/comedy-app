// Metro configuration wrapped by Sentry so release builds upload source maps
// and errors symbolicate correctly. See https://docs.expo.dev/guides/using-sentry/
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

module.exports = config;
