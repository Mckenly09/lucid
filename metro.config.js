const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");
const path = require("node:path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = withNativewind(getDefaultConfig(__dirname));

// shortcut: react-native-css's 'react-native' wrapper omits AssetRegistry (RN 0.88), so expo-asset gets undefined; drop once react-native-css re-exports it.
const nativewindResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) =>
  moduleName === "react-native" &&
  context.originModulePath.includes(`${path.sep}expo-asset${path.sep}`)
    ? context.resolveRequest(context, moduleName, platform)
    : nativewindResolve(context, moduleName, platform);

module.exports = config;
