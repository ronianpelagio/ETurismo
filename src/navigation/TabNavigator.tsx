import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../context/ThemeContext';
import { AppTheme } from '../constants/themes';
import AdaptiveGlassView from '../components/AdaptiveGlassView';

// Screens
import Home from '../screens/main/Home';
import QRScanner from '../screens/main/QRScanner';
import SettingsStack from './SettingsStack';


// ─────────────────────────────────────────────
// SACRED HERITAGE THEME TOKENS
// ─────────────────────────────────────────────
function buildColors(t: AppTheme) {
  return {
    background: t.bg,
    surface: t.surface,
    border: t.border,
    borderLight: t.borderGold,
    textPrimary: t.ink,
    textSecondary: t.inkMid,
    textMuted: t.inkDim,
    gold: t.gold,
    goldWarm: t.goldBright,
    goldSoft: t.goldSoft,
    crimson: t.crimson,
    shadow: t.ink,
  };
}
type NavigationColors = ReturnType<typeof buildColors>;

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────
const TABS = [
  {
    key: 'Home',
    label: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  {
    key: 'Profile',
    label: 'Profile',
    activeIcon: 'person',
    inactiveIcon: 'person-outline',
  },
] as const;

// ─────────────────────────────────────────────
// MAIN NAVIGATOR
// ─────────────────────────────────────────────
export default function TabNavigator() {
  const { theme } = useAppTheme();
  const colors = buildColors(theme);
  const pagerRef = useRef<PagerView>(null);
  const insets = useSafeAreaInsets();

  const [index, setIndex] = useState(0);
  const [navbarVisible, setNavbarVisible] = useState(true);

  const effectiveNavbarVisible = navbarVisible;

  const navbarTranslate = useRef(new Animated.Value(0)).current;

  // ─────────────────────────────
  // NAVBAR ANIMATION
  // ─────────────────────────────
  useEffect(() => {
    Animated.timing(navbarTranslate, {
      toValue: effectiveNavbarVisible ? 0 : 120,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [effectiveNavbarVisible, navbarTranslate]);

  // ─────────────────────────────
  // NAVIGATION
  // ─────────────────────────────
  const goToPage = async (i: number) => {
    pagerRef.current?.setPage(i);
    setIndex(i);

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <PagerView
            ref={pagerRef}
            style={{ flex: 1 }}
            initialPage={0}
            onPageSelected={(e) => setIndex(e.nativeEvent.position)}
          >
            <View key="0"><Home setNavbarVisible={setNavbarVisible} /></View>
            <View key="1"><QRScanner setNavbarVisible={setNavbarVisible} isActive={index === 1} /></View>
            <View key="2"><SettingsStack setNavbarVisible={setNavbarVisible} /></View>
          </PagerView>

          <Animated.View
            pointerEvents={effectiveNavbarVisible ? 'auto' : 'none'}
            style={[
              styles.navWrapper,
              {
                bottom: insets.bottom > 0 ? insets.bottom + 8 : 18,
                transform: [{ translateY: navbarTranslate }],
              },
            ]}
          >
            <AdaptiveGlassView
              colorScheme="light"
              tintColor={colors.goldSoft}
              interactive
              fallbackIntensity={60}
              style={[
                styles.navbar,
                {
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              <TabItem colors={colors} label={TABS[0].label} activeIcon={TABS[0].activeIcon} inactiveIcon={TABS[0].inactiveIcon} focused={index === 0} onPress={() => goToPage(0)} />
              <View style={{ width: 80 }} />
              <TabItem colors={colors} label={TABS[1].label} activeIcon={TABS[1].activeIcon} inactiveIcon={TABS[1].inactiveIcon} focused={index === 2} onPress={() => goToPage(2)} />
            </AdaptiveGlassView>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.scanButton,
                {
                  backgroundColor: index === 1 ? colors.gold : colors.textPrimary,
                  borderColor: colors.background,
                  shadowColor: colors.shadow,
                },
              ]}
              onPress={() => goToPage(1)}
              accessibilityRole="tab"
              accessibilityLabel="Scan artifact QR code"
              accessibilityState={{ selected: index === 1 }}
            >
              <View style={[styles.scanGlow, { backgroundColor: colors.goldSoft }]} />
              <Ionicons name={index === 1 ? 'scan' : 'scan-outline'} size={24} color="#fff" />
              <Text style={styles.scanLabel}>SCAN</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
  );
}

// ─────────────────────────────────────────────
// TAB ITEM - WITH GOLD ACCENTS
// ─────────────────────────────────────────────
function TabItem({
  colors,
  label,
  activeIcon,
  inactiveIcon,
  focused,
  onPress,
}: {
  colors: NavigationColors;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.55)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.08 : 1,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.55,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, opacity, scale]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.tabButton}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          transform: [{ scale }],
          opacity,
        }}
      >
        {focused && <View style={[styles.activeDot, { backgroundColor: colors.gold }]} />}

        <Animated.View>
          <Ionicons
            name={focused ? activeIcon : inactiveIcon}
            size={21}
            color={focused ? colors.gold : colors.textMuted}
          />
        </Animated.View>

        <Animated.Text
          style={[
            styles.label,
            {
              color: focused ? colors.gold : colors.textMuted,
              fontWeight: focused ? '700' : '500',
            },
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// STYLES - SACRED HERITAGE THEME
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  navWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  navbar: {
    width: '100%',
    maxWidth: 430,
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    paddingHorizontal: 10,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    marginTop: 2,
    fontSize: 9,
    letterSpacing: 0.5,
  },

  activeDot: {
    position: 'absolute',
    top: -5,
    width: 4,
    height: 4,
    borderRadius: 10,
  },

  scanButton: {
    position: 'absolute',
    top: -20,
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  scanGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    transform: [{ scale: 1.12 }],
  },
  scanLabel: {
    position: 'absolute',
    bottom: 8,
    color: '#FFF',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
