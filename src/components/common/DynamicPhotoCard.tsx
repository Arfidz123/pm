import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Colors, Spacing, BorderRadius, Shadow } from '../../theme';

import { formatImageUri } from '../../utils/helpers';
import { resolveTelegramUri } from '../../services/telegramStorage';
import { useInspectionStore } from '../../store/inspectionStore';

interface DynamicPhotoCardProps {
  uri: string;
  onPress: () => void;
  onDelete?: () => void;
  dateStr?: string;
  coordsStr?: string;
  addressStr?: string;
  label?: string;
}

export const DynamicPhotoCard: React.FC<DynamicPhotoCardProps> = ({
  uri,
  onPress,
  onDelete,
  dateStr,
  coordsStr,
  addressStr,
  label,
}) => {
  const {
    getPhotoTimestamp,
    getPhotoCoordinates,
    formData,
    activePopLocation,
    currentLocation,
  } = useInspectionStore();
  const [aspectRatio, setAspectRatio] = useState<number>(4 / 3);
  const [displayUri, setDisplayUri] = useState<string>(formatImageUri(uri));
  const displayDateStr = dateStr || (uri ? getPhotoTimestamp(uri) : '');
  const displayCoordsStr =
    coordsStr ||
    (uri ? getPhotoCoordinates(uri) : '') ||
    formData?.infoPop?.koordinat ||
    (currentLocation
      ? `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}`
      : '');
  const displayAddressStr =
    addressStr ||
    (currentLocation?.address && currentLocation.address.trim() !== ''
      ? currentLocation.address.trim()
      : null) ||
    '-';

  useEffect(() => {
    let isMounted = true;
    if (uri) {
      resolveTelegramUri(uri).then(resolved => {
        if (!isMounted) return;
        const formatted = formatImageUri(resolved);
        setDisplayUri(formatted);
        if (formatted) {
          Image.getSize(
            formatted,
            (width, height) => {
              if (width > 0 && height > 0 && isMounted) {
                setAspectRatio(width / height);
              }
            },
            () => {},
          );
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [uri]);

  const isStampedOrCloudPhoto = Boolean(
    uri?.startsWith('telegram://') ||
    uri?.startsWith('http://') ||
    uri?.startsWith('https://') ||
    uri?.includes('stamp_') ||
    displayUri?.startsWith('http://') ||
    displayUri?.startsWith('https://') ||
    displayUri?.includes('stamp_'),
  );

  return (
    <View style={styles.photoUploadBoxWrapper}>
      <TouchableOpacity
        style={[styles.photoUploadBox, { aspectRatio }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Image source={{ uri: displayUri }} style={styles.uploadedImage} />
        {label ? (
          <View style={styles.topLabelOverlay}>
            <Text style={styles.topLabelText} numberOfLines={1}>
              {label}
            </Text>
          </View>
        ) : null}
        {!isStampedOrCloudPhoto && (displayDateStr || displayCoordsStr || displayAddressStr) ? (
          <View style={styles.timestampBadgeOverlay}>
            {displayDateStr ? (
              <Text style={styles.timestampOverlayText}>
                Tgl/Jam: {displayDateStr}
              </Text>
            ) : null}
            {displayCoordsStr ? (
              <Text style={styles.timestampOverlayTextSub} numberOfLines={1}>
                Koordinat: {displayCoordsStr}
              </Text>
            ) : null}
            {displayAddressStr ? (
              <Text style={styles.timestampOverlayTextSub} numberOfLines={1}>
                Alamat: {displayAddressStr}
              </Text>
            ) : null}
          </View>
        ) : null}
      </TouchableOpacity>
      {onDelete && (
        <TouchableOpacity style={styles.deletePhotoBtn} onPress={onDelete}>
          <Trash2 color={Colors.danger} size={16} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  photoUploadBoxWrapper: {
    width: '47%',
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  photoUploadBox: {
    width: '100%',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.surfaceLight,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  timestampBadgeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  timestampOverlayText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  timestampOverlayTextSub: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  topLabelOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: '85%',
    zIndex: 5,
  },
  topLabelText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    ...Shadow.sm,
    zIndex: 10,
  },
});
