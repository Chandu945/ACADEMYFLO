import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { colors, spacing, fontSizes, fontWeights } from '../../theme';
import { getAccessToken } from '../../../infra/http/api-client';
import { env } from '../../../infra/env';
import { generateRequestId } from '../../../infra/http/request-id';

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
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(currentPhotoUrl);

  const effectivePath = uploadPath || GENERAL_UPLOAD_PATH;

  const pickImage = useCallback(() => {
    Alert.alert('Profile Photo', 'Choose an option', [
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
        onPress: () => {
          launchImageLibrary(
            { mediaType: 'photo', maxWidth: 1024, maxHeight: 1024, quality: 0.8 },
            (response) => {
              if (response.assets?.[0]) {
                void uploadPhoto(response.assets[0]);
              }
            },
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [effectivePath]);

  const uploadPhoto = async (asset: {
    uri?: string;
    fileName?: string;
    type?: string;
  }) => {
    if (!asset.uri) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || 'photo.jpg',
        type: asset.type || 'image/jpeg',
      } as unknown as Blob);

      const token = getAccessToken();
      const res = await fetch(`${env.API_BASE_URL}${effectivePath}`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Request-Id': generateRequestId(),
        },
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || 'Upload failed');
      }

      const json = (await res.json()) as { data: { url: string } };
      setPhotoUrl(json.data.url);
      onPhotoUploaded(json.data.url);
    } catch (e) {
      Alert.alert('Upload Failed', e instanceof Error ? e.message : 'Could not upload photo');
    } finally {
      setUploading(false);
    }
  };

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

const styles = StyleSheet.create({
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
