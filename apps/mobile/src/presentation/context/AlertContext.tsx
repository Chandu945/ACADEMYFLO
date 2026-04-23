import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppIcon } from '../components/ui/AppIcon';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../theme';
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

/** Picks the leading icon + accent colour based on the alert's intent. */
function resolveAccent(buttons: AlertButton[], colors: Colors) {
  const isDestructive = buttons.some((b) => b.style === 'destructive');
  if (isDestructive) {
    return {
      icon: 'alert-circle-outline',
      iconColor: colors.danger,
      tileBg: `${colors.danger}22`,
      useGradient: false,
    };
  }
  return {
    icon: 'information-outline',
    iconColor: '#FFFFFF',
    tileBg: 'transparent',
    useGradient: true,
  };
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

  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (alert.visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }),
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.96);
    }
  }, [alert.visible, opacity, scale]);

  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setAlert({
      visible: true,
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
    });
  }, []);

  const showAlertRef = useRef(showAlert);
  showAlertRef.current = showAlert;
  globalShowAlert = showAlert;

  const handleButton = useCallback((button: AlertButton) => {
    setAlert((prev) => ({ ...prev, visible: false }));
    button.onPress?.();
  }, []);

  const dismiss = useCallback(() => {
    setAlert((prev) => {
      const cancelBtn = prev.buttons.find((b) => b.style === 'cancel');
      cancelBtn?.onPress?.();
      return { ...prev, visible: false };
    });
  }, []);

  const value = useMemo(() => ({ showAlert }), [showAlert]);

  const accent = resolveAccent(alert.buttons, colors);
  // Stack buttons vertically if there are 3+ or any label is long.
  const shouldStack =
    alert.buttons.length >= 3 ||
    alert.buttons.some((b) => b.text.length > 10);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <Modal
        visible={alert.visible}
        transparent
        animationType="none"
        onRequestClose={dismiss}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={dismiss}>
          <Animated.View
            style={[styles.modalWrap, { opacity, transform: [{ scale }] }]}
            // Swallow taps on the card so they don't bubble to the dismiss backdrop.
            onStartShouldSetResponder={() => true}
          >
            <Pressable style={styles.modal} onPress={() => { /* intercept */ }}>
              {/* Accent icon tile */}
              <View style={[styles.iconTile, { backgroundColor: accent.tileBg }]}>
                {accent.useGradient ? (
                  <LinearGradient
                    colors={[gradient.start, gradient.end]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconTileGradient}
                  />
                ) : null}
                <AppIcon name={accent.icon} size={26} color={accent.iconColor} />
              </View>

              <Text style={styles.title}>{alert.title}</Text>
              {alert.message ? (
                <Text style={styles.message}>{alert.message}</Text>
              ) : null}

              <View style={[styles.buttonRow, shouldStack && styles.buttonColumn]}>
                {alert.buttons.map((btn, i) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';
                  const isPrimary = !isCancel && !isDestructive;
                  return (
                    <Pressable
                      key={`${btn.text}-${i}`}
                      style={({ pressed }) => [
                        styles.button,
                        shouldStack && styles.buttonStacked,
                        isCancel && styles.cancelButton,
                        isDestructive && styles.destructiveButton,
                        isPrimary && styles.primaryButton,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => handleButton(btn)}
                    >
                      {isPrimary ? (
                        <LinearGradient
                          colors={[gradient.start, gradient.end]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.primaryGradient}
                        />
                      ) : null}
                      <Text
                        style={[
                          styles.buttonText,
                          isCancel && styles.cancelButtonText,
                          isDestructive && styles.destructiveButtonText,
                          isPrimary && styles.primaryButtonText,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </AlertContext.Provider>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(5,7,13,0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    modalWrap: {
      width: '100%',
      maxWidth: 380,
      alignItems: 'stretch',
    },
    modal: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      ...(Platform.OS === 'android' ? { elevation: 16 } : shadows.md),
    },
    iconTile: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginBottom: spacing.base,
    },
    iconTileGradient: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 18,
    },
    title: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: colors.text,
      textAlign: 'center',
      letterSpacing: -0.3,
      marginBottom: spacing.xs,
    },
    message: {
      fontSize: fontSizes.md,
      color: colors.textSecondary,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      width: '100%',
    },
    buttonColumn: {
      flexDirection: 'column-reverse',
    },
    button: {
      flex: 1,
      height: 48,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    buttonStacked: {
      flex: 0,
      width: '100%',
    },
    buttonPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    primaryButton: {
      backgroundColor: 'transparent',
    },
    primaryGradient: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radius.full,
    },
    cancelButton: {
      backgroundColor: colors.bgSubtle,
      borderWidth: 1,
      borderColor: colors.border,
    },
    destructiveButton: {
      backgroundColor: colors.danger,
    },
    buttonText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      letterSpacing: 0.1,
    },
    primaryButtonText: {
      color: '#FFFFFF',
    },
    cancelButtonText: {
      color: colors.textSecondary,
    },
    destructiveButtonText: {
      color: '#FFFFFF',
    },
  });
