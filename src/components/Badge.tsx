import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BadgeProps {
  text: string;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: keyof typeof Ionicons.glyphMap;
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
};

export default function Badge({
  text,
  variant = 'default',
  size = 'medium',
  icon,
  style,
  textStyle,
}: BadgeProps) {
  const getBadgeStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      borderRadius: 12,
      ...getSizeStyle(),
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: C.gold,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
        };
      case 'success':
        return {
          ...baseStyle,
          backgroundColor: C.success,
        };
      case 'warning':
        return {
          ...baseStyle,
          backgroundColor: C.warning,
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: C.danger,
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: C.inkLight,
        };
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return { paddingHorizontal: 6, paddingVertical: 2 };
      case 'large':
        return { paddingHorizontal: 12, paddingVertical: 6 };
      default:
        return { paddingHorizontal: 8, paddingVertical: 4 };
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseText: TextStyle = {
      fontWeight: '500',
      ...getSizeTextStyle(),
    };

    switch (variant) {
      case 'primary':
      case 'success':
      case 'warning':
      case 'danger':
        return { ...baseText, color: C.surface };
      default:
        return { ...baseText, color: C.ink };
    }
  };

  const getSizeTextStyle = (): TextStyle => {
    switch (size) {
      case 'small':
        return { fontSize: 10 };
      case 'large':
        return { fontSize: 14 };
      default:
        return { fontSize: 12 };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 12;
      case 'large':
        return 16;
      default:
        return 14;
    }
  };

  return (
    <View style={[getBadgeStyle(), style]}>
      {icon && (
        <Ionicons
          name={icon}
          size={getIconSize()}
          color={getTextStyle().color}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[getTextStyle(), textStyle]}>{text}</Text>
    </View>
  );
}

// Status Badge Component
interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'error';
  text?: string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export function StatusBadge({
  status,
  text,
  size = 'medium',
  style,
}: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          variant: 'success' as const,
          icon: 'checkmark-circle' as const,
          defaultText: 'Active',
        };
      case 'inactive':
        return {
          variant: 'secondary' as const,
          icon: 'remove-circle' as const,
          defaultText: 'Inactive',
        };
      case 'pending':
        return {
          variant: 'warning' as const,
          icon: 'time' as const,
          defaultText: 'Pending',
        };
      case 'completed':
        return {
          variant: 'success' as const,
          icon: 'checkmark-circle' as const,
          defaultText: 'Completed',
        };
      case 'error':
        return {
          variant: 'danger' as const,
          icon: 'close-circle' as const,
          defaultText: 'Error',
        };
      default:
        return {
          variant: 'default' as const,
          icon: undefined,
          defaultText: status,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge
      text={text || config.defaultText}
      variant={config.variant}
      size={size}
      icon={config.icon}
      style={style}
    />
  );
}

// Notification Badge Component
interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export function NotificationBadge({
  count,
  maxCount = 99,
  size = 'medium',
  style,
}: NotificationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <View style={[styles.notificationBadge, getSizeStyle(size), style]}>
      <Text style={[styles.notificationText, getSizeTextStyle(size)]}>
        {displayCount}
      </Text>
    </View>
  );
}

const getSizeStyle = (size: 'small' | 'medium' | 'large'): ViewStyle => {
  switch (size) {
    case 'small':
      return { minWidth: 16, height: 16, borderRadius: 8 };
    case 'large':
      return { minWidth: 24, height: 24, borderRadius: 12 };
    default:
      return { minWidth: 20, height: 20, borderRadius: 10 };
  }
};

const getSizeTextStyle = (size: 'small' | 'medium' | 'large'): TextStyle => {
  switch (size) {
    case 'small':
      return { fontSize: 10 };
    case 'large':
      return { fontSize: 14 };
    default:
      return { fontSize: 12 };
  }
};

const styles = StyleSheet.create({
  notificationBadge: {
    backgroundColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationText: {
    color: C.surface,
    fontWeight: '600',
    textAlign: 'center',
  },
});