const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.cacheStores = [
  new (require("metro-cache").FileStore)({
    root: path.join(__dirname, "node_modules", ".cache", "metro"),
  }),
];

config.resolver.sourceExts = [...config.resolver.sourceExts, "mjs"];
config.resolver.assetExts = [...config.resolver.assetExts, "html"];

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
