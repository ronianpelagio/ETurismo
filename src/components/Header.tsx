import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  onTitlePress?: () => void;
  variant?: 'default' | 'large' | 'transparent';
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  showBackButton?: boolean;
  customLeftComponent?: React.ReactNode;
  customRightComponent?: React.ReactNode;
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

export default function Header({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  onTitlePress,
  variant = 'default',
  style,
  titleStyle,
  subtitleStyle,
  showBackButton = false,
  customLeftComponent,
  customRightComponent,
}: HeaderProps) {
  const insets = useSafeAreaInsets();

  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: variant === 'large' ? 16 : 12,
      paddingBottom: variant === 'large' ? 16 : 12,
    };

    switch (variant) {
      case 'large':
        return {
          ...baseStyle,
          minHeight: 80,
          paddingTop: insets.top + 16,
        };
      case 'transparent':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: C.surface,
          borderBottomWidth: 1,
          borderBottomColor: C.border,
        };
    }
  };

  const getTitleStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
      color: C.ink,
      textAlign: 'center',
      flex: 1,
    };

    switch (variant) {
      case 'large':
        return {
          ...baseStyle,
          fontSize: 24,
          fontWeight: '700',
          marginTop: 8,
        };
      default:
        return {
          ...baseStyle,
          fontSize: 18,
        };
    }
  };

  const getSubtitleStyle = (): TextStyle => {
    return {
      fontSize: 14,
      color: C.inkMid,
      textAlign: 'center',
      marginTop: 2,
    };
  };

  const renderLeftComponent = () => {
    if (customLeftComponent) {
      return customLeftComponent;
    }

    if (showBackButton) {
      return (
        <TouchableOpacity
          onPress={onLeftPress}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={C.ink} />
        </TouchableOpacity>
      );
    }

    if (leftIcon) {
      return (
        <TouchableOpacity
          onPress={onLeftPress}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name={leftIcon} size={24} color={C.ink} />
        </TouchableOpacity>
      );
    }

    return <View style={styles.iconPlaceholder} />;
  };

  const renderRightComponent = () => {
    if (customRightComponent) {
      return customRightComponent;
    }

    if (rightIcon) {
      return (
        <TouchableOpacity
          onPress={onRightPress}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name={rightIcon} size={24} color={C.ink} />
        </TouchableOpacity>
      );
    }

    return <View style={styles.iconPlaceholder} />;
  };

  const renderTitle = () => {
    if (!title) return null;

    return (
      <View style={styles.titleContainer}>
        <TouchableOpacity
          onPress={onTitlePress}
          disabled={!onTitlePress}
          style={styles.titleTouchable}
        >
          <Text style={[getTitleStyle(), titleStyle]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[getSubtitleStyle(), subtitleStyle]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const HeaderContent = () => (
    <View style={[getContainerStyle(), style]}>
      {renderLeftComponent()}
      {renderTitle()}
      {renderRightComponent()}
    </View>
  );

  if (variant === 'transparent') {
    return (
      <>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <HeaderContent />
      </>
    );
  }

  return <HeaderContent />;
}

// Safe Header Component (with SafeAreaView)
interface SafeHeaderProps extends HeaderProps {
  edges?: ('top' | 'left' | 'right' | 'bottom')[];
}

export function SafeHeader({ edges = ['top'], ...props }: SafeHeaderProps) {
  return (
    <SafeAreaView edges={edges}>
      <Header {...props} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: {
    width: 40,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  titleTouchable: {
    alignItems: 'center',
  },
});