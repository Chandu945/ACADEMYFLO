import React, { useState, useCallback, useMemo, useRef } from 'react';
import type { TextInput } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Keyboard,
  Pressable,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Screen } from '../../components/ui/Screen';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { InlineError } from '../../components/ui/InlineError';
import { AppIcon } from '../../components/ui/AppIcon';
import { crossAlert } from '../../utils/crossPlatformAlert';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, shadows, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

const PINCODE_REGEX = /^\d{6}$/;

export function AcademySetupScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { setupAcademy, logout } = useAuth();

  const [academyName, setAcademyName] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Refs for focus chain
  const line1Ref = useRef<TextInput>(null);
  const line2Ref = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const stateRef = useRef<TextInput>(null);
  const pincodeRef = useRef<TextInput>(null);
  const submittingRef = useRef(false);

  // --- Field change handlers ---

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleAcademyNameChange = useCallback((text: string) => {
    setAcademyName(text);
    clearFieldError('academyName');
    if (error) setError(null);
  }, [clearFieldError, error]);

  const handleLine1Change = useCallback((text: string) => {
    setLine1(text);
    clearFieldError('line1');
    if (error) setError(null);
  }, [clearFieldError, error]);

  const handleLine2Change = useCallback((text: string) => {
    setLine2(text);
    clearFieldError('line2');
    if (error) setError(null);
  }, [clearFieldError, error]);

  const handleCityChange = useCallback((text: string) => {
    setCity(text);
    clearFieldError('city');
    if (error) setError(null);
  }, [clearFieldError, error]);

  const handleStateChange = useCallback((text: string) => {
    setStateName(text);
    clearFieldError('state');
    if (error) setError(null);
  }, [clearFieldError, error]);

  const handlePincodeChange = useCallback((text: string) => {
    setPincode(text);
    clearFieldError('pincode');
    if (error) setError(null);
  }, [clearFieldError, error]);

  // --- Validation ---

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    const trimmedName = academyName.trim();
    if (!trimmedName) {
      errors['academyName'] = 'Academy name is required';
    } else if (trimmedName.length < 2) {
      errors['academyName'] = 'Academy name must be at least 2 characters';
    }
    if (!line1.trim()) errors['line1'] = 'Address line 1 is required';
    if (!city.trim()) errors['city'] = 'City is required';
    if (!stateName.trim()) errors['state'] = 'State is required';
    const trimmedPincode = pincode.trim();
    if (!trimmedPincode) {
      errors['pincode'] = 'Pincode is required';
    } else if (!PINCODE_REGEX.test(trimmedPincode)) {
      errors['pincode'] = 'Pincode must be 6 digits';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [academyName, line1, city, stateName, pincode]);

  // --- Submit ---

  const handleSetup = useCallback(async () => {
    if (submittingRef.current) return;
    Keyboard.dismiss();
    setError(null);
    if (!validate()) return;

    submittingRef.current = true;
    setLoading(true);
    try {
      const err = await setupAcademy({
        academyName: academyName.trim(),
        address: {
          line1: line1.trim(),
          line2: line2.trim() || undefined,
          city: city.trim(),
          state: stateName.trim(),
          pincode: pincode.trim(),
          country: 'India',
        },
      });

      if (err) {
        if (err.fieldErrors) {
          setFieldErrors(err.fieldErrors);
        }
        setError(err.message);
      }
    } catch {
      if (__DEV__) console.error('[AcademySetupScreen] Setup failed');
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }, [setupAcademy, validate, academyName, line1, line2, city, stateName, pincode]);

  const handleLogout = useCallback(() => {
    crossAlert(
      'Sign Out',
      'Are you sure you want to sign out? Your setup progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ],
    );
  }, [logout]);

  return (
    <Screen style={styles.screen} edges={['bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <Pressable style={styles.wrapper} onPress={Platform.OS !== 'web' ? Keyboard.dismiss : undefined} accessible={false}>
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.iconBadge}>
            <LinearGradient
              colors={[gradient.start, gradient.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <AppIcon name="domain" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.title} accessibilityRole="header">Set Up Your Academy</Text>
          <Text style={styles.subtitle}>
            Almost there! Tell us about your academy to get started.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {error ? <InlineError message={error} /> : null}

          <View style={styles.sectionLabel}>
            <AppIcon name="school-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.sectionLabelText}>Academy Details</Text>
          </View>

          <Input
            label="Academy Name"
            value={academyName}
            onChangeText={handleAcademyNameChange}
            error={fieldErrors['academyName']}
            placeholder="e.g. Sunrise Dance Academy"
            autoCapitalize="words"
            autoComplete="organization"
            maxLength={100}
            returnKeyType="next"
            onSubmitEditing={() => line1Ref.current?.focus()}
            testID="setup-name"
          />

          <View style={styles.divider} />

          <View style={styles.sectionLabel}>
            <AppIcon name="map-marker-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.sectionLabelText}>Address</Text>
          </View>

          <Input
            ref={line1Ref}
            label="Address Line 1"
            value={line1}
            onChangeText={handleLine1Change}
            error={fieldErrors['line1']}
            placeholder="Street address"
            autoComplete="street-address"
            textContentType="streetAddressLine1"
            maxLength={200}
            returnKeyType="next"
            onSubmitEditing={() => line2Ref.current?.focus()}
            testID="setup-line1"
          />

          <Input
            ref={line2Ref}
            label="Address Line 2 (Optional)"
            value={line2}
            onChangeText={handleLine2Change}
            error={fieldErrors['line2']}
            placeholder="Floor, suite, etc."
            textContentType="streetAddressLine2"
            maxLength={200}
            returnKeyType="next"
            onSubmitEditing={() => cityRef.current?.focus()}
            testID="setup-line2"
          />

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Input
                ref={cityRef}
                label="City"
                value={city}
                onChangeText={handleCityChange}
                error={fieldErrors['city']}
                placeholder="City"
                autoCapitalize="words"
                autoComplete="postal-address-locality"
                textContentType="addressCity"
                maxLength={50}
                returnKeyType="next"
                onSubmitEditing={() => stateRef.current?.focus()}
                testID="setup-city"
              />
            </View>
            <View style={styles.halfField}>
              <Input
                ref={stateRef}
                label="State"
                value={stateName}
                onChangeText={handleStateChange}
                error={fieldErrors['state']}
                placeholder="State"
                autoCapitalize="words"
                autoComplete="postal-address-region"
                textContentType="addressState"
                maxLength={50}
                returnKeyType="next"
                onSubmitEditing={() => pincodeRef.current?.focus()}
                testID="setup-state"
              />
            </View>
          </View>

          <Input
            ref={pincodeRef}
            label="Pincode"
            value={pincode}
            onChangeText={handlePincodeChange}
            error={fieldErrors['pincode']}
            placeholder="6-digit pincode"
            keyboardType="number-pad"
            autoComplete="postal-code"
            textContentType="postalCode"
            maxLength={6}
            returnKeyType="go"
            onSubmitEditing={handleSetup}
            testID="setup-pincode"
          />

          <Input
            label="Country"
            value="India"
            onChangeText={() => {}}
            editable={false}
            testID="setup-country"
          />

          <Button
            title={loading ? 'Setting up...' : 'Complete Setup'}
            onPress={handleSetup}
            loading={loading}
            testID="setup-submit"
          />
        </View>

        {/* Sign out link */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleLogout}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Sign out of your account"
            testID="setup-logout"
          >
            <View style={styles.logoutRow}>
              <AppIcon name="logout" size={16} color={colors.textSecondary} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Screen>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
  },
  wrapper: {
    paddingVertical: spacing.xl,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.base,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.md,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionLabelText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.base,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing['2xl'],
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  logoutText: {
    fontSize: fontSizes.base,
    color: colors.textSecondary,
    fontWeight: fontWeights.medium,
  },
});
