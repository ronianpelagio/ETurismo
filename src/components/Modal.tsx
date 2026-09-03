import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal as RNModal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ViewStyle,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';

const { height, width } = Dimensions.get('window');

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  animationType?: 'slide' | 'fade' | 'none';
  position?: 'center' | 'bottom';
  style?: ViewStyle;
}

const C = {
  bg: '#F7F4EF',
  surface: '#FFFFFF',
  ink: '#1A1612',
  inkMid: '#6B6459',
  inkLight: '#A89F96',
  gold: '#C9A84C',
  goldSoft: '#F5EDD8',
  border: '#EAE4DA',
  danger: '#C0392B',
  overlay: 'rgba(0,0,0,0.5)',
};

export default function Modal({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  animationType = 'fade',
  position = 'center',
  style,
}: ModalProps) {
  const slideAnim = useRef(new Animated.Value(position === 'bottom' ? height : 0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [swipeProgress, setSwipeProgress] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => position === 'center',
      onMoveShouldSetPanResponder: (evt, { dy }) => position === 'center' && Math.abs(dy) > 5,
      onPanResponderMove: (evt: GestureResponderEvent, { dy }: PanResponderGestureState) => {
        if (dy > 0) {
          setSwipeProgress(dy);
        }
      },
      onPanResponderRelease: (evt: GestureResponderEvent, { dy, vy }: PanResponderGestureState) => {
        if (dy > 80 || vy > 0.5) {
          onClose();
          setSwipeProgress(0);
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: false,
            friction: 8,
            tension: 100,
          }).start();
          setSwipeProgress(0);
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      if (animationType === 'slide' && position === 'bottom') {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }).start();
      }
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      if (animationType === 'slide' && position === 'bottom') {
        Animated.spring(slideAnim, {
          toValue: height,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }).start();
      }
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, animationType, position]);

  const getModalStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      margin: 20,
      backgroundColor: C.surface,
      borderRadius: 24,
      padding: 20,
      shadowColor: C.ink,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 8,
      maxHeight: height * 0.85,
    };

    if (position === 'bottom') {
      return {
        ...baseStyle,
        margin: 0,
        marginTop: 'auto',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        maxHeight: height * 0.8,
      };
    }

    return baseStyle;
  };

  const getAnimatedStyle = () => {
    if (animationType === 'slide' && position === 'bottom') {
      return {
        transform: [{ translateY: slideAnim }],
        opacity: fadeAnim,
      };
    }
    return { opacity: fadeAnim };
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View 
          style={[
            styles.modalContainer, 
            getAnimatedStyle(),
            position === 'center' && {
              transform: [{ translateY: swipeProgress }],
            }
          ]}
          {...(position === 'center' ? panResponder.panHandlers : {})}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[getModalStyle(), style]}
            onPress={() => {}} // Prevent closing when tapping modal content
          >
            {/* Drag Handle */}
            {position === 'center' && (
              <View style={styles.dragHandle}>
                <View style={styles.dragIndicator} />
              </View>
            )}

            {(title || showCloseButton) && (
              <View style={styles.header}>
                {title && <Text style={styles.title}>{title}</Text>}
                {showCloseButton && (
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={C.inkLight} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {children}
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </RNModal>
  );
}

// Alert Modal Component
interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'default' | 'danger';
}

export function AlertModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
  type = 'default',
}: AlertModalProps) {
  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  return (
    <Modal visible={visible} onClose={handleCancel}>
      <View style={styles.alertContent}>
        <Text style={styles.alertTitle}>{title}</Text>
        <Text style={styles.alertMessage}>{message}</Text>

        <View style={styles.alertButtons}>
          {onCancel && (
            <Button
              title={cancelText}
              onPress={handleCancel}
              variant="ghost"
              style={{ flex: 1, marginRight: 8 }}
            />
          )}
          <Button
            title={confirmText}
            onPress={onConfirm}
            variant={type === 'danger' ? 'danger' : 'primary'}
            style={{ flex: 1, marginLeft: onCancel ? 8 : 0 }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  dragIndicator: {
    width: 44,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: C.ink,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  alertContent: {
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 16,
    color: C.inkMid,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  alertButtons: {
    flexDirection: 'row',
    width: '100%',
  },
});