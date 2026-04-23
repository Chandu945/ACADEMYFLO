import { Alert } from 'react-native';
import { getGlobalAlert } from '../context/AlertContext';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

/**
 * Cross-platform alert. Routes every call through the app's branded modal
 * (`AlertProvider`) so dark-mode, iOS, Android, and web all render the same
 * polished dialog. Falls back to the native `Alert.alert` only if the
 * provider happens not to be mounted (unlikely post-bootstrap).
 */
export function crossAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
): void {
  const showAlert = getGlobalAlert();
  if (showAlert) {
    showAlert(title, message, buttons);
    return;
  }
  Alert.alert(title, message, buttons);
}
