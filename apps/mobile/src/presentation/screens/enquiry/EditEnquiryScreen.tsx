import React, { useState, useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import { EnquiryFormScreen } from './EnquiryFormScreen';
import { getEnquiryDetail } from '../../../infra/enquiry/enquiry-api';
import type { EnquiryDetail } from '../../../domain/enquiry/enquiry.types';
import { spacing, fontSizes, fontWeights, radius } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type Route = RouteProp<MoreStackParamList, 'EditEnquiry'>;

/** Resolves the route params into a real EnquiryDetail before mounting
 *  the form. On web URL refresh the route's `enquiry` object gets
 *  toString'd to "[object Object]" — fall back to fetching by `enquiryId`. */
export function EditEnquiryScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const paramEnquiryRaw = route.params?.enquiry as unknown;
  const paramEnquiry =
    paramEnquiryRaw &&
    typeof paramEnquiryRaw === 'object' &&
    !Array.isArray(paramEnquiryRaw) &&
    typeof (paramEnquiryRaw as { id?: unknown }).id === 'string'
      ? (paramEnquiryRaw as EnquiryDetail)
      : undefined;
  const enquiryId = route.params?.enquiryId ?? paramEnquiry?.id;

  const [fetched, setFetched] = useState<EnquiryDetail | null>(null);
  const [resolving, setResolving] = useState(!paramEnquiry && !!enquiryId);

  useEffect(() => {
    if (paramEnquiry || !enquiryId) return;
    let cancelled = false;
    setResolving(true);
    getEnquiryDetail(enquiryId)
      .then((r) => {
        if (cancelled) return;
        if (r.ok) setFetched(r.value);
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paramEnquiry, enquiryId]);

  const enquiry = paramEnquiry ?? fetched ?? undefined;

  if (resolving) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Loading enquiry…</Text>
      </SafeAreaView>
    );
  }

  if (!enquiry) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.title}>Couldn't load this enquiry</Text>
        <Text style={styles.text}>Open the form again from the enquiries list.</Text>
        <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <EnquiryFormScreen mode="edit" enquiry={enquiry} />
    </SafeAreaView>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.md,
    },
    title: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      textAlign: 'center',
    },
    text: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    btn: {
      marginTop: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.full,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primaryLight,
    },
    btnText: {
      color: colors.primary,
      fontWeight: fontWeights.bold,
      fontSize: fontSizes.sm,
    },
  });
