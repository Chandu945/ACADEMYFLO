export default {
  open(options) {
    console.log('[react-native-share] Share not available on web', options);
    return Promise.resolve({});
  },
};
