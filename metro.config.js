// Guía: Configura el empaquetado de Metro y la integración con Uniwind y Sentry.

const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withUniwindConfig } = require('uniwind/metro');

const config = getSentryExpoConfig(__dirname);
config.resolver.assetExts.push('wasm');
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  middleware(req, res, next);
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
