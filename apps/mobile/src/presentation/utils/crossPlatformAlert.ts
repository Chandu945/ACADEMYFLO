import { Alert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

/**
 * Cross-platform alert that works on both native and web.
 *
 * On native: uses React Native's Alert.alert with full button support.
 * On web: Alert.alert with button callbacks doesn't work — falls back to
 *   window.confirm for confirmation dialogs or window.alert for info dialogs.
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

  // Web fallback — use globalThis to access window.alert/confirm safely
  const g = globalThis as unknown as { alert: (msg: string) => void; confirm: (msg: string) => boolean };
  const displayMsg = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length === 0) {
    g.alert(displayMsg);
    return;
  }

  // Find the action button (non-cancel)
  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const actionButton = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];

  if (cancelButton && actionButton) {
    // Confirmation dialog
    const confirmed = g.confirm(displayMsg);
    if (confirmed) {
      actionButton?.onPress?.();
    } else {
      cancelButton?.onPress?.();
    }
  } else if (buttons.length === 1) {
    // Single button (OK-style)
    g.alert(displayMsg);
    buttons[0]?.onPress?.();
  } else {
    // Multiple non-cancel buttons — show confirm for first action
    const confirmed = g.confirm(displayMsg);
    if (confirmed) {
      actionButton?.onPress?.();
    }
  }
}
