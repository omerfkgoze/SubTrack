const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// When running in Expo Go (npm start), mock react-native-iap to avoid NitroModules crash.
// react-native-iap v14+ depends on react-native-nitro-modules which is not supported in Expo Go.
if (process.env.EXPO_PUBLIC_MOCK_IAP === 'true') {
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'react-native-iap') {
      return {
        filePath: path.resolve(__dirname, 'src/mocks/react-native-iap.ts'),
        type: 'sourceFile',
      };
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
