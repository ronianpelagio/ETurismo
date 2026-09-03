import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CardProps {
  title: string;
  subtitle?: string;
  image?: ImageSourcePropType | string;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  showChevron?: boolean;
  badge?: string;
  badgeColor?: string;
  style?: ViewStyle;
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

export default function Card({
  title,
  subtitle,
  image,
  onPress,
  variant = 'default',
  size = 'medium',
  showChevron = false,
  badge,
  badgeColor = C.gold,
  style,
  children,
}: CardProps) {
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: C.surface,
      borderRadius: 16,
      overflow: 'hidden',
      ...getSizeStyle(),
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyle,
          shadowColor: C.ink,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        };
      case 'outlined':
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: C.border,
        };
      default:
        return {
          ...baseStyle,
          borderWidth: 1,
          borderColor: C.border,
        };
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return { padding: 12 };
      case 'large':
        return { padding: 20 };
      default:
        return { padding: 16 };
    }
  };

  const CardContent = () => (
    <View style={styles.content}>
      {image && (
        <Image
          source={typeof image === 'string' ? { uri: image } : image}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      <View style={styles.textContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {badge && (
            <View style={[styles.badge, { backgroundColor: badgeColor }]}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>

        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}

        {children}
      </View>

      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color={C.inkLight} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[getCardStyle(), style]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <CardContent />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[getCardStyle(), style]}>
      <CardContent />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: C.ink,
    flex: 1,
    marginRight: 8,
  },
  subtitle: {
    fontSize: 14,
    color: C.inkMid,
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: C.ink,
  },
});