import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  retryText?: string;
  variant?: 'inline' | 'card' | 'banner';
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
  dangerBg: '#FDF0EE',
};

export default function ErrorMessage({
  message,
  onRetry,
  retryText = 'Try Again',
  variant = 'inline',
  style,
  textStyle,
}: ErrorMessageProps) {
  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'card':
        return {
          backgroundColor: C.dangerBg,
          borderWidth: 1,
          borderColor: C.danger,
          borderRadius: 12,
          padding: 16,
        };
      case 'banner':
        return {
          backgroundColor: C.danger,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
        };
      default:
        return {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'banner':
        return {
          color: C.surface,
          fontSize: 14,
          flex: 1,
          marginLeft: 12,
        };
      default:
        return {
          color: C.danger,
          fontSize: 14,
          flex: 1,
          marginLeft: 8,
        };
    }
  };

  return (
    <View style={[getContainerStyle(), style]}>
      <Ionicons
        name="alert-circle"
        size={20}
        color={variant === 'banner' ? C.surface : C.danger}
      />

      <Text style={[getTextStyle(), textStyle]}>{message}</Text>

      {onRetry && variant !== 'banner' && (
        <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>{retryText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Empty State Component
interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon = 'document-outline',
  title,
  message,
  actionText,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.emptyContainer, style]}>
      <Ionicons name={icon} size={64} color={C.inkLight} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMessage}>{message}</Text>}
      {actionText && onAction && (
        <TouchableOpacity onPress={onAction} style={styles.emptyAction}>
          <Text style={styles.emptyActionText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  retryButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: C.danger,
    borderRadius: 6,
  },
  retryText: {
    color: C.surface,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.ink,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: C.inkMid,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyAction: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: C.gold,
    borderRadius: 12,
  },
  emptyActionText: {
    color: C.ink,
    fontSize: 16,
    fontWeight: '600',
  },
});