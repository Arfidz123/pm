import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import { X, MapPin, Clock } from 'lucide-react-native';
import { Colors, Spacing } from '../../theme';
import { useInspectionStore } from '../../store/inspectionStore';
import { formatImageUri } from '../../utils/helpers';
import { resolveTelegramUri } from '../../services/telegramStorage';

interface ImagePreviewModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  visible,
  imageUri,
  onClose,
}) => {
  const [displayUri, setDisplayUri] = useState<string>(formatImageUri(imageUri || ''));
  const {
    activePopName,
    activePopLocation,
    currentLocation,
    formData,
    getPhotoTimestamp,
  } = useInspectionStore();
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (imageUri) {
      resolveTelegramUri(imageUri).then(resolved => {
        if (!isMounted) return;
        const formatted = formatImageUri(resolved);
        setDisplayUri(formatted);
        if (formatted) {
          Image.getSize(
            formatted,
            (w, h) => {
              if (w && h && h > 0 && isMounted) {
                setAspectRatio(w / h);
              }
            },
            () => {
              if (isMounted) setAspectRatio(4 / 3);
            },
          );
        }
      });
    } else {
      setAspectRatio(null);
    }
    return () => {
      isMounted = false;
    };
  }, [imageUri]);

  if (!imageUri) return null;

  const infoPop = formData.infoPop || {};
  const coordsStr =
    infoPop.koordinat ||
    (currentLocation
      ? `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}`
      : '');
  const addressStr =
    currentLocation?.address ||
    (infoPop.alamat && infoPop.alamat !== 'Kendari' ? infoPop.alamat : null) ||
    activePopLocation ||
    '';
  const dateStr = imageUri ? getPhotoTimestamp(imageUri) : '';

  const isRemote = imageUri ? (imageUri.startsWith('http') || imageUri.startsWith('telegram://')) : false;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X color={Colors.white} size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.imageContainer}>
          <View
            style={[styles.imageWrapper, aspectRatio ? { aspectRatio } : null]}
          >
            <Image
              source={{ uri: displayUri }}
              style={styles.image}
              resizeMode="cover"
            />
            {/* Watermark overlay directly inside the photo */}
            {!isRemote && (
              <View style={styles.watermarkOverlay}>
                <Text style={styles.watermarkText}>Tgl/Jam: {dateStr}</Text>
                <Text style={styles.watermarkTextSub}>
                  Koordinat: {coordsStr || 'Mendapatkan GPS...'}
                </Text>
                <Text style={styles.watermarkTextSub} numberOfLines={2}>
                  Alamat: {addressStr || '-'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: Spacing.md,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  imageWrapper: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.78,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  watermarkOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'transparent',
    padding: 6,
  },
  watermarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  watermarkTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  watermarkText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    marginTop: 1,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  watermarkTextSub: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    marginTop: 1,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
