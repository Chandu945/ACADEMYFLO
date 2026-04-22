import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { crossAlert } from '../../utils/crossPlatformAlert';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { spacing, fontSizes, fontWeights, radius, gradient } from '../../theme';
import type { Colors } from '../../theme';
import { getAccessToken, tryRefresh } from '../../../infra/http/api-client';
import { env } from '../../../infra/env';
import { generateRequestId } from '../../../infra/http/request-id';
import { useTheme } from '../../context/ThemeContext';
import { AppIcon } from '../ui/AppIcon';

const GENERAL_UPLOAD_PATH = '/api/v1/uploads/image';

type Props = {
  currentPhotoUrl: string | null;
  uploadPath?: string; // e.g. '/api/v1/students/{id}/photo' — defaults to general upload
  onPhotoUploaded: (url: string) => void;
  size?: number;
  testID?: string;
  /** If provided, renders a solid neutral circle with initials (no gradient) as
   *  the fallback when there's no uploaded photo yet. */
  fallbackName?: string;
  /**
   * 'circle' (default) → all states use circular shape (size/2 radius).
   * 'rounded' → all states use a rounded square (radius.xl). Pairs with the
   * camera-icon-in-dashed-tile placeholder look used on student/staff forms.
   */
  shape?: 'circle' | 'rounded';
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

export function ProfilePhotoUploader({
  currentPhotoUrl,
  uploadPath,
  onPhotoUploaded,
  size = 100,
  testID = 'profile-photo-uploader',
  fallbackName,
  shape = 'circle',
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(currentPhotoUrl);
  const [loadError, setLoadError] = useState(false);

  // Reset the error flag whenever the source URL changes so a fresh upload gets a
  // clean shot at rendering.
  React.useEffect(() => setLoadError(false), [photoUrl]);

  const effectivePath = uploadPath || GENERAL_UPLOAD_PATH;

  const uploadPhoto = useCallback(async (asset: {
    uri?: string;
    fileName?: string;
    type?: string;
  }) => {
    if (!asset.uri) return;

    setUploading(true);
    try {
      const formData = new FormData();
      const fileName = asset.fileName || 'photo.jpg';
      const mimeType = asset.type || 'image/jpeg';

      if (Platform.OS === 'web') {
        // On web, convert data URI or blob URL to a proper File object
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        formData.append('file', new File([blob], fileName, { type: mimeType }));
      } else {
        // On native, use the RN-style object
        formData.append('file', {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        } as unknown as Blob);
      }

      const token = getAccessToken();
      const makeHeaders = (t: string | null) => ({
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        'X-Request-Id': generateRequestId(),
      });

      let res = await fetch(`${env.API_BASE_URL}${effectivePath}`, {
        method: 'POST',
        headers: makeHeaders(token),
        body: formData,
      });

      if (res.status === 401) {
        const newToken = await tryRefresh();
        if (newToken) {
          res = await fetch(`${env.API_BASE_URL}${effectivePath}`, {
            method: 'POST',
            headers: makeHeaders(newToken),
            body: formData,
          });
        }
      }

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || json?.error || 'Upload failed');
      }

      const json = (await res.json()) as { data: { url: string } };
      setPhotoUrl(json.data.url);
      onPhotoUploaded(json.data.url);
    } catch (e) {
      crossAlert('Upload Failed', e instanceof Error ? e.message : 'Could not upload photo');
    } finally {
      setUploading(false);
    }
  }, [effectivePath, onPhotoUploaded]);

  const openGallery = useCallback(() => {
    launchImageLibrary(
      { mediaType: 'photo', maxWidth: 1024, maxHeight: 1024, quality: 0.8 },
      (response) => {
        if (response.assets?.[0]) {
          void uploadPhoto(response.assets[0]);
        }
      },
    );
  }, [uploadPhoto]);

  const pickImage = useCallback(() => {
    // On web, skip the Camera/Gallery dialog — directly open file picker
    if (Platform.OS === 'web') {
      openGallery();
      return;
    }

    crossAlert('Profile Photo', 'Choose an option', [
      {
        text: 'Camera',
        onPress: () => {
          launchCamera(
            { mediaType: 'photo', maxWidth: 1024, maxHeight: 1024, quality: 0.8 },
            (response) => {
              if (response.assets?.[0]) {
                void uploadPhoto(response.assets[0]);
              }
            },
          );
        },
      },
      {
        text: 'Gallery',
        onPress: () => openGallery(),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [uploadPhoto, openGallery]);

  const resolvedUri = photoUrl
    ? photoUrl.startsWith('http')
      ? photoUrl
      : `${env.API_BASE_URL}${photoUrl}`
    : null;

  const hasPhoto = !!resolvedUri && !loadError;
  const showInitials = !hasPhoto && !uploading && !!fallbackName;
  const borderRadiusValue =
    shape === 'rounded' ? Math.round(size * 0.26) : size / 2;
  const badgeSize = Math.max(24, Math.round(size * 0.3));

  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size }]}
      onPress={pickImage}
      disabled={uploading}
      testID={testID}
      accessibilityLabel="Upload profile photo"
      accessibilityRole="button"
      activeOpacity={0.85}
    >
      {uploading ? (
        <View
          style={[
            styles.uploadingWrap,
            { width: size, height: size, borderRadius: borderRadiusValue },
          ]}
        >
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : hasPhoto ? (
        <Image
          source={{ uri: resolvedUri! }}
          style={[styles.image, { width: size, height: size, borderRadius: borderRadiusValue }]}
          testID={`${testID}-image`}
          onError={() => setLoadError(true)}
        />
      ) : showInitials ? (
        <View
          style={[
            styles.solidFallback,
            { width: size, height: size, borderRadius: borderRadiusValue },
          ]}
        >
          <Text style={[styles.solidFallbackText, { fontSize: Math.round(size * 0.38) }]}>
            {getInitials(fallbackName!)}
          </Text>
        </View>
      ) : shape === 'rounded' ? (
        <View
          style={[
            styles.placeholderTile,
            { width: size, height: size, borderRadius: borderRadiusValue },
          ]}
        >
          <AppIcon name="camera-outline" size={Math.round(size * 0.38)} color={colors.textSecondary} />
        </View>
      ) : (
        <View
          style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <Text style={styles.placeholderText}>+</Text>
          <Text style={styles.placeholderLabel}>Photo</Text>
        </View>
      )}
      {shape === 'rounded' && !uploading && !hasPhoto && !showInitials ? (
        <View
          pointerEvents="none"
          style={[
            styles.addBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: Math.round(badgeSize * 0.26),
              borderColor: colors.bg,
            },
          ]}
        >
          <LinearGradient
            colors={[gradient.start, gradient.end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppIcon name="plus" size={Math.round(badgeSize * 0.6)} color="#FFFFFF" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    alignSelf: 'center',
    marginBottom: spacing.base,
  },
  image: {
    resizeMode: 'cover',
  },
  uploadingWrap: {
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    backgroundColor: colors.bgSubtle,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderTile: {
    backgroundColor: colors.bgSubtle,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.textDisabled,
  },
  placeholderLabel: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    marginTop: 2,
  },
  solidFallback: {
    backgroundColor: colors.bgSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidFallbackText: {
    fontWeight: fontWeights.bold,
    color: colors.textMedium,
    letterSpacing: 0.5,
  },
  addBadge: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    overflow: 'hidden',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
