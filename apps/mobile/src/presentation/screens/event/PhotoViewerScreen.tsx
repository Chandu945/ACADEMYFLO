import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Image,
  FlatList,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import RNShare from 'react-native-share';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MoreStackParamList } from '../../navigation/MoreStack';
import type { GalleryPhoto } from '../../../domain/event/event-gallery.types';
import * as galleryApi from '../../../infra/event/event-gallery-api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { ConfirmSheet } from '../../components/ui/ConfirmSheet';
import { spacing, fontSizes, fontWeights } from '../../theme';
import type { Colors } from '../../theme';
import { env } from '../../../infra/env';
import { getAccessToken } from '../../../infra/http/api-client';

type ViewerRoute = RouteProp<MoreStackParamList, 'PhotoViewer'>;

function resolveUrl(url: string): string {
  return url.startsWith('http') ? url : `${env.API_BASE_URL}${url}`;
}

export function PhotoViewerScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const route = useRoute<ViewerRoute>();
  const { eventId, photos: initialPhotos, initialIndex } = route.params;
  const canDelete = user?.role === 'OWNER' || user?.role === 'STAFF';

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [photos] = useState(initialPhotos);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [deleteTarget, setDeleteTarget] = useState<GalleryPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const flatListRef = useRef<FlatList<GalleryPhoto>>(null);

  const currentPhoto = photos[currentIndex];

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0]?.index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useMemo(
    () => ({ viewAreaCoveragePercentThreshold: 50 }),
    [],
  );

  const handleShare = useCallback(async () => {
    if (!currentPhoto) return;
    setSharing(true);

    const url = resolveUrl(currentPhoto.url);
    const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
    const tempPath = `${RNFS.CachesDirectoryPath}/gallery_share_${currentPhoto.id}.${ext}`;

    try {
      const token = getAccessToken();
      const downloadResult = await RNFS.downloadFile({
        fromUrl: url,
        toFile: tempPath,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).promise;

      if (downloadResult.statusCode !== 200) {
        throw new Error('Download failed');
      }

      const fileUri =
        Platform.OS === 'android' ? `file://${tempPath}` : tempPath;

      await RNShare.open({
        url: fileUri,
        type: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
        title: 'Share Photo',
      });
    } catch (e: unknown) {
      const isCancel =
        e instanceof Error &&
        (e.message.includes('cancel') || e.message.includes('dismiss'));
      if (!isCancel) {
        Alert.alert('Share Failed', 'Could not share this photo.');
      }
    } finally {
      RNFS.unlink(tempPath).catch(() => {});
      setSharing(false);
    }
  }, [currentPhoto]);

  const handleDownload = useCallback(async () => {
    if (!currentPhoto) return;

    const url = resolveUrl(currentPhoto.url);
    const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
    const destPath = `${RNFS.DocumentDirectoryPath}/PlayConnect_${currentPhoto.id}.${ext}`;

    try {
      const token = getAccessToken();
      const downloadResult = await RNFS.downloadFile({
        fromUrl: url,
        toFile: destPath,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).promise;

      if (downloadResult.statusCode === 200) {
        showToast('Photo saved');
      } else {
        Alert.alert('Download Failed', 'Could not download this photo.');
      }
    } catch {
      Alert.alert('Download Failed', 'Could not download this photo.');
    }
  }, [currentPhoto, showToast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    const result = await galleryApi.deleteGalleryPhoto(eventId, deleteTarget.id);
    setDeleting(false);

    if (result.ok) {
      setDeleteTarget(null);
      showToast('Photo deleted');
      navigation.goBack();
    } else {
      setDeleteError(result.error.message);
    }
  }, [deleteTarget, eventId, showToast, navigation]);

  const renderItem = useCallback(
    ({ item }: { item: GalleryPhoto }) => (
      <View style={{ width: screenWidth, height: screenHeight * 0.7 }}>
        <Image
          source={{ uri: resolveUrl(item.url) }}
          style={styles.fullImage}
          resizeMode="contain"
        />
      </View>
    ),
    [screenWidth, screenHeight, styles],
  );

  const keyExtractor = useCallback((item: GalleryPhoto) => item.id, []);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={photos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_data, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        testID="photo-viewer-list"
      />

      {/* Bottom info & actions bar */}
      <View style={styles.bottomBar}>
        {currentPhoto?.caption && (
          <Text style={styles.caption} numberOfLines={2}>
            {currentPhoto.caption}
          </Text>
        )}

        <View style={styles.metaRow}>
          {currentPhoto?.uploadedByName && (
            <Text style={styles.meta}>
              By {currentPhoto.uploadedByName}
            </Text>
          )}
          <Text style={styles.counter}>
            {currentIndex + 1} / {photos.length}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={styles.actionButton}
            onPress={handleShare}
            disabled={sharing}
            accessibilityRole="button"
            accessibilityLabel="Share photo"
          >
            {/* @ts-expect-error react-native-vector-icons types */}
            <Icon name="share-variant-outline" size={22} color={colors.white} />
            <Text style={styles.actionLabel}>Share</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={handleDownload}
            accessibilityRole="button"
            accessibilityLabel="Download photo"
          >
            {/* @ts-expect-error react-native-vector-icons types */}
            <Icon name="download-outline" size={22} color={colors.white} />
            <Text style={styles.actionLabel}>Save</Text>
          </Pressable>

          {canDelete && (
            <Pressable
              style={styles.actionButton}
              onPress={() => currentPhoto && setDeleteTarget(currentPhoto)}
              accessibilityRole="button"
              accessibilityLabel="Delete photo"
            >
              {/* @ts-expect-error react-native-vector-icons types */}
              <Icon name="trash-can-outline" size={22} color={colors.danger} />
              <Text style={[styles.actionLabel, { color: colors.danger }]}>
                Delete
              </Text>
            </Pressable>
          )}
        </View>
      </View>

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
        testID="viewer-delete-confirm"
      />
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    fullImage: {
      flex: 1,
    },
    bottomBar: {
      backgroundColor: 'rgba(0,0,0,0.8)',
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      paddingBottom: spacing.xl,
    },
    caption: {
      fontSize: fontSizes.base,
      color: colors.white,
      marginBottom: spacing.sm,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    meta: {
      fontSize: fontSizes.sm,
      color: 'rgba(255,255,255,0.6)',
    },
    counter: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: 'rgba(255,255,255,0.8)',
    },
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing['2xl'],
    },
    actionButton: {
      alignItems: 'center',
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    actionLabel: {
      fontSize: fontSizes.xs,
      color: colors.white,
      marginTop: spacing.xs,
      fontWeight: fontWeights.medium,
    },
  });
