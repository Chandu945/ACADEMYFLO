import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { spacing, fontSizes, fontWeights, radius, shadows } from '../theme';
import type { Colors } from '../theme';
import { useTheme } from './ThemeContext';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type AlertState = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
};

type AlertContextValue = {
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
};

const AlertContext = createContext<AlertContextValue>({
  showAlert: () => {},
});

export function useAlert() {
  return useContext(AlertContext);
}

// Global ref so crossAlert can call it without hooks
let globalShowAlert: ((title: string, message?: string, buttons?: AlertButton[]) => void) | null = null;

export function getGlobalAlert() {
  return globalShowAlert;
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: '',
    message: undefined,
    buttons: [],
  });

  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setAlert({
      visible: true,
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
    });
  }, []);

  // Register global ref
  const showAlertRef = useRef(showAlert);
  showAlertRef.current = showAlert;
  globalShowAlert = showAlert;

  const handleButton = useCallback((button: AlertButton) => {
    setAlert((prev) => ({ ...prev, visible: false }));
    button.onPress?.();
  }, []);

  const dismiss = useCallback(() => {
    setAlert((prev) => {
      // Call cancel button's onPress if exists
      const cancelBtn = prev.buttons.find((b) => b.style === 'cancel');
      cancelBtn?.onPress?.();
      return { ...prev, visible: false };
    });
  }, []);

  const value = useMemo(() => ({ showAlert }), [showAlert]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <Modal
        visible={alert.visible}
        transparent
        animationType="fade"
        onRequestClose={dismiss}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>{alert.title}</Text>
            {alert.message ? (
              <Text style={styles.message}>{alert.message}</Text>
            ) : null}
            <View style={styles.buttonRow}>
              {alert.buttons.map((btn, i) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.button,
                      isCancel && styles.cancelButton,
                      isDestructive && styles.destructiveButton,
                      !isCancel && !isDestructive && styles.defaultButton,
                    ]}
                    onPress={() => handleButton(btn)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isCancel && styles.cancelButtonText,
                        isDestructive && styles.destructiveButtonText,
                        !isCancel && !isDestructive && styles.defaultButtonText,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    modal: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
      width: '100%',
      maxWidth: 400,
      ...shadows.md,
    },
    title: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    message: {
      fontSize: fontSizes.base,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: spacing.lg,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
    },
    button: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      minWidth: 80,
      alignItems: 'center',
    },
    defaultButton: {
      backgroundColor: colors.primary,
    },
    cancelButton: {
      backgroundColor: colors.bgSubtle,
    },
    destructiveButton: {
      backgroundColor: colors.danger,
    },
    buttonText: {
      fontSize: fontSizes.base,
      fontWeight: fontWeights.semibold,
    },
    defaultButtonText: {
      color: colors.white,
    },
    cancelButtonText: {
      color: colors.textSecondary,
    },
    destructiveButtonText: {
      color: colors.white,
    },
  });
