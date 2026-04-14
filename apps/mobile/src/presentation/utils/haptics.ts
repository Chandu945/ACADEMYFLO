import { Platform, Vibration } from 'react-native';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export function lightHaptic() {
  if (isNative) {
    try { Vibration.vibrate(10); } catch { /* permission missing */ }
  }
}

