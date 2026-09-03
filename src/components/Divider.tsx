import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface DividerProps {
  variant?: 'solid' | 'dashed' | 'dotted';
  thickness?: number;
  color?: string;
  marginVertical?: number;
  marginHorizontal?: number;
  text?: string;
  textStyle?: TextStyle;
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
};

export default function Divider({
  variant = 'solid',
  thickness = 1,
  color = C.border,
  marginVertical = 16,
  marginHorizontal = 0,
  text,
  textStyle,
  style,
}: DividerProps) {
  const getDividerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      height: thickness,
      backgroundColor: color,
      marginVertical,
      marginHorizontal,
    };

    switch (variant) {
      case 'dashed':
        return {
          ...baseStyle,
          borderStyle: 'dashed',
          borderWidth: thickness,
          borderColor: color,
          backgroundColor: 'transparent',
          height: 0,
        };
      case 'dotted':
        return {
          ...baseStyle,
          borderStyle: 'dotted',
          borderWidth: thickness,
          borderColor: color,
          backgroundColor: 'transparent',
          height: 0,
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    return {
      fontSize: 12,
      fontWeight: '500',
      color: C.inkMid,
      textAlign: 'center',
      backgroundColor: C.bg,
      paddingHorizontal: 12,
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: [{ translateX: -25 }, { translateY: -8 }],
    };
  };

  if (text) {
    return (
      <View style={[styles.container, style]}>
        <View style={getDividerStyle()} />
        <Text style={[getTextStyle(), textStyle]}>{text}</Text>
      </View>
    );
  }

  return <View style={[getDividerStyle(), style]} />;
}

// Section Divider Component
interface SectionDividerProps {
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}

export function SectionDivider({
  title,
  subtitle,
  style,
  titleStyle,
  subtitleStyle,
}: SectionDividerProps) {
  return (
    <View style={[styles.sectionContainer, style]}>
      {title && (
        <Text style={[styles.sectionTitle, titleStyle]}>{title}</Text>
      )}
      {subtitle && (
        <Text style={[styles.sectionSubtitle, subtitleStyle]}>{subtitle}</Text>
      )}
      <Divider variant="solid" thickness={3} color={C.gold} marginVertical={8} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: C.inkMid,
    marginTop: 4,
    marginBottom: 8,
  },
});