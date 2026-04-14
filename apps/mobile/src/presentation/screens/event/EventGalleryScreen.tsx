import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { crossAlert } from '../../utils/crossPlatformAlert';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import type { GalleryPhoto } from '../../../domain/event/event-gallery.types';
import * as galleryApi from '../../../infra/event/event-gallery-api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonTile } from '../../components/ui/SkeletonTile';
import { InlineError } from '../../components/ui/InlineError';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmSheet } from '../../components/ui/ConfirmSheet';
import { GalleryThumbnail, AddPhotoTile } from '../../components/event/GalleryThumbnail';
import { spacing, fontSizes, fontWeights, listDefaults } from '../../theme';
import type { Colors } from '../../theme';
import { env } from '../../../infra/env';

type GalleryRoute = RouteProp<MoreStackParamList, 'EventGallery'>;
type Nav = NativeStackNavigationProp<MoreStackParamList, 'EventGallery'>;

const NUM_COLUMNS = 3;
const GRID_GAP = 6;

function resolveUrl(url: string): string {
  return url.startsWith('http') ? url : `${env.API_BASE_URL}${url}`;
}

export function EventGalleryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const route = useRoute<GalleryRoute>();
  const { eventId, eventTitle: _eventTitle } = route.params;
  const canUpload = user?.role === 'OWNER' || user?.role === 'STAFF';

  const { width: screenWidth } = useWindowDimensions();
  const tileSize = Math.floor(
    (screenWidth - spacing.base * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS,
  );

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GalleryPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      setError(null);

      try {
        const result = await galleryApi.listGalleryPhotos(eventId);
        if (!mountedRef.current) return;

        if (result.ok) {
          setPhotos(result.value);
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        if (__DEV__) console.error('[EventGalleryScreen] load failed:', err);
        setError('Something went wrong. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // Refresh when returning from PhotoViewer (e.g. after delete)
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const handleUpload = useCallback(async (asset: {
    uri?: string;
    fileName?: string;
    type?: string;
  }) => {
    if (!asset.uri) return;
    setUploading(true);

    try {
      const result = await galleryApi.uploadGalleryPhoto(
        eventId,
        asset.uri,
        asset.fileName || 'photo.jpg',
        asset.type || 'image/jpeg',
      );

      if (!mountedRef.current) return;

      if (result.ok) {
        showToast('Photo uploaded');
        load();
      } else {
        crossAlert('Upload Failed', result.error.message);
      }
    } catch (err) {
      if (__DEV__) console.error('[EventGalleryScreen] handleUpload failed:', err);
      crossAlert('Upload Failed', 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [eventId, load, showToast]);

  const handleBatchUpload = useCallback(async (
    assets: { uri?: string; fileName?: string; type?: string }[],
  ) => {
    setUploading(true);

    try {
      const uploadPromises = assets
        .filter((asset) => !!asset.uri)
        .map((asset) =>
          galleryApi.uploadGalleryPhoto(
            eventId,
            asset.uri!,
            asset.fileName || 'photo.jpg',
            asset.type || 'image/jpeg',
          ),
        );

      const results = await Promise.allSettled(uploadPromises);

      if (!mountedRef.current) return;

      let successCount = 0;
      let lastError = '';

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.ok) {
          successCount++;
        } else if (result.status === 'fulfilled' && !result.value.ok) {
          lastError = result.value.error.message;
        } else if (result.status === 'rejected') {
          lastError = 'Something went wrong. Please try again.';
        }
      }

      if (successCount > 0) {
        showToast(
          successCount === 1
            ? 'Photo uploaded'
            : `${successCount} photos uploaded`,
        );
        load();
      }
      if (lastError) {
        crossAlert('Some Uploads Failed', lastError);
      }
    } catch (err) {
      if (__DEV__) console.error('[EventGalleryScreen] handleBatchUpload failed:', err);
      crossAlert('Upload Failed', 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [eventId, load, showToast]);

  const openGalleryPicker = useCallback(() => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8,
        selectionLimit: 5,
      },
      (response) => {
        if (response.assets && response.assets.length > 0) {
          void handleBatchUpload(response.assets);
        }
      },
    );
  }, [handleBatchUpload]);

  const pickAndUpload = useCallback(() => {
    // On web, directly open file picker (no Camera option)
    if (Platform.OS === 'web') {
      openGalleryPicker();
      return;
    }

    crossAlert('Add Photo', 'Choose an option', [
      {
        text: 'Camera',
        onPress: () => {
          launchCamera(
            { mediaType: 'photo', maxWidth: 1920, maxHeight: 1920, quality: 0.8 },
            (response) => {
              if (response.assets?.[0]) {
                void handleUpload(response.assets[0]);
              }
            },
          );
        },
      },
      {
        text: 'Gallery',
        onPress: () => openGalleryPicker(),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [openGalleryPicker, handleUpload]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const result = await galleryApi.deleteGalleryPhoto(eventId, deleteTarget.id);

      if (!mountedRef.current) return;

      if (result.ok) {
        setDeleteTarget(null);
        showToast('Photo deleted');
        load();
      } else {
        setDeleteError(result.error.message);
      }
    } catch (err) {
      if (__DEV__) console.error('[EventGalleryScreen] handleDelete failed:', err);
      setDeleteError('Failed to delete photo. Please try again.');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, eventId, load, showToast]);

  // Use sentinel item so the "Add Photo" tile sits in the grid alongside photos
  const ADD_SENTINEL: GalleryPhoto = useMemo(
    () => ({ id: '__add__', eventId, url: '', thumbnailUrl: null, caption: null, uploadedBy: '', uploadedByName: null, createdAt: '' }),
    [eventId],
  );

  const gridData = useMemo(
    () => (canUpload ? [ADD_SENTINEL, ...photos] : photos),
    [canUpload, photos, ADD_SENTINEL],
  );

  const renderItem = useCallback(
    ({ item }: { item: GalleryPhoto }) => {
      if (item.id === '__add__') {
        return (
          <AddPhotoTile
            size={tileSize}
            onPress={pickAndUpload}
            testID="add-photo-tile"
          />
        );
      }
      const photoIndex = photos.indexOf(item);
      return (
        <GalleryThumbnail
          url={resolveUrl(item.thumbnailUrl || item.url)}
          size={tileSize}
          onPress={() =>
            navigation.navigate('PhotoViewer', {
              eventId,
              photos,
              initialIndex: photoIndex >= 0 ? photoIndex : 0,
            })
          }
          onLongPress={
            canUpload
              ? () => setDeleteTarget(item)
              : undefined
          }
          testID={`gallery-thumb-${item.id}`}
        />
      );
    },
    [tileSize, eventId, photos, canUpload, navigation, pickAndUpload],
  );

  const keyExtractor = useCallback((item: GalleryPhoto) => item.id, []);

  if (loading && !refreshing) {
    return (
      <View style={styles.content} testID="skeleton-container">
        <SkeletonTile />
        <SkeletonTile />
        <SkeletonTile />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.content}>
        <InlineError message={error} onRetry={load} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {uploading && (
        <View style={styles.uploadingBanner}>
          <ActivityIndicator size="small" color={colors.white} />
          <Text style={styles.uploadingText}>Uploading photos...</Text>
        </View>
      )}

      {photos.length === 0 && !canUpload ? (
        <EmptyState
          icon="image-off-outline"
          message="No photos yet"
          subtitle="Photos will appear here once uploaded"
        />
      ) : (
        <FlatList
          data={gridData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          testID="gallery-grid"
        />
      )}

      <ConfirmSheet
        visible={deleteTarget !== null}
        title="Delete Photo"
        message={
          deleteError
            ? deleteError
            : 'Are you sure you want to delete this photo?'
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        loading={deleting}
        testID="delete-photo-confirm"
      />
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      padding: spacing.base,
    },
    grid: {
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
      paddingBottom: listDefaults.contentPaddingBottomNoFab,
    },
    row: {
      gap: GRID_GAP + 2,
      marginBottom: GRID_GAP + 2,
    },
    uploadingBanner: {
      flexDirection: 'row',
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.base,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    uploadingText: {
      color: colors.white,
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
    },
  });
