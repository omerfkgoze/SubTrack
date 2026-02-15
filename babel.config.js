module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@app': './src/app',
            '@features': './src/features',
            '@shared': './src/shared',
            '@config': './src/config',
          },
        },
      ],
      // react-native-worklets/plugin and react-native-reanimated/plugin
      // are automatically included by babel-preset-expo in SDK 54
    ],
  };
};
