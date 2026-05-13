/* eslint-disable @typescript-eslint/no-require-imports */

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(() => Promise.resolve(true)),
  getGenericPassword: jest.fn(() => Promise.resolve(false)),
  resetGenericPassword: jest.fn(() => Promise.resolve(true)),
  ACCESSIBLE: { WHEN_UNLOCKED: 'WHEN_UNLOCKED' },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }) => React.createElement(View, null, children),
    SafeAreaView: ({ children }) => React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

// Mock ThemeContext — provide lightColors by default in tests
jest.mock('./src/presentation/context/ThemeContext', () => {
  const { lightColors } = require('./src/presentation/theme');
  return {
    useTheme: () => ({
      colors: lightColors,
      isDark: false,
      mode: 'light',
      setMode: jest.fn(),
    }),
    ThemeProvider: ({ children }) => children,
  };
});

// Mock react-native-screens
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  Screen: 'Screen',
  ScreenContainer: 'ScreenContainer',
  NativeScreen: 'NativeScreen',
  NativeScreenContainer: 'NativeScreenContainer',
  ScreenStack: 'ScreenStack',
  ScreenStackHeaderConfig: 'ScreenStackHeaderConfig',
}));

// Default mock for @react-navigation/native. Many screen specs render their
// component outside a real NavigationContainer, so the hooks (useNavigation,
// useRoute, useFocusEffect, useIsFocused) need stubs that return safe values
// rather than null contexts. Specs that need custom navigation behavior
// override this with their own jest.mock() at the top of the spec file.
jest.mock('@react-navigation/native', () => {
  const noop = () => {};
  return {
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      replace: jest.fn(),
      push: jest.fn(),
      dispatch: jest.fn(),
      addListener: jest.fn(() => noop),
      setOptions: jest.fn(),
      canGoBack: jest.fn(() => false),
      reset: jest.fn(),
    }),
    useRoute: () => ({ params: {}, name: 'TestScreen', key: 'test' }),
    // Run the focus callback synchronously so screens with first-mount side
    // effects (deep-link consumption, list refresh) actually exercise that
    // code path. A no-op would silently skip those branches and hide bugs.
    useFocusEffect: (cb) => {
      const cleanup = cb();
      if (typeof cleanup === 'function') return cleanup;
    },
    useIsFocused: () => true,
    NavigationContainer: ({ children }) => children,
    DefaultTheme: { colors: {} },
    DarkTheme: { colors: {} },
    StackActions: {
      push: jest.fn(),
      pop: jest.fn(),
      replace: jest.fn(),
    },
    CommonActions: {
      navigate: jest.fn(),
      reset: jest.fn(),
      goBack: jest.fn(),
    },
  };
});
