const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const defaultConfig = getDefaultConfig(projectRoot);

const mobileModules = path.resolve(projectRoot, 'node_modules');
const rootModules = path.resolve(monorepoRoot, 'node_modules');

// Escape special regex characters in path
function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
}

const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      mobileModules,
      rootModules,
    ],
    // Force React to resolve from mobile workspace (React 18) not root (React 19)
    extraNodeModules: {
      react: path.resolve(mobileModules, 'react'),
      'react-native': path.resolve(mobileModules, 'react-native'),
    },
    // Block ONLY root react and react-dom (not react-native, react-navigation, etc.)
    blockList: exclusionList([
      new RegExp(esc(rootModules) + '\\/react\\/.*'),
      new RegExp(esc(rootModules) + '\\/react-dom\\/.*'),
    ]),
  },
};

module.exports = mergeConfig(defaultConfig, config);
