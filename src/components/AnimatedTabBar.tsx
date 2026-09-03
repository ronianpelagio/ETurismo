// src/components/AnimatedTabBar.tsx
// Placeholder animated tab bar component.
// The primary animated navigation is handled by TabNavigator.tsx.
// This component is reserved for future standalone usage.

import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface TabItem {
  key: string;
  label: string;
  icon: string;
  iconActive: string;
}

export interface AnimatedTabBarProps {
  tabs: TabItem[];
  activeIndex: number;
  onTabPress: (index: number) => void;
  accentColor?: string;
  inactiveColor?: string;
  backgroundColor?: string;
}

function TabButton({
  tab,
  focused,
  onPress,
  accentColor,
  inactiveColor,
}: {
  tab: TabItem;
  focused: boolean;
  onPress: () => void;
  accentColor: string;
  inactiveColor: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.1 : 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        <Ionicons
          name={focused ? (tab.iconActive as any) : (tab.icon as any)}
          size={22}
          color={focused ? accentColor : inactiveColor}
        />
        <Text style={[styles.label, { color: focused ? accentColor : inactiveColor }]}>
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function AnimatedTabBar({
  tabs,
  activeIndex,
  onTabPress,
  accentColor = '#C7A84B',
  inactiveColor = '#9B948A',
  backgroundColor = 'rgba(255,255,255,0.92)',
}: AnimatedTabBarProps) {
  return (
    <View style={[styles.container, { backgroundColor }]}>
      {tabs.map((tab, i) => (
        <TabButton
          key={tab.key}
          tab={tab}
          focused={activeIndex === i}
          onPress={() => onTabPress(i)}
          accentColor={accentColor}
          inactiveColor={inactiveColor}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EAE5DF',
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#1E1B17',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
  },
  label: {
    fontSize: 9,
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
