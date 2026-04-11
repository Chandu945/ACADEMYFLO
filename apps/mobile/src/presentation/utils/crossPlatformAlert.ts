import { Alert, Platform } from 'react-native';
import { getGlobalAlert } from '../context/AlertContext';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

/**
 * Cross-platform alert that works on both native and web.
 *
 * On native: uses React Native's Alert.alert with full button support.
 * On web: uses a custom styled modal via AlertContext (no more ugly browser alerts).
 */
export function crossAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  // Web — use styled modal
  const showAlert = getGlobalAlert();
  if (showAlert) {
    showAlert(title, message, buttons);
  } else {
    // Fallback if AlertProvider not mounted yet
    const g = globalThis as unknown as { alert: (msg: string) => void };
    g.alert(message ? `${title}\n\n${message}` : title);
  }
}
