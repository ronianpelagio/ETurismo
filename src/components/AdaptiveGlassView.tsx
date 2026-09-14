import React from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  colorScheme?: 'light' | 'dark';
  tintColor?: string;
  interactive?: boolean;
  fallbackIntensity?: number;
  fallbackColor?: string;
};

/** Native Liquid Glass on supported iOS devices, with a real blur fallback everywhere else. */
export default function AdaptiveGlassView({
  children,
  style,
  colorScheme = 'light',
  tintColor,
  interactive = false,
  fallbackIntensity = 55,
  fallbackColor = 'rgba(255,255,255,0.62)',
}: Props) {
  const supportsLiquidGlass =
    Platform.OS === 'ios' &&
    isGlassEffectAPIAvailable() &&
    isLiquidGlassAvailable();

  if (supportsLiquidGlass) {
    return (
      <GlassView
        style={style}
        glassEffectStyle="regular"
        colorScheme={colorScheme}
        tintColor={tintColor}
        isInteractive={interactive}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      intensity={fallbackIntensity}
      tint={colorScheme}
      style={[style, { backgroundColor: fallbackColor }]}
    >
      {children}
    </BlurView>
  );
}
