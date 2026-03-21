const React = require('react');
const { View } = require('react-native');

const WebView = React.forwardRef((props, ref) => {
  return React.createElement(View, { ...props, ref, testID: 'mock-webview' });
});

WebView.displayName = 'MockWebView';

module.exports = {
  __esModule: true,
  default: WebView,
  WebView,
};
