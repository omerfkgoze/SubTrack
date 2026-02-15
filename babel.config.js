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
      'react-native-worklets/plugin', // MUST be before reanimated
      'react-native-reanimated/plugin', // MUST be LAST plugin
    ],
  };
};
