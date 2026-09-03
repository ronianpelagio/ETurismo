import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onHide?: () => void;
  position?: 'top' | 'bottom';
  style?: ViewStyle;
  textStyle?: TextStyle;
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
  success: '#27AE60',
  warning: '#F39C12',
  info: '#3498DB',
};

export default function Toast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onHide,
  position = 'bottom',
  style,
  textStyle,
}: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
      ]).start();

      // Auto hide after duration
      if (duration > 0) {
        const timer = setTimeout(() => {
          hideToast();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      hideToast();
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: position === 'top' ? -100 : 100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  const getToastStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      marginHorizontal: 16,
      marginVertical: 8,
      shadowColor: C.ink,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
      maxWidth: width - 32,
    };

    switch (type) {
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: C.success,
        };
      case 'error':
        return {
          ...baseStyle,
          backgroundColor: C.danger,
        };
      case 'warning':
        return {
          ...baseStyle,
          backgroundColor: C.warning,
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: C.ink,
        };
    }
  };

  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      default:
        return 'information-circle';
    }
  };

  const getTextStyle = (): TextStyle => {
    return {
      color: C.surface,
      fontSize: 14,
      fontWeight: '500',
      flex: 1,
      marginLeft: 12,
      lineHeight: 20,
    };
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
          [position === 'top' ? 'top' : 'bottom']: 20,
        },
        style,
      ]}
    >
      <View style={getToastStyle()}>
        <Ionicons
          name={getIconName()}
          size={20}
          color={C.surface}
        />
        <Text style={[getTextStyle(), textStyle]} numberOfLines={3}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

// Toast Manager Hook
export function useToast() {
  const [toasts, setToasts] = React.useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
  }>>([]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    duration = 3000
  ) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }

    return id;
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = ({ position = 'bottom' }: { position?: 'top' | 'bottom' }) => (
    <View style={styles.toastContainer}>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          visible={true}
          message={toast.message}
          type={toast.type}
          duration={0} // Manual control
          position={position}
          onHide={() => hideToast(toast.id)}
        />
      ))}
    </View>
  );

  return {
    showToast,
    hideToast,
    ToastContainer,
  };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
});