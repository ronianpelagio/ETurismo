import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface LoadingProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  fullScreen?: boolean;
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
};

export default function Loading({
  size = 'large',
  color = C.gold,
  text,
  fullScreen = false,
  style,
  textStyle,
}: LoadingProps) {
  const containerStyle: ViewStyle = fullScreen
    ? { ...styles.fullScreen, ...style }
    : { ...styles.container, ...style };

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={color} />
      {text && (
        <Text style={[styles.text, textStyle]}>{text}</Text>
      )}
    </View>
  );
}

// Loading Overlay Component
interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
  backgroundColor?: string;
}

export function LoadingOverlay({
  visible,
  text = 'Loading...',
  backgroundColor = 'rgba(247, 244, 239, 0.9)',
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor }]}>
      <View style={styles.overlayContent}>
        <ActivityIndicator size="large" color={C.gold} />
        <Text style={styles.overlayText}>{text}</Text>
      </View>
    </View>
  );
}

// Skeleton Loading Component
interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    />
  );
}

// Skeleton Card Component
export function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <Skeleton width={60} height={60} borderRadius={8} />
      <View style={styles.skeletonText}>
        <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: C.inkMid,
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: C.surface,
    borderRadius: 16,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  overlayText: {
    marginTop: 12,
    fontSize: 16,
    color: C.inkMid,
  },
  skeleton: {
    backgroundColor: C.border,
    opacity: 0.5,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  skeletonText: {
    flex: 1,
    marginLeft: 12,
  },
});