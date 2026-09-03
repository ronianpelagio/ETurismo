import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';

interface AvatarProps {
  source?: ImageSourcePropType | string;
  name?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  variant?: 'circle' | 'square';
  style?: ViewStyle;
  placeholderColor?: string;
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

export default function Avatar({
  source,
  name,
  size = 'medium',
  variant = 'circle',
  style,
  placeholderColor = C.gold,
}: AvatarProps) {
  const getSize = () => {
    switch (size) {
      case 'small':
        return 32;
      case 'large':
        return 64;
      case 'xlarge':
        return 80;
      default:
        return 48;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 24;
      case 'xlarge':
        return 28;
      default:
        return 18;
    }
  };

  const avatarSize = getSize();
  const fontSize = getFontSize();

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const getContainerStyle = (): ViewStyle => {
    return {
      width: avatarSize,
      height: avatarSize,
      borderRadius: variant === 'circle' ? avatarSize / 2 : 8,
      backgroundColor: placeholderColor,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    };
  };

  if (source) {
    return (
      <View style={[getContainerStyle(), style]}>
        <Image
          source={typeof source === 'string' ? { uri: source } : source}
          style={{ width: avatarSize, height: avatarSize }}
          resizeMode="cover"
        />
      </View>
    );
  }

  if (name) {
    return (
      <View style={[getContainerStyle(), style]}>
        <Text style={[styles.initials, { fontSize }]}>
          {getInitials(name)}
        </Text>
      </View>
    );
  }

  // Default placeholder
  return (
    <View style={[getContainerStyle(), style]}>
      <Text style={[styles.placeholder, { fontSize: fontSize * 0.8 }]}>
        👤
      </Text>
    </View>
  );
}

// Avatar Group Component
interface AvatarGroupProps {
  avatars: Array<{
    source?: ImageSourcePropType | string;
    name?: string;
  }>;
  max?: number;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export function AvatarGroup({ avatars, max = 3, size = 'medium', style }: AvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <View style={[styles.group, style]}>
      {visibleAvatars.map((avatar, index) => (
        <View
          key={index}
          style={[
            styles.groupItem,
            { marginLeft: index > 0 ? -8 : 0 },
          ]}
        >
          <Avatar
            source={avatar.source}
            name={avatar.name}
            size={size}
            variant="circle"
          />
        </View>
      ))}

      {remainingCount > 0 && (
        <View style={[styles.groupItem, { marginLeft: -8 }]}>
          <View
            style={[
              styles.remainingBadge,
              {
                width: getSizeValue(size),
                height: getSizeValue(size),
                borderRadius: getSizeValue(size) / 2,
              },
            ]}
          >
            <Text style={[styles.remainingText, { fontSize: getFontSizeValue(size) * 0.6 }]}>
              +{remainingCount}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const getSizeValue = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return 32;
    case 'large':
      return 64;
    default:
      return 48;
  }
};

const getFontSizeValue = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return 14;
    case 'large':
      return 24;
    default:
      return 18;
  }
};

const styles = StyleSheet.create({
  initials: {
    color: C.ink,
    fontWeight: '600',
  },
  placeholder: {
    color: C.ink,
  },
  group: {
    flexDirection: 'row',
  },
  groupItem: {
    position: 'relative',
  },
  remainingBadge: {
    backgroundColor: C.inkLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.surface,
  },
  remainingText: {
    color: C.surface,
    fontWeight: '600',
  },
});