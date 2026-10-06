/**
 * NotifPermissionPrimer
 *
 * In-app confirmation dialog shown once per install, before the OS
 * permission prompt fires. This follows the standard "permission primer"
 * pattern — explain value first, then ask the OS.
 *
 * Props:
 *   visible     — controls Modal visibility
 *   onAllow     — user tapped Allow → caller should call syncPushToken()
 *   onDismiss   — user tapped Not Now → caller marks primer shown, skips token
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';

interface Props {
  visible: boolean;
  onAllow: () => void;
  onDismiss: () => void;
}

const FEATURES = [
  {
    icon: 'megaphone-outline' as const,
    title: 'Announcements',
    desc: 'Be the first to know about new heritage exhibits and news.',
  },
  {
    icon: 'calendar-outline' as const,
    title: 'Upcoming Events',
    desc: 'Get reminders for tours, masses, and special exhibitions.',
  },
  {
    icon: 'cube-outline' as const,
    title: 'New Artifacts',
    desc: 'Discover newly added pieces to the Sacred Heritage Collection.',
  },
];

export default function NotifPermissionPrimer({ visible, onAllow, onDismiss }: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY  = useRef(new Animated.Value(60)).current;
  const cardOpacity     = useRef(new Animated.Value(0)).current;

  // ── Animate in when visible becomes true ──────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1, duration: 280, useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1, duration: 320, useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0, useNativeDriver: true, tension: 70, friction: 13,
        }),
      ]).start();
    } else {
      // Reset instantly so the next open animates fresh
      backdropOpacity.setValue(0);
      cardOpacity.setValue(0);
      cardTranslateY.setValue(60);
    }
  }, [visible]);

  const C = {
    bg:         theme.bg,
    surface:    theme.surface,
    ink:        theme.ink,
    inkMid:     theme.inkMid,
    inkDim:     theme.inkDim,
    gold:       theme.gold,
    goldSoft:   theme.goldSoft,
    borderGold: theme.borderGold,
    border:     theme.border,
    deep:       theme.deep,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,8,6,0.72)', opacity: backdropOpacity }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onDismiss} />
      </Animated.View>

      {/* Card — centered horizontally, sits above keyboard */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingBottom: insets.bottom }}>
        <Animated.View style={[
          {
            width: '100%',
            backgroundColor: C.surface,
            borderRadius: 28,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: C.borderGold,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 24,
            elevation: 16,
          },
          { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] },
        ]}>

          {/* ── Gold header band ────────────────────────────────────────────── */}
          <View style={{
            backgroundColor: C.gold,
            paddingTop: 32, paddingBottom: 28,
            alignItems: 'center', paddingHorizontal: 24,
          }}>
            {/* Bell icon circle */}
            <View style={{
              width: 68, height: 68, borderRadius: 34,
              backgroundColor: 'rgba(255,255,255,0.22)',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
              borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
            }}>
              <Ionicons name="notifications-outline" size={32} color="#fff" />
            </View>
            <Text style={{ fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 3, marginBottom: 6 }}>
              ETurismo
            </Text>
            <Text style={{ fontSize: 21, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -0.4 }}>
              Stay in the loop
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', textAlign: 'center', marginTop: 6, lineHeight: 19 }}>
              Allow ETurismo to send you notifications so you never miss a moment at the Sacred Heritage Collection.
            </Text>
          </View>

          {/* ── Feature list ────────────────────────────────────────────────── */}
          <View style={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 8 }}>
            {FEATURES.map((f, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                  marginBottom: i < FEATURES.length - 1 ? 16 : 20,
                }}
              >
                <View style={{
                  width: 38, height: 38, borderRadius: 11,
                  backgroundColor: C.goldSoft,
                  borderWidth: 1, borderColor: C.borderGold,
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Ionicons name={f.icon} size={18} color={C.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.ink, marginBottom: 2 }}>
                    {f.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.inkMid, lineHeight: 17 }}>
                    {f.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Divider ─────────────────────────────────────────────────────── */}
          <View style={{ height: 1, backgroundColor: C.border, marginHorizontal: 22 }} />

          {/* ── Actions ─────────────────────────────────────────────────────── */}
          <View style={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 22, gap: 10 }}>
            {/* Primary — Allow */}
            <TouchableOpacity
              onPress={onAllow}
              activeOpacity={0.85}
              style={{
                backgroundColor: C.ink,
                borderRadius: 14, paddingVertical: 15,
                alignItems: 'center',
                flexDirection: 'row', justifyContent: 'center', gap: 8,
                shadowColor: C.ink, shadowOpacity: 0.15,
                shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4,
              }}
            >
              <Ionicons name="notifications" size={17} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.2 }}>
                Allow Notifications
              </Text>
            </TouchableOpacity>

            {/* Secondary — Not Now */}
            <TouchableOpacity
              onPress={onDismiss}
              activeOpacity={0.65}
              style={{ alignItems: 'center', paddingVertical: 10 }}
            >
              <Text style={{ fontSize: 13, color: C.inkDim, fontWeight: '600' }}>
                Not now
              </Text>
            </TouchableOpacity>
          </View>

          {/* Fine-print */}
          <View style={{ paddingHorizontal: 22, paddingBottom: 18, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: C.inkDim, textAlign: 'center', lineHeight: 15 }}>
              You can change this anytime in{' '}
              <Text style={{ fontWeight: '700' }}>Settings → Notifications</Text>.
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
