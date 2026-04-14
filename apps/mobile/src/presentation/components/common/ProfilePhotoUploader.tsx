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
import { crossAlert } from '../../utils/crossPlatformAlert';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { spacing, fontSizes, fontWeights } from '../../theme';
import type { Colors } from '../../theme';
import { getAccessToken, tryRefresh } from '../../../infra/http/api-client';
import { env } from '../../../infra/env';
import { generateRequestId } from '../../../infra/http/request-id';
import { useTheme } from '../../context/ThemeContext';

const GENERAL_UPLOAD_PATH = '/api/v1/uploads/image';

type Props = {
  currentPhotoUrl: string | null;
  uploadPath?: string; // e.g. '/api/v1/students/{id}/photo' — defaults to general upload
  onPhotoUploaded: (url: string) => void;
  size?: number;
  testID?: string;
};

export function ProfilePhotoUploader({
  currentPhotoUrl,
  uploadPath,
  onPhotoUploaded,
  size = 100,
  testID = 'profile-photo-uploader',
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(currentPhotoUrl);

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

  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}
      onPress={pickImage}
      disabled={uploading}
      testID={testID}
      accessibilityLabel="Upload profile photo"
      accessibilityRole="button"
    >
      {uploading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : resolvedUri ? (
        <Image
          source={{ uri: resolvedUri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          testID={`${testID}-image`}
        />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={styles.placeholderText}>+</Text>
          <Text style={styles.placeholderLabel}>Photo</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  container: {
    alignSelf: 'center',
    marginBottom: spacing.base,
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
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
});
