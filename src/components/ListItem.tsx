import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import Badge from './Badge';

interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  leftAvatar?: {
    source?: ImageSourcePropType | string;
    name?: string;
  };
  rightIcon?: keyof typeof Ionicons.glyphMap;
  rightText?: string;
  badge?: string;
  badgeVariant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  onPress?: () => void;
  onLongPress?: () => void;
  variant?: 'default' | 'card' | 'bordered';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  chevron?: boolean;
  children?: React.ReactNode;
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

export default function ListItem({
  title,
  subtitle,
  leftIcon,
  leftAvatar,
  rightIcon,
  rightText,
  badge,
  badgeVariant = 'primary',
  onPress,
  onLongPress,
  variant = 'default',
  size = 'medium',
  disabled = false,
  style,
  contentStyle,
  titleStyle,
  subtitleStyle,
  chevron = false,
  children,
}: ListItemProps) {
  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      ...getSizeStyle(),
    };

    switch (variant) {
      case 'card':
        return {
          ...baseStyle,
          backgroundColor: C.surface,
          borderRadius: 12,
          marginHorizontal: 16,
          marginVertical: 4,
          shadowColor: C.ink,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        };
      case 'bordered':
        return {
          ...baseStyle,
          backgroundColor: C.surface,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
          paddingHorizontal: 16,
        };
      default:
        return {
          ...baseStyle,
          paddingHorizontal: 16,
        };
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return { minHeight: 44, paddingVertical: 8 };
      case 'large':
        return { minHeight: 72, paddingVertical: 16 };
      default:
        return { minHeight: 56, paddingVertical: 12 };
    }
  };

  const getTitleStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '500',
      color: C.ink,
      flex: 1,
    };

    switch (size) {
      case 'small':
        return { ...baseStyle, fontSize: 14 };
      case 'large':
        return { ...baseStyle, fontSize: 18 };
      default:
        return { ...baseStyle, fontSize: 16 };
    }
  };

  const getSubtitleStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      color: C.inkMid,
      marginTop: 2,
    };

    switch (size) {
      case 'small':
        return { ...baseStyle, fontSize: 12 };
      case 'large':
        return { ...baseStyle, fontSize: 14, lineHeight: 20 };
      default:
        return { ...baseStyle, fontSize: 13, lineHeight: 18 };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 24;
      default:
        return 20;
    }
  };

  const renderLeftElement = () => {
    if (leftAvatar) {
      return (
        <Avatar
          source={leftAvatar.source}
          name={leftAvatar.name}
          size={size === 'large' ? 'medium' : 'small'}
          style={{ marginRight: 12 }}
        />
      );
    }

    if (leftIcon) {
      return (
        <View style={styles.leftIcon}>
          <Ionicons
            name={leftIcon}
            size={getIconSize()}
            color={C.inkMid}
          />
        </View>
      );
    }

    return null;
  };

  const renderRightElement = () => {
    if (rightText) {
      return (
        <Text style={[styles.rightText, getSubtitleStyle()]}>
          {rightText}
        </Text>
      );
    }

    if (rightIcon) {
      return (
        <Ionicons
          name={rightIcon}
          size={getIconSize()}
          color={C.inkLight}
        />
      );
    }

    if (chevron) {
      return (
        <Ionicons
          name="chevron-forward"
          size={getIconSize()}
          color={C.inkLight}
        />
      );
    }

    return null;
  };

  const Content = () => (
    <View style={[styles.content, contentStyle]}>
      {renderLeftElement()}

      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text
            style={[getTitleStyle(), titleStyle]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {badge && (
            <Badge
              text={badge}
              variant={badgeVariant}
              size="small"
              style={{ marginLeft: 8 }}
            />
          )}
        </View>

        {subtitle && (
          <Text
            style={[getSubtitleStyle(), subtitleStyle]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}

        {children}
      </View>

      {renderRightElement()}
    </View>
  );

  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        style={[getContainerStyle(), disabled && styles.disabled, style]}
        activeOpacity={0.7}
      >
        <Content />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[getContainerStyle(), style]}>
      <Content />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightText: {
    marginLeft: 12,
    textAlign: 'right',
  },
  disabled: {
    opacity: 0.5,
  },
});