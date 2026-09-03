// src/components/FloatingTabBar.tsx
// Placeholder floating tab bar component.
// The primary navigation is handled by TabNavigator.tsx using PagerView.
// This component is reserved for future standalone usage.

import React from 'react';
import { View, StyleSheet } from 'react-native';

export interface FloatingTabBarProps {
  /** Index of the currently active tab */
  activeIndex: number;
  /** Called when a tab item is pressed */
  onTabPress: (index: number) => void;
  /** Whether to show the bar */
  visible?: boolean;
}

export default function FloatingTabBar({
  activeIndex: _activeIndex,
  onTabPress: _onTabPress,
  visible = true,
}: FloatingTabBarProps) {
  if (!visible) return null;

  return (
    <View style={styles.container} />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 0, // No-op placeholder; real implementation in TabNavigator.tsx
  },
});
