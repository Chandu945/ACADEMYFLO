import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, StyleSheet, Linking } from 'react-native';
import Share from 'react-native-share';
import type { AppError } from '../../../domain/common/errors';
import type { Result } from '../../../domain/common/result';
import type { PdfExportResult } from '../../../domain/reports/reports.types';
import LinearGradient from 'react-native-linear-gradient';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

type ExportState = 'idle' | 'downloading' | 'success' | 'error';

type ExportButtonProps = {
  onExport: () => Promise<Result<PdfExportResult, AppError>>;
  testID?: string;
};

export function ExportButton({ onExport, testID }: ExportButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [state, setState] = useState<ExportState>('idle');
  const [result, setResult] = useState<PdfExportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setState('downloading');
    setErrorMsg(null);

    const res = await onExport();

    if (res.ok) {
      setResult(res.value);
      setState('success');
    } else {
      setErrorMsg(res.error.message);
      setState('error');
    }
  }, [onExport]);

  const handleOpen = useCallback(async () => {
    if (!result) return;
    // Android 7+ refuses Linking.openURL on file:// URIs (FileUriExposedException)
    // and silently does nothing — that's the bug users hit. react-native-share
    // wraps the file via FileProvider internally; passing showAppsToView: true
    // makes it dispatch ACTION_VIEW instead of ACTION_SEND, so the OS launches
    // the default PDF viewer (or shows a "Open with…" chooser if multiple
    // viewers are installed). iOS can still use Linking against the local path.
    try {
      if (Platform.OS === 'android') {
        await Share.open({
          url: `file://${result.filePath}`,
          type: 'application/pdf',
          filename: result.filename,
          showAppsToView: true,
          failOnCancel: false,
        });
      } else {
        await Linking.openURL(result.filePath);
      }
    } catch {
      setErrorMsg('Unable to open file. You can still share it.');
    }
  }, [result]);

  const handleShare = useCallback(async () => {
    if (!result) return;
    try {
      await Share.open({
        url: Platform.OS === 'android'
          ? `file://${result.filePath}`
          : result.filePath,
        type: 'application/pdf',
        filename: result.filename,
      });
    } catch {
      // User cancelled share — not an error
    }
  }, [result]);

  const handleRetry = useCallback(() => {
    setState('idle');
    setErrorMsg(null);
    setResult(null);
  }, []);

  if (state === 'downloading') {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.progressRow} testID={`${testID}-downloading`}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.progressText}>Downloading PDF...</Text>
        </View>
      </View>
    );
  }

  if (state === 'success' && result) {
    return (
      <View style={styles.container} testID={testID}>
        <Text style={styles.successText} testID={`${testID}-success`}>
          PDF saved ({Math.round(result.sizeBytes / 1024)} KB)
        </Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleOpen}
            testID={`${testID}-open`}
          >
            <LinearGradient
              colors={[gradient.start, gradient.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.actionText}>Open</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShare}
            testID={`${testID}-share`}
          >
            <LinearGradient
              colors={[gradient.start, gradient.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnSecondary}
            onPress={handleRetry}
            testID={`${testID}-done`}
          >
            <Text style={styles.actionTextSecondary}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.container} testID={testID}>
        <Text style={styles.errorText} testID={`${testID}-error`}>
          {errorMsg}
        </Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={handleRetry}
          testID={`${testID}-retry`}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // idle
  return (
    <View style={styles.container} testID={testID}>
      <TouchableOpacity
        style={styles.exportBtn}
        onPress={handleExport}
        testID={`${testID}-trigger`}
      >
        <Text style={styles.exportBtnText}>Export PDF</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  exportBtn: {
    backgroundColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  exportBtnText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.textMedium,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  progressText: {
    fontSize: fontSizes.base,
    color: colors.text,
  },
  successText: {
    fontSize: fontSizes.sm,
    color: colors.success,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  actionBtn: {
    overflow: 'hidden',
    borderRadius: radius.base,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  actionText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.white,
  },
  actionBtnSecondary: {
    backgroundColor: colors.border,
    borderRadius: radius.base,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  actionTextSecondary: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.textMedium,
  },
  errorText: {
    fontSize: fontSizes.base,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  retryBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  retryText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text,
  },
});
