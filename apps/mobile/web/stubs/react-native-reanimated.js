// Web stub for react-native-reanimated.
// react-native-gesture-handler's v2 modules optionally import reanimated;
// on web we don't run those animations, so we expose a minimal no-op surface
// that satisfies the `import` sites without providing real animation behavior.

const noop = () => {};
const passthrough = (v) => v;

export const useSharedValue = (initial) => ({ value: initial });
export const useAnimatedStyle = () => ({});
export const useAnimatedGestureHandler = () => ({});
export const useAnimatedReaction = noop;
export const useDerivedValue = (fn) => ({ value: typeof fn === 'function' ? fn() : undefined });

export const runOnJS = (fn) => (...args) => (typeof fn === 'function' ? fn(...args) : undefined);
export const runOnUI = (fn) => (...args) => (typeof fn === 'function' ? fn(...args) : undefined);

export const withTiming = passthrough;
export const withSpring = passthrough;
export const withDelay = (_, v) => v;
export const withSequence = (...args) => args[args.length - 1];
export const withRepeat = passthrough;
export const cancelAnimation = noop;

export const Easing = new Proxy({}, { get: () => passthrough });

export const Extrapolate = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };
export const Extrapolation = Extrapolate;

export const interpolate = (value) => value;
export const interpolateColor = (_v, _i, outputRange) => (outputRange && outputRange[0]) || '#000';

export const createAnimatedComponent = (Component) => Component;

const Animated = {
  View: undefined,
  Text: undefined,
  Image: undefined,
  ScrollView: undefined,
  createAnimatedComponent,
};

export default Animated;
