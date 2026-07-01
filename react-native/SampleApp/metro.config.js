const path = require('path');
const escape = require('escape-string-regexp');
const pak = require('./package.json');
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

// Build a blockList regex that excludes the parent node_modules for
// peer deps (to avoid duplicate module resolution in the monorepo layout)
// and the default /__tests__/ exclusion that Metro would normally add.
function makeBlockList(patterns) {
  const defaults = [/\/__tests__\/.*/];
  const all = patterns.concat(defaults);
  return new RegExp('(' + all.map(r => r.source).join('|') + ')$');
}

const root = path.resolve(__dirname, '..');

const modules = Object.keys({
  ...pak.peerDependencies,
});

const defaultConfig = getDefaultConfig(__dirname);
const { resolver: { sourceExts, assetExts } } = defaultConfig;
const config = {
        projectRoot: __dirname,
        watchFolders: [root],

        resolver: {  
            assetExts: assetExts.filter(ext => ext !== 'svg'),
            sourceExts: [...sourceExts, 'svg'],
            blockList: makeBlockList(
                modules.map(
                    (m) =>
                    new RegExp(`^${escape(path.join(root, 'node_modules', m))}\\/.*$`)
                )
            ),

            extraNodeModules: modules.reduce((acc, name) => {
              acc[name] = path.join(__dirname, 'node_modules', name);
              return acc;
            }, {}),
        },

        transformer: {
            getTransformOptions: async () => ({
                transform: {
                    inlineRequires: true,
                },
            }),
            babelTransformerPath: require.resolve('react-native-svg-transformer'),
        },
    };

module.exports = mergeConfig(defaultConfig, config);