const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const defaultGetModulesRunBeforeMainModule = config.serializer.getModulesRunBeforeMainModule;
const polyfillsModule = path.resolve(__dirname, "src/polyfills.ts");

config.serializer.getModulesRunBeforeMainModule = (...args) => {
  const modules = defaultGetModulesRunBeforeMainModule
    ? defaultGetModulesRunBeforeMainModule(...args)
    : [];
  const withoutPolyfill = modules.filter((modulePath) => modulePath !== polyfillsModule);

  if (withoutPolyfill.length === 0) {
    return [polyfillsModule];
  }

  const [initializeCore, ...rest] = withoutPolyfill;
  return [initializeCore, polyfillsModule, ...rest];
};

module.exports = config;
