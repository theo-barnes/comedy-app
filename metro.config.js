// Metro configuration wrapped by Sentry so release builds upload source maps
// and errors symbolicate correctly. See https://docs.expo.dev/guides/using-sentry/
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web' && moduleName === '@supabase/supabase-js') {
    return context.resolveRequest(context, '@supabase/supabase-js/dist/index.cjs', platform);
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
