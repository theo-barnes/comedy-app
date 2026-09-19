module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
    env: {
      // Jest's CJS VM cannot execute native dynamic import().
      test: {
        plugins: ['babel-plugin-dynamic-import-node'],
      },
    },
  };
};
