import { Platform, Vibration } from 'react-native';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export function lightHaptic() {
  if (isNative) {
    Vibration.vibrate(10);
  }
}

export function mediumHaptic() {
  if (isNative) {
    Vibration.vibrate(25);
  }
}
