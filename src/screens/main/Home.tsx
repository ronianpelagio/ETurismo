import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  FlatList, Image, Animated, Dimensions,
  ActivityIndicator, TextInput,
  ImageBackground, Easing, Share, Alert, LayoutChangeEvent,
  StyleSheet, AppState,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Asset } from 'expo-asset';
import { supabase } from '../../services/supabase';
import { STORAGE_KEYS, toggleInStringArray, getStringArray, logVisit } from '../../utils/storage';
import { useAppTheme } from '../../context/ThemeContext';
import { useAppContext } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { THEMES } from '../../constants/themes';
import { useAudioWordHighlight } from '../../hooks/useAudioWordHighlight';
import HighlightedText from '../../components/HighlightedText';
import ArtifactComments from './ArtifactComments';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Artifact } from '../../features/artifacts/types';
import {
  ARTIFACT_CATEGORY_IMAGES,
  ARTIFACT_TABS,
  ARTIFACT_TAB_ICONS,
  type ArtifactTab,
} from '../../features/artifacts/constants';
import type { Announcement, Event, UserProfile } from '../../features/home/types';
import {
  formatDate,
  formatDateShort,
  formatEventTime,
  formatYear,
  getEventCountdown,
  getTimeAgo,
  isNewArtifact,
} from '../../features/home/dateUtils';
import SmartImage from '../../features/home/SmartImage';
import HomeSummary from '../../features/home/HomeSummary';
import { buildC, getStyles } from '../../features/home/styles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;

const AMBER = '#A0640A';
const TEAL = '#085041';

function wasPublishedAfterSignup(
  publishedAt: string | undefined,
  accountCreatedAt: string | undefined,
): boolean {
  if (!accountCreatedAt) return true;

  const publishedAtMs = Date.parse(publishedAt ?? '');
  const accountCreatedAtMs = Date.parse(accountCreatedAt);
  return (
    Number.isFinite(publishedAtMs) &&
    Number.isFinite(accountCreatedAtMs) &&
    publishedAtMs >= accountCreatedAtMs
  );
}

let C = buildC(THEMES.light);
let styles = getStyles(C);

// ─── Discovery (QR Scanner is the source of truth) ───────────────────────────
// QRScanner persists every successful scan under this AsyncStorage key as a JSON
// array of artifact objects: AsyncStorage.setItem('scannedArtifacts', ...).
// We reuse that exact key (no duplicate storage). Any future discovery method
// (e.g. AI visual recognition) only needs to write the same entry shape
// (or a plain string id) to this key and Home will pick it up.
const SCANNED_ARTIFACTS_KEY = 'scannedArtifacts';

async function loadDiscoveredArtifactIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SCANNED_ARTIFACTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const ids = parsed
      .map((entry: unknown) =>
        typeof entry === 'string' ? entry : (entry as { id?: unknown } | null)?.id,
      )
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    return Array.from(new Set(ids)); // duplicate scans never inflate progress
  } catch (_) {
    return [];
  }
}

const getPreviewDescription = (description?: string | null): string => {
  if (!description) return '';
  const trimmed = description.trim();
  const maxLength = 120;
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength).trim() + '...';
};

function getDiscoveryStyles(C: ReturnType<typeof buildC>) {
  return StyleSheet.create({
    // Corner indicator on card image
    cornerBadge: {
      position: 'absolute', bottom: 8, right: 8,
      width: 22, height: 22, borderRadius: 11,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(10,8,5,0.6)',
      borderWidth: 1, borderColor: C.borderGold,
    },
    // Footer status row (card + modal)
    footerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
    footerText: { fontSize: 11, fontWeight: '600', color: C.inkDim },
    footerTextDiscovered: { color: C.gold, fontWeight: '700' },

    // Progress
    progressWrap: {
      marginHorizontal: 20, marginTop: 20,
      backgroundColor: C.surface, borderRadius: 18,
      borderWidth: 1, borderColor: C.border, padding: 16,
    },
    progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    progressIconWrap: {
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.borderGold,
      alignItems: 'center', justifyContent: 'center',
    },
    progressEyebrow: { fontSize: 9.5, fontWeight: '800', letterSpacing: 2.5, color: C.gold },
    progressCount: { fontSize: 15, fontWeight: '800', color: C.ink, letterSpacing: -0.2 },
    progressTrack: { height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden', marginTop: 12 },
    progressFill: { height: '100%', borderRadius: 3, backgroundColor: C.gold },
    progressFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
    progressPct: { fontSize: 11.5, fontWeight: '600', color: C.inkMid },

    // Locked content panel
    lockedWrap: {
      backgroundColor: C.raised, borderRadius: 18,
      borderWidth: 1, borderColor: C.border,
      padding: 20, alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 8,
    },
    lockedIconWrap: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.borderGold,
      alignItems: 'center', justifyContent: 'center',
    },
    lockedTitle: { fontSize: 16, fontWeight: '800', color: C.ink, letterSpacing: -0.2 },
    lockedBody: { fontSize: 13, color: C.inkMid, lineHeight: 20, textAlign: 'center' },
    lockedBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: C.ink, borderRadius: 50,
      paddingVertical: 13, paddingHorizontal: 24, marginTop: 6,
    },
    lockedBtnText: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  });
}

// ─── DiscoveryBadge ──────────────────────────────────────────────────────────
// variant 'corner' = small icon over card image; 'footer' = icon + label row.
function DiscoveryBadge({ discovered, colors, variant = 'footer', label }: {
  discovered: boolean;
  colors: ReturnType<typeof buildC>;
  variant?: 'corner' | 'footer';
  label?: string;
}) {
  const ds = getDiscoveryStyles(colors);
  if (variant === 'corner') {
    return (
      <View style={ds.cornerBadge} pointerEvents="none">
        <Ionicons
          name={discovered ? 'checkmark-circle' : 'lock-closed-outline'}
          size={13}
          color={discovered ? colors.gold : '#fff'}
        />
      </View>
    );
  }
}

// ─── DiscoveryProgress ───────────────────────────────────────────────────────
function DiscoveryProgress({ discovered, total, colors }: {
  discovered: number; total: number; colors: ReturnType<typeof buildC>;
}) {
  const ds = getDiscoveryStyles(colors);
  const safeDiscovered = Math.min(discovered, total);
  const pct = total > 0 ? Math.round((safeDiscovered / total) * 100) : 0;
  const complete = total > 0 && safeDiscovered >= total;
  return (
    <View
      style={ds.progressWrap}
      accessible
      accessibilityLabel={`Museum collection: ${safeDiscovered} of ${total} artifacts discovered, ${pct} percent complete`}
    >
      <View style={ds.progressHeader}>
        <View style={ds.progressIconWrap}>
          <Ionicons name="compass-outline" size={16} color={colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ds.progressEyebrow}>MUSEUM COLLECTION</Text>
          <Text style={ds.progressCount}>
            {safeDiscovered} of {total} Artifacts Discovered
          </Text>
        </View>
      </View>
      <View style={ds.progressTrack}>
        <View style={[ds.progressFill, { width: `${pct}%` }]} />
      </View>
      <View style={ds.progressFooter}>
        {complete && <Ionicons name="checkmark-circle-outline" size={14} color={colors.gold} />}
        <Text style={ds.progressPct}>{pct}% Complete</Text>
      </View>
    </View>
  );
}

// ─── LockedArtifactContent ───────────────────────────────────────────────────
function LockedArtifactContent({ colors, onScan }: {
  colors: ReturnType<typeof buildC>; onScan: () => void;
}) {
  const ds = getDiscoveryStyles(colors);
  return (
    <View style={ds.lockedWrap}>
      <View style={ds.lockedIconWrap}>
        <Ionicons name="lock-closed-outline" size={20} color={colors.gold} />
      </View>
      <Text style={ds.lockedTitle}>Discover this artifact</Text>
      <Text style={ds.lockedBody}>
        Visit the museum and scan the QR code beside this artifact to unlock its full story, audio narration, and historical details.
      </Text>
      <TouchableOpacity
        style={ds.lockedBtn}
        onPress={onScan}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Scan QR code to discover this artifact"
      >
        <Ionicons name="scan-outline" size={17} color="#fff" />
        <Text style={ds.lockedBtnText}>Scan to Discover</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Prefetch hero + first artifact images so nothing pops in after loading ──
async function prefetchVisuals(items: { image_url?: string }[]) {
  const urls = items.slice(0, 8).map(a => a.image_url).filter(Boolean) as string[];
  const tasks: Promise<any>[] = [
    Asset.fromModule(require('../../assets/Signin.jpg')).downloadAsync(),
    ...urls.map(u => Image.prefetch(u)),
  ];
  await Promise.race([
    Promise.allSettled(tasks),
    new Promise(resolve => setTimeout(resolve, 3000)),
  ]);
}

// ─── Skeleton Card ───────────────────────────────────────────────────────────────
function SkeletonCard({ width }: { width: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });
  return (
    <Animated.View style={[{ width, backgroundColor: C.border, borderRadius: 16, overflow: 'hidden', marginBottom: 2 }, { opacity }]}>
      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: C.deep }} />
      <View style={{ padding: 12, gap: 8 }}>
        <View style={{ height: 11, backgroundColor: C.deep, borderRadius: 6, width: '75%' }} />
        <View style={{ height: 9, backgroundColor: C.deep, borderRadius: 6, width: '45%' }} />
      </View>
    </Animated.View>
  );
}


// ─── Welcome Modal (new user, first login) ───────────────────────────────────────
function WelcomeModal({ name, onClose }: { name: string; onClose: () => void }) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale       = useRef(new Animated.Value(0.85)).current;
  const cardOpacity     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(cardScale,   { toValue: 1, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  function dismiss() {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(cardOpacity,     { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 0.88, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start(() => onClose());
  }

  return (
    <Animated.View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 999, justifyContent: 'center', alignItems: 'center',
      paddingHorizontal: 32,
      backgroundColor: 'rgba(10,8,6,0.72)',
      opacity: backdropOpacity,
    }}>
      <Animated.View style={{
        width: '100%', backgroundColor: C.surface, borderRadius: 28,
        overflow: 'hidden', borderWidth: 1, borderColor: C.borderGold,
        shadowColor: C.gold, shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 8 }, shadowRadius: 24, elevation: 16,
        opacity: cardOpacity, transform: [{ scale: cardScale }],
      }}>
        {/* Gold header band */}
        <LinearGradient
          colors={[C.gold, C.goldBright ?? C.gold]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ paddingTop: 28, paddingBottom: 24, alignItems: 'center', paddingHorizontal: 24 }}
        >
          {/* X button */}
          <TouchableOpacity
            onPress={dismiss} activeOpacity={0.7}
            style={{
              position: 'absolute', top: 14, right: 14,
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.25)',
              justifyContent: 'center', alignItems: 'center',
            }}
          >
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>

          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: 'rgba(255,255,255,0.2)',
            justifyContent: 'center', alignItems: 'center', marginBottom: 12,
            borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)',
          }}>
            <Ionicons name="map-outline" size={30} color="#fff" />
          </View>
          <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 3, color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>
            ETURISMO
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5, textAlign: 'center' }}>
            Welcome, {name}!
          </Text>
        </LinearGradient>

        {/* Body */}
        <View style={{ padding: 24 }}>
          <Text style={{ fontSize: 14.5, color: C.inkMid, lineHeight: 23, textAlign: 'center', marginBottom: 24 }}>
            You're now part of the{' '}
            <Text style={{ color: C.ink, fontWeight: '700' }}>Sacred Heritage Collection</Text>.
            {'\n\n'}Explore centuries of culture, scan artifacts, and discover the stories behind every piece.
          </Text>

          {/* Feature highlights */}
          {[
            { icon: 'scan-outline',     text: 'Scan QR codes on artifacts to learn their story' },
            { icon: 'heart-outline',    text: 'Keep your favourite artifacts close at hand' },
            { icon: 'headset-outline',  text: 'Listen to multilingual audio narrations' },
          ].map((f, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              marginBottom: i < 2 ? 12 : 20,
            }}>
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: C.goldSoft, justifyContent: 'center', alignItems: 'center',
                borderWidth: 1, borderColor: C.borderGold,
              }}>
                <Ionicons name={f.icon as any} size={17} color={C.gold} />
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: C.inkMid, lineHeight: 19 }}>{f.text}</Text>
            </View>
          ))}

          {/* OK button */}
          <TouchableOpacity
            onPress={dismiss} activeOpacity={0.85}
            style={{
              backgroundColor: C.ink, borderRadius: 16, paddingVertical: 15,
              alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
              shadowColor: C.ink, shadowOpacity: 0.2,
              shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4,
            }}
          >
            <Ionicons name="compass-outline" size={18} color="#fff" />
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.3 }}>
              Start Exploring
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Welcome Toast (returning user) ──────────────────────────────────────────────
function WelcomeToast({ name }: { name: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 90, friction: 10 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 90, friction: 10 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 90, friction: 10 }),
      ]),
      Animated.delay(2400),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
        Animated.timing(translateY, { toValue: -12, duration: 500, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.9, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);
  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ scale }, { translateY }] }]}>
      <View style={styles.toastDot} />
      <Text style={styles.toastText}>Welcome, <Text style={styles.toastName}>{name}</Text></Text>
    </Animated.View>
  );
}

// ─── Count Badge ─────────────────────────────────────────────────────────────────
function CountBadge({ count }: { count: number }) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [count]);
  return (
    <Animated.View style={[styles.countBadge, { opacity, transform: [{ scale }] }]}>
      <Text style={styles.countBadgeText}>{count}</Text>
    </Animated.View>
  );
}

// ─── Artifact Card ───────────────────────────────────────────────────────────────
// `discovered` is undefined while discovery state is still loading, so no
// incorrect "Not discovered" label flashes on first render.
function ArtifactCard({ item, width, onPress, isFavorite, index, discovered }: {
  item: Artifact; width: number; onPress: () => void; isFavorite?: boolean; index: number; discovered?: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    const delay = (index % 2) * 60 + Math.floor(index / 2) * 80;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 480, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 480, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);
  const discoveryA11y = discovered === undefined ? '' : discovered ? ', discovered' : ', not discovered';
  return (
    <Animated.View style={{ width, opacity: fadeAnim, transform: [{ scale: scaleAnim }, { translateY: slideAnim }] }}>
      <TouchableOpacity
        style={styles.card} onPress={onPress} activeOpacity={1}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.category}${isFavorite ? ', favorite' : ''}${discoveryA11y}`}
        accessibilityHint="Opens artifact details"
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, tension: 300, friction: 12 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 12 }).start()}
      >
        <View style={styles.cardImageWrap}>
          <SmartImage uri={item.image_url} style={styles.cardImage} resizeMode="cover" />
          <View style={styles.cardScrim} />
          <View style={styles.cardCatPill}>
            <Text style={styles.cardCatText}>{item.category.split(' ')[0].toUpperCase()}</Text>
          </View>
          {isNewArtifact(item.created_at) && (
            <View style={styles.cardNewBadge}><Text style={styles.cardNewBadgeText}>NEW</Text></View>
          )}
          <View style={styles.cardBottomRow}>
            {item.is_exhibition && (
              <View style={styles.cardLivePill}><View style={styles.cardLiveDot} /></View>
            )}
            {isFavorite && (
              <View style={[styles.cardMicroBadge, { backgroundColor: 'rgba(201,168,76,0.9)' }]}>
                <Ionicons name="heart" size={9} color="#fff" />
              </View>
            )}
          </View>
          {discovered !== undefined && (
            <DiscoveryBadge discovered={discovered} colors={C} variant="corner" />
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.cardAccentLine} />
            <Text style={styles.cardDate}>{item.date}</Text>
          </View>
          {discovered !== undefined && (
            <DiscoveryBadge discovered={discovered} colors={C} variant="footer" />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}


// ─── Compact Feed Card ───────────────────────────────────────────────────────────
function CompactFeedCard({ item, type, onPress }: { item: any; type: 'announcement' | 'event'; onPress: () => void }) {
  const rawDate = type === 'announcement' ? item.announcement_datetime : item.event_datetime;
  const date = new Date(rawDate);
  const isEvent = type === 'event';
  const badgeColor = isEvent ? '#085041' : '#854F0B';
  const badgeBg = isEvent ? 'rgba(8,80,65,0.08)' : 'rgba(133,79,11,0.08)';
  const timeLabel = (isEvent ? getEventCountdown(rawDate) : null) ?? getTimeAgo(date);
  return (
    <TouchableOpacity style={styles.feedCardCompact} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.feedCardCompactContent}>
        <View style={styles.feedCardCompactHeader}>
          <View style={[styles.feedCardCompactBadge, { backgroundColor: badgeBg }]}>
            <Ionicons name={isEvent ? 'calendar-outline' : 'megaphone-outline'} size={10} color={badgeColor} />
            <Text style={[styles.feedCardCompactBadgeText, { color: badgeColor }]}>{isEvent ? 'EVENT' : 'UPDATE'}</Text>
          </View>
          <Text style={styles.feedCardCompactDate}>{timeLabel}</Text>
        </View>
        <Text style={styles.feedCardCompactTitle} numberOfLines={2}>{item.title}</Text>
        {item.description && <Text style={styles.feedCardCompactDesc} numberOfLines={2}>{item.description}</Text>}
        <View style={styles.feedCardCompactFooter}>
          <Ionicons name={isEvent ? 'time-outline' : 'chatbubble-outline'} size={10} color={C.inkDim} />
          <Text style={styles.feedCardCompactFooterText}>{isEvent ? formatEventTime(date) : 'Tap to read more'}</Text>
          <View style={styles.feedCardCompactDot} />
          <Text style={styles.feedCardCompactFooterText}>{formatDateShort(date)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// NEW DESIGN — Announcements & Events page
// ═════════════════════════════════════════════════════════════════════════════

// ── Image that fades in once loaded (no pop-in, no blank flash) ──────────────
function FadeInImage({ uri, style }: { uri: string; style: any }) {
  const opacity = useRef(new Animated.Value(0)).current;
  return (
    <View style={[style, { backgroundColor: C.deep, overflow: 'hidden' }]}>
      <Animated.Image
        source={{ uri }}
        style={[{ width: '100%', height: '100%' }, { opacity }]}
        resizeMode="cover"
        onLoad={() =>
          Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }).start()
        }
      />
    </View>
  );
}

// ── Staggered entrance animation for list items ──────────────────────────────
function useEntrance(index: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 420,
      delay: Math.min(index, 6) * 70,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  return {
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };
}

// ── Expandable text ──────────────────────────────────────────────────────────
function ExpandableText({ text, lines = 3, color }: { text: string; lines?: number; color: string }) {
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  return (
    <View>
      <Text
        style={{ fontSize: 13.5, lineHeight: 21, color: C.inkMid }}
        numberOfLines={expanded ? undefined : lines}
        onTextLayout={e => {
          if (!expanded) setTruncated(e.nativeEvent.lines.length >= lines);
        }}
      >
        {text}
      </Text>
      {(truncated || expanded) && (
        <TouchableOpacity
          onPress={() => setExpanded(v => !v)}
          activeOpacity={0.7}
          style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color }}>{expanded ? 'Show less' : 'Read more'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={color} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ═════════════════════════ ANNOUNCEMENT CARD ═════════════════════════════════
// index 0 = big featured card, others = compact cards with thumbnail.
function FeedCard({
  item, type, isInterested, onToggleInterested, index = 0,
}: {
  item: any; type: 'announcement' | 'event'; isInterested?: boolean; onToggleInterested?: () => void; index?: number;
}) {
  const anim = useEntrance(index);
  const date = new Date(item.announcement_datetime);
  const featured = index === 0;
  const desc: string = item.description ?? '';

  if (featured) {
    return (
      <Animated.View style={[{
        backgroundColor: C.surface, borderRadius: 26, overflow: 'hidden',
        borderWidth: 1, borderColor: C.border,
        shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 5,
      }, anim]}>
        <View style={{ height: 230 }}>
          {item.image_url ? (
            <FadeInImage uri={item.image_url} style={{ width: '100%', height: '100%' }} />
          ) : (
            <LinearGradient colors={[AMBER, '#5C3A06']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="megaphone" size={54} color="rgba(255,255,255,0.35)" />
            </LinearGradient>
          )}
          <LinearGradient
            colors={['rgba(10,8,5,0.35)', 'transparent', 'rgba(10,8,5,0.88)']}
            locations={[0, 0.4, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View style={{ position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 30,
            }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: AMBER }} />
              <Text style={{ fontSize: 10, fontWeight: '900', color: AMBER, letterSpacing: 1.2 }}>LATEST NEWS</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(10,8,5,0.6)', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 30 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{getTimeAgo(date)}</Text>
            </View>
          </View>
          <View style={{ position: 'absolute', left: 18, right: 18, bottom: 16 }}>
            <Text style={{ color: '#fff', fontSize: 23, lineHeight: 28, fontWeight: '900', letterSpacing: -0.4 }} numberOfLines={3}>
              {item.title}
            </Text>
          </View>
        </View>

        <View style={{ padding: 18, gap: 12 }}>
          {!!desc && <ExpandableText text={desc} lines={4} color={AMBER} />}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border }}>
            <Ionicons name="calendar-outline" size={13} color={C.inkDim} />
            <Text style={{ fontSize: 11.5, color: C.inkDim, fontWeight: '600' }}>{formatDate(item.announcement_datetime)}</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{
      backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border,
      overflow: 'hidden', flexDirection: 'row',
      shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 2,
    }, anim]}>
      <View style={{ width: 4, backgroundColor: AMBER }} />
      <View style={{ flex: 1, padding: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {item.image_url ? (
            <FadeInImage uri={item.image_url} style={{ width: 84, height: 84, borderRadius: 14 }} />
          ) : (
            <View style={{
              width: 84, height: 84, borderRadius: 14, backgroundColor: 'rgba(160,100,10,0.1)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="megaphone-outline" size={26} color={`${AMBER}99`} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: 'rgba(160,100,10,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
              }}>
                <Ionicons name="megaphone-outline" size={9} color={AMBER} />
                <Text style={{ fontSize: 8.5, fontWeight: '900', color: AMBER, letterSpacing: 1 }}>UPDATE</Text>
              </View>
              <Text style={{ fontSize: 10, color: C.inkDim, fontWeight: '600' }}>{getTimeAgo(date)}</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink, lineHeight: 20, letterSpacing: -0.2 }} numberOfLines={3}>
              {item.title}
            </Text>
          </View>
        </View>
        {!!desc && <ExpandableText text={desc} lines={2} color={AMBER} />}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="calendar-outline" size={11} color={C.inkDim} />
          <Text style={{ fontSize: 10.5, color: C.inkDim }}>{formatDate(item.announcement_datetime)}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ═════════════════════════ EVENT CARD ════════════════════════════════════════
function EventCard({
  item, isInterested, onToggleInterested, index = 0,
}: { item: any; isInterested?: boolean; onToggleInterested?: () => void; index?: number }) {
  const anim = useEntrance(index);
  const date = new Date(item.event_datetime);
  const countdown = getEventCountdown(item.event_datetime);
  const isPast = !countdown && date.getTime() < Date.now();
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate().toString().padStart(2, '0');
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const heartScale = useRef(new Animated.Value(1)).current;

  const pressInterested = () => {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.25, useNativeDriver: true, tension: 300, friction: 8 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 8 }),
    ]).start();
    onToggleInterested?.();
  };

  return (
    <Animated.View style={[{
      backgroundColor: C.surface, borderRadius: 26, overflow: 'hidden',
      borderWidth: 1, borderColor: C.border,
      shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, elevation: 5,
      opacity: isPast ? 0.92 : 1,
    }, anim]}>
      <View style={{ height: 190 }}>
        {item.image_url ? (
          <FadeInImage uri={item.image_url} style={{ width: '100%', height: '100%' }} />
        ) : (
          <LinearGradient colors={[TEAL, '#032B22']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="calendar" size={54} color="rgba(255,255,255,0.3)" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.75)']}
          locations={[0, 0.4, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <View style={{
          position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6,
          backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 30,
        }}>
          <Ionicons name="calendar-outline" size={12} color={TEAL} />
          <Text style={{ fontSize: 10, fontWeight: '900', color: TEAL, letterSpacing: 1.2 }}>EVENT</Text>
        </View>

        <View style={{
          position: 'absolute', top: 14, right: 14,
          backgroundColor: isPast ? 'rgba(10,8,5,0.6)' : TEAL,
          paddingHorizontal: 12, paddingVertical: 7, borderRadius: 30,
        }}>
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.4 }}>
            {isPast ? 'ENDED' : countdown ?? 'UPCOMING'}
          </Text>
        </View>

        <View style={{
          position: 'absolute', left: 16, bottom: -26, width: 62, height: 66, borderRadius: 16,
          backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
          borderWidth: 1, borderColor: C.border,
          shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 6,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '900', color: TEAL, letterSpacing: 1.4 }}>{month}</Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: C.ink, lineHeight: 30 }}>{day}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 18, paddingTop: 38, paddingBottom: 18, gap: 14 }}>
        <Text style={{ fontSize: 20, lineHeight: 26, fontWeight: '900', color: C.ink, letterSpacing: -0.4 }}>
          {item.title}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: C.raised, borderWidth: 1, borderColor: C.border,
            paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12,
          }}>
            <Ionicons name="today-outline" size={13} color={TEAL} />
            <Text style={{ fontSize: 11.5, fontWeight: '700', color: C.inkMid }}>{weekday}, {fullDate}</Text>
          </View>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: 'rgba(8,80,65,0.08)', borderWidth: 1, borderColor: 'rgba(8,80,65,0.18)',
            paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12,
          }}>
            <Ionicons name="time-outline" size={13} color={TEAL} />
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: TEAL }}>{formatEventTime(date)}</Text>
          </View>
        </View>

        {!!item.description && (
          <View>
            <Text style={{ fontSize: 10, color: C.inkDim, fontWeight: '800', letterSpacing: 1.4, marginBottom: 6 }}>
              ABOUT THIS EVENT
            </Text>
            <ExpandableText text={item.description} lines={3} color={TEAL} />
          </View>
        )}

        <TouchableOpacity
          onPress={pressInterested}
          activeOpacity={0.85}
          style={{
            height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
            backgroundColor: isInterested ? 'rgba(8,80,65,0.1)' : TEAL,
            borderWidth: 1.5, borderColor: TEAL,
          }}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons name={isInterested ? 'heart' : 'heart-outline'} size={19} color={isInterested ? '#E74C3C' : '#fff'} />
          </Animated.View>
          <Text style={{ color: isInterested ? TEAL : '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 }}>
            {isInterested ? "You're Interested" : "I'm Interested"}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ═════════════════════════ FEED HEADER (title + sliding tabs) ════════════════
function FeedHeader({
  tab, onTabChange, announcementsCount, eventsCount, onClose,
}: {
  tab: 'announcements' | 'events';
  onTabChange: (t: 'announcements' | 'events') => void;
  announcementsCount: number;
  eventsCount: number;
  onClose: () => void;
}) {
  const [trackW, setTrackW] = useState(0);
  const slide = useRef(new Animated.Value(tab === 'announcements' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: tab === 'announcements' ? 0 : 1,
      useNativeDriver: true, tension: 90, friction: 12,
    }).start();
  }, [tab]);

  const segW = trackW > 0 ? (trackW - 8) / 2 : 0;
  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, segW] });
  const isA = tab === 'announcements';

  const Seg = ({ id, icon, label, count, color }: any) => {
    const active = tab === id;
    return (
      <TouchableOpacity
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40 }}
        onPress={() => onTabChange(id)}
        activeOpacity={0.8}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
      >
        <Ionicons name={icon} size={14} color={active ? color : C.inkDim} />
        <Text style={{ fontSize: 12.5, fontWeight: active ? '800' : '600', color: active ? color : C.inkMid }}>{label}</Text>
        <View style={{
          minWidth: 20, paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 10, alignItems: 'center',
          backgroundColor: active ? `${color}1F` : C.border,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: active ? color : C.inkDim }}>{count}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
        <View>
          <Text style={{ fontSize: 9.5, fontWeight: '800', letterSpacing: 3, color: isA ? AMBER : TEAL }}>STAY CONNECTED</Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: C.ink, letterSpacing: -0.8, marginTop: 2 }}>
            {isA ? 'Announcements' : 'Events'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={{
            width: 34, height: 34, borderRadius: 17, backgroundColor: C.raised,
            borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={17} color={C.inkMid} />
        </TouchableOpacity>
      </View>

      <View
        onLayout={(e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width)}
        style={{ flexDirection: 'row', backgroundColor: C.raised, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: C.border }}
      >
        {segW > 0 && (
          <Animated.View style={{
            position: 'absolute', top: 4, left: 4, width: segW, height: 40, borderRadius: 12,
            backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
            shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
            transform: [{ translateX }],
          }} />
        )}
        <Seg id="announcements" icon="megaphone" label="News" count={announcementsCount} color={AMBER} />
        <Seg id="events" icon="calendar" label="Events" count={eventsCount} color={TEAL} />
      </View>
    </View>
  );
}

// ── Empty state ──
function FeedEmpty({ kind }: { kind: 'announcements' | 'events' }) {
  const color = kind === 'announcements' ? AMBER : TEAL;
  return (
    <View style={{ alignItems: 'center', paddingVertical: 70, gap: 10 }}>
      <View style={{
        width: 72, height: 72, borderRadius: 36, backgroundColor: `${color}14`,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${color}30`,
      }}>
        <Ionicons name={kind === 'announcements' ? 'megaphone-outline' : 'calendar-outline'} size={30} color={color} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>
        {kind === 'announcements' ? 'No announcements yet' : 'No events scheduled'}
      </Text>
      <Text style={{ fontSize: 12.5, color: C.inkDim, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18 }}>
        Check back soon — new updates from the shrine will appear here.
      </Text>
    </View>
  );
}

// ─── Tab Button ──────────────────────────────────────────────────────────────────
function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const bgAnim = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(bgAnim, { toValue: active ? 1 : 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [active]);
  const backgroundColor = bgAnim.interpolate({ inputRange: [0, 1], outputRange: [C.raised, C.gold] });
  const borderColor = bgAnim.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.gold] });
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label} artifacts`}
    >
      <Animated.View style={[styles.tab, { backgroundColor, borderColor }]}>
        <Ionicons name={(ARTIFACT_TAB_ICONS[label as ArtifactTab] || 'apps-outline') as any} size={12} color={active ? C.void : C.inkMid} />
        <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Pulse Ring ──────────────────────────────────────────────────────────────────
function PulseRing() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.8, duration: 1200, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
      ]),
      Animated.delay(400),
    ])).start();
  }, []);
  return <Animated.View style={[styles.pulseRing, { opacity, transform: [{ scale }] }]} />;
}

// ─── Loading Dot ─────────────────────────────────────────────────────────────────
function LoadingDot({ delay }: { delay: number }) {
  const op = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(op, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0.2, duration: 400, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={[styles.loadingDot, { opacity: op }]} />;
}

// ─── HomeScreen ──────────────────────────────────────────────────────────────────
// isActive      → pass true while the Home tab is the visible tab so discovery
//                 state is re-read right after the user returns from the scanner.
// onOpenScanner → called by "Scan to Discover"; the parent must switch to the
//                 existing QR Scanner tab/screen.
export default function HomeScreen({ setNavbarVisible, isActive, onOpenScanner, onGoAnnouncements, onGoEvents }: {
  setNavbarVisible?: (visible: boolean) => void;
  isActive?: boolean;
  onOpenScanner?: () => void;
  onGoAnnouncements?: () => void;
  onGoEvents?: () => void;
}) {
  const { theme } = useAppTheme();
  C = buildC(theme);
  const insets = useSafeAreaInsets();
  const styles = getStyles(C);
  const { fontScale } = useAppContext();
  const { language: appLanguage } = useLanguage();

  // ── State ──
  const [activeTab, setActiveTab] = useState<ArtifactTab>('All');
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [playingLang, setPlayingLang] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'ja' | 'fil' | 'es' | 'ko'>(appLanguage);

  // ── Discovery state (read from the same storage QRScanner writes to) ──
  const [discoveredIds, setDiscoveredIds] = useState<string[]>([]);
  const [discoveryLoaded, setDiscoveryLoaded] = useState(false);
  const discoveredIdSet = useMemo(() => new Set(discoveredIds), [discoveredIds]);
  const isArtifactDiscovered = (artifactId: string) => discoveredIdSet.has(artifactId);
  // Only IDs that still exist in the current artifact dataset are counted
  const discoveredCount = useMemo(
    () => artifacts.filter(a => discoveredIdSet.has(a.id)).length,
    [artifacts, discoveredIdSet],
  );

  async function loadDiscoveredIds() {
    const ids = await loadDiscoveredArtifactIds();
    setDiscoveredIds(prev =>
      prev.length === ids.length && prev.every((id, i) => id === ids[i]) ? prev : ids,
    );
    setDiscoveryLoaded(true);
  }

  // Keep selectedLanguage in sync when user changes the app-wide language in Settings
  useEffect(() => {
    setSelectedLanguage(appLanguage);
  }, [appLanguage]);

  // Reset to first page whenever the filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [activeTab, searchQuery]);
  const [audioDuration, setAudioDuration] = useState<number>(60);
  const [favoriteArtifactIds, setFavoriteArtifactIds] = useState<string[]>([]);
  const [modalIsFavorite, setModalIsFavorite] = useState(false);
  const [interestedIds, setInterestedIds] = useState<string[]>([]);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showVisitInfoModal, setShowVisitInfoModal] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  // Persisted per-item read/dismissed sets — loaded from AsyncStorage on mount
  const [notifReadIds, setNotifReadIds]           = useState<Set<string>>(new Set());
  const [notifDismissedIds, setNotifDismissedIds] = useState<Set<string>>(new Set());

  // Load persisted dismissed/read sets on mount
  useEffect(() => {
    AsyncStorage.getItem('notifDismissedIds').then(raw => {
      if (raw) setNotifDismissedIds(new Set(JSON.parse(raw)));
    }).catch(() => {});
    AsyncStorage.getItem('notifReadIds').then(raw => {
      if (raw) setNotifReadIds(new Set(JSON.parse(raw)));
    }).catch(() => {});
  }, []);

  // Keep the bell badge in sync with the same per-item state shown in the panel.
  useEffect(() => {
    const notificationIds = [
      ...artifacts.map(artifact => `artifact_${artifact.id}`),
      ...announcements
        .filter(announcement =>
          wasPublishedAfterSignup(announcement.created_at, user?.created_at),
        )
        .map(announcement => `announcement_${announcement.id}`),
      ...events
        .filter(event => wasPublishedAfterSignup(event.created_at, user?.created_at))
        .map(event => `event_${event.id}`),
    ];
    setUnreadNotifCount(
      notificationIds.filter(
        id => !notifReadIds.has(id) && !notifDismissedIds.has(id),
      ).length,
    );
  }, [artifacts, announcements, events, user?.created_at, notifReadIds, notifDismissedIds]);

  // ── Exhibition Spotlight state ──
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const spotlightFade = useRef(new Animated.Value(1)).current;

  // ── Offline state ──
  const [isOffline, setIsOffline] = useState(false);

  // ── Map state ──
  const MUSEUM_LOCATION = { latitude: 14.016902, longitude: 121.402152 };
  const [showMapModal, setShowMapModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [langRowOpen, setLangRowOpen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  // ── Routing state ──
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeSteps, setRouteSteps] = useState<{ instruction: string; distance: string }[]>([]);
  const [routeMode, setRouteMode] = useState<'driving' | 'walking'>('driving');
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  // ── Animated refs ──
  const contentFade = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);
  const profileSheetSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const profileSheetOpacity = useRef(new Animated.Value(0)).current;
  const notifPanelSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const notifPanelOpacity = useRef(new Animated.Value(0)).current;
  const visitInfoSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const visitInfoOpacity = useRef(new Animated.Value(0)).current;
  const modalSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const mapModalSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const mapModalOpacity = useRef(new Animated.Value(0)).current;
  const mapRef = useRef<MapView>(null);
  const playerRef = useRef<any>(null);
  const playbackSubscriptionRef = useRef<any>(null);
  const lastScrollY = useRef(0);
  const navbarVisibleRef = useRef(true);

  // Fade the whole home screen in once everything has finished loading
  useEffect(() => {
    if (!loading && !error) {
      Animated.timing(contentFade, {
        toValue: 1, duration: 450, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }).start();
    }
  }, [loading, error]);

  // ── Word-highlighting for audio guide ──
  const currentAudioDesc: string = (() => {
    if (!selectedArtifact) return '';
    const t = selectedArtifact.translations?.find(tr => tr.language_code === selectedLanguage);
    return t?.description || selectedArtifact.description || '';
  })();
  const {
    words: audioWords,
    highlightedIndex,
    currentTime: audioCurrentTime,
    startHighlight,
    stopHighlight,
    resetHighlight,
  } = useAudioWordHighlight({ text: currentAudioDesc, durationSeconds: audioDuration });

  // ── Navbar visibility ──
  useEffect(() => {
    setNavbarVisible?.(!selectedArtifact && !showProfileSheet && !showMapModal && !showVisitInfoModal && !showNotifPanel);
  }, [selectedArtifact, showProfileSheet, showMapModal, showVisitInfoModal, showNotifPanel]);

  const handleScroll = (event: any) => {
    const currentY = event.nativeEvent.contentOffset.y;
    if (currentY <= 20) {
      navbarVisibleRef.current = true;
      setNavbarVisible?.(true);
      lastScrollY.current = currentY;
      return;
    }
    const diff = currentY - lastScrollY.current;
    if (Math.abs(diff) < 10) return;
    if (diff > 0 && navbarVisibleRef.current) {
      navbarVisibleRef.current = false;
      setNavbarVisible?.(false);
    } else if (diff < 0 && !navbarVisibleRef.current) {
      navbarVisibleRef.current = true;
      setNavbarVisible?.(true);
    }
    lastScrollY.current = currentY;
  };

  // ── Lifecycle ──
  useEffect(() => {
    setupAudio();
    fetchData();
    loadStorage();
    loadDiscoveredIds();

    const channel = supabase
      .channel('eturismo-home-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'artifacts',
      }, payload => {
        console.log('[Realtime] Artifact:', payload.eventType);
        refreshArtifacts();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'events',
      }, payload => {
        console.log('[Realtime] Event:', payload.eventType);
        refreshEvents();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'announcements',
      }, payload => {
        console.log('[Realtime] Announcement:', payload.eventType);
        refreshAnnouncements();
      })
      .subscribe(status => {
        console.log('[Realtime] Home:', status);
      });

    return () => {
      cleanupAudio();
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Refresh discovery when Home becomes the active tab again ──
  useEffect(() => {
    if (isActive) loadDiscoveredIds();
  }, [isActive]);

  // ── Refresh discovery when the app returns to the foreground ──
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') loadDiscoveredIds();
    });
    return () => sub.remove();
  }, []);

  // ── Exhibition Spotlight rotation (every 30 s) ──
  useEffect(() => {
    if (artifacts.length < 2) return;
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(spotlightFade, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }).start(() => {
        // Pick a new random index different from current
        setSpotlightIndex(prev => {
          let next = prev;
          while (next === prev && artifacts.length > 1) {
            next = Math.floor(Math.random() * artifacts.length);
          }
          return next;
        });
        // Fade back in
        Animated.timing(spotlightFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.in(Easing.quad),
        }).start();
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [artifacts]);

  useEffect(() => {
    if (selectedArtifact) {
      setModalIsFavorite(favoriteArtifactIds.includes(selectedArtifact.id));
      setSelectedLanguage(appLanguage);
      setDescExpanded(false);
      setLangRowOpen(false);
      setPlaybackRate(1);
      resetHighlight();
      // Make sure the lock state is current whenever a modal opens
      loadDiscoveredIds();
      // Log visit
      logVisit({
        artifactId:   selectedArtifact.id,
        artifactName: selectedArtifact.name,
        category:     selectedArtifact.category,
        image_url:    selectedArtifact.image_url || '',
      }).catch(() => {});
      Animated.parallel([
        Animated.spring(modalSlide, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
        Animated.timing(modalOpacity, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalSlide, { toValue: SCREEN_HEIGHT, duration: 350, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
        Animated.timing(modalOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [selectedArtifact]);

  // ── Storage ──
  async function loadStorage() {
    const favorites = await getStringArray(STORAGE_KEYS.favoriteArtifacts);
    const interested = await getStringArray(STORAGE_KEYS.interestedEvents);
    setFavoriteArtifactIds(favorites);
    setInterestedIds(interested);
    try {
      const rs = await AsyncStorage.getItem('recentSearches');
      if (rs) setRecentSearches(JSON.parse(rs));
    } catch (_) {}
  }

  // ── Audio ──
  async function setupAudio() {
    try { await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false }); }
    catch (e: any) { console.error('Audio setup:', e.message); }
  }
  function cleanupAudio() {
    if (playerRef.current) {
      playerRef.current.pause?.();
      playbackSubscriptionRef.current?.remove();
      playbackSubscriptionRef.current = null;
      playerRef.current.remove?.();
      playerRef.current = null;
    }
    setPlayingLang(null);
    stopHighlight();
  }

  function handleAudioSeek(seconds: number) {
    if (!playerRef.current) return;
    // seekTo takes seconds (expo-audio AudioPlayer API)
    try { playerRef.current.seekTo(seconds); } catch (_) {}
  }
  function handleAudioRate(rate: number) {
    if (!playerRef.current) return;
    // setPlaybackRate is the correct expo-audio method
    try { playerRef.current.setPlaybackRate(rate); setPlaybackRate(rate); } catch (_) {}
  }
  function handleAudioSkip(delta: number) {
    const next = Math.max(0, Math.min(audioCurrentTime + delta, audioDuration - 0.5));
    handleAudioSeek(next);
  }
  function formatAudioTime(s: number): string {
    if (!isFinite(s) || isNaN(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }
  async function playAudio(audioUrl: string, lang: string) {
    try {
      cleanupAudio();
      if (!audioUrl || audioUrl === 'null') { alert('No audio available for this language yet.'); return; }
      setPlayingLang(lang);
      const player = createAudioPlayer({ uri: audioUrl }) as any;
      playerRef.current = player;
      const sub = player.addListener('playbackStatusUpdate', (status: any) => {
        // Read duration from player.duration (seconds) — more reliable than durationMillis
        const dur: number =
          typeof player.duration === 'number' && player.duration > 0
            ? player.duration
            : status.durationMillis && status.durationMillis > 0
              ? status.durationMillis / 1000
              : 0;
        if (dur > 0) setAudioDuration(dur);

        if (status.didJustFinish) {
          setPlayingLang(null);
          stopHighlight();
          sub.remove();
          playerRef.current?.remove?.();
          playerRef.current = null;
        }
      });
      playbackSubscriptionRef.current = sub;
      await player.play();
      // Start word highlighting
      startHighlight(player);
    } catch (e: any) { console.error('Playback error:', e.message); setPlayingLang(null); resetHighlight(); alert('Could not play audio. Please try again.'); }
  }

  // ── Data helpers ──
  function enrichArtifacts(items: any[]): Artifact[] {
    return items.map(item => ({
      ...item,
      translations: item.artifact_translations || [],
      audio_url: item.audio_guides?.[0]?.audio_url || null,
      date: formatYear(item.created_at),
      image_url: item.image_url || ARTIFACT_CATEGORY_IMAGES[item.category] || 'https://via.placeholder.com/600',
      is_exhibition: item.category === 'Vestments' || item.category === 'Sacred Vessels',
      is_crown: item.name?.toLowerCase().includes('crown') || item.category === 'Altar Furnishings',
      is_artwork: item.category === 'Devotional Objects' || item.category === 'Sacramentals',
    }));
  }

  async function refreshArtifacts() {
    try {
      const { data, error } = await supabase
        .from('artifacts')
        .select('id, name, category, qr_code, created_at, description, image_url, creator, Historical_Significance, artifact_translations(language_code, name, description, audio_url)')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[Realtime] Artifact refresh failed:', error.message);
        return;
      }

      const enriched = enrichArtifacts(data || []);
      setArtifacts(enriched);
      setIsOffline(false);

      try {
        await AsyncStorage.setItem(STORAGE_KEYS.cachedArtifacts, JSON.stringify(enriched));
      } catch (_) {}

      setSelectedArtifact(current => {
        if (!current) return null;
        return enriched.find(item => item.id === current.id) ?? null;
      });

      console.log('[Realtime] Artifacts refreshed:', enriched.length);
    } catch (error) {
      console.warn('[Realtime] Artifact refresh failed:', error);
    }
  }

  async function refreshEvents() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, event_datetime, description, image_url, created_at')
        .order('event_datetime', { ascending: false });

      if (error) {
        console.warn('[Realtime] Event refresh failed:', error.message);
        return;
      }

      setEvents(data || []);
      console.log('[Realtime] Events refreshed:', data?.length ?? 0);
    } catch (error) {
      console.warn('[Realtime] Event refresh failed:', error);
    }
  }

  async function refreshAnnouncements() {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, announcement_datetime, description, image_url, created_at')
        .order('announcement_datetime', { ascending: false });

      if (error) {
        console.warn('[Realtime] Announcement refresh failed:', error.message);
        return;
      }

      setAnnouncements(data || []);
      console.log('[Realtime] Announcements refreshed:', data?.length ?? 0);
    } catch (error) {
      console.warn('[Realtime] Announcement refresh failed:', error);
    }
  }

  // ── Initial Data Fetch ──
  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authUser) throw new Error('Please sign in to continue');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, profile_picture, created_at')
        .eq('id', authUser.id)
        .single();

      if (userError) throw userError;
      setUser(userData);

      const welcomeKey = `welcome_modal_seen_${authUser.id}`;
      const alreadySeen = await AsyncStorage.getItem(welcomeKey);

      if (!alreadySeen) {
        await AsyncStorage.setItem(welcomeKey, 'true');
        setShowWelcomeModal(true);
      } else {
        setShowToast(true);
      }

      const [
        artifactsResult,
        eventsResult,
        announcementsResult,
      ] = await Promise.all([
        supabase
          .from('artifacts')
          .select('id, name, category, qr_code, created_at, description, image_url, creator, Historical_Significance, artifact_translations(language_code, name, description, audio_url)')
          .order('created_at', { ascending: false }),

        supabase
          .from('events')
          .select('id, title, event_datetime, description, image_url, created_at')
          .order('event_datetime', { ascending: false }),

        supabase
          .from('announcements')
          .select('id, title, announcement_datetime, description, image_url, created_at')
          .order('announcement_datetime', { ascending: false }),
      ]);

      if (artifactsResult.error) throw artifactsResult.error;

      const enriched = enrichArtifacts(artifactsResult.data || []);
      // NEW: wait (max 3 s) for hero + first artifact images before hiding the loading screen
      await prefetchVisuals(enriched);
      setArtifacts(enriched);
      setIsOffline(false);

      try {
        await AsyncStorage.setItem(
          STORAGE_KEYS.cachedArtifacts,
          JSON.stringify(enriched),
        );
      } catch (_) {}

      const currentEvents = eventsResult.error ? [] : eventsResult.data || [];
      const currentAnnouncements = announcementsResult.error ? [] : announcementsResult.data || [];

      if (!eventsResult.error) setEvents(currentEvents);
      else console.warn('Events fetch failed:', eventsResult.error.message);

      if (!announcementsResult.error) setAnnouncements(currentAnnouncements);
      else console.warn('Announcements fetch failed:', announcementsResult.error.message);
    } catch (err: any) {
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS.cachedArtifacts);

        if (cached) {
          const parsed: Artifact[] = JSON.parse(cached);

          if (parsed.length > 0) {
            setArtifacts(parsed);
            setIsOffline(true);
            setError(null);
            return;
          }
        }
      } catch (_) {}

      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  // ── Modal helpers ──
  function handleModalClose() { cleanupAudio(); resetHighlight(); setSelectedArtifact(null); }

  // "Scan to Discover": close the preview, then ask the parent to open the existing QR Scanner
  function handleScanToDiscover() {
    handleModalClose();
    onOpenScanner?.();
  }

  async function saveRecentSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const updated = [trimmed, ...prev.filter(s => s !== trimmed)].slice(0, 3);
      AsyncStorage.setItem('recentSearches', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }

  function openProfileSheet() {
    setShowProfileSheet(true);
    Animated.parallel([
      Animated.spring(profileSheetSlide, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
      Animated.timing(profileSheetOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }
  function closeProfileSheet() {
    Animated.parallel([
      Animated.timing(profileSheetSlide, { toValue: SCREEN_HEIGHT, duration: 300, useNativeDriver: true }),
      Animated.timing(profileSheetOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowProfileSheet(false));
  }

  async function toggleModalFavorite() {
    if (!selectedArtifact) return;
    const updated = await toggleInStringArray(STORAGE_KEYS.favoriteArtifacts, selectedArtifact.id);
    setFavoriteArtifactIds(updated);
    setModalIsFavorite(updated.includes(selectedArtifact.id));
  }

  // ── Share artifact with image + link ─────────────────────────────────────────
  async function shareArtifact() {
    if (!selectedArtifact) return;

    const artifactLink = `https://sacredheritage.ph/artifacts/${selectedArtifact.id}`;
    const shareText =
      `${selectedArtifact.name}\n` +
      `${selectedArtifact.category} — Sacred Heritage Collection\n\n` +
      `${selectedArtifact.description?.slice(0, 120) ?? 'A treasured piece of liturgical history.'}…\n\n` +
      `Discover it at the National Shrine of Our Lady of Sorrows.\n` +
      `${artifactLink}`;

    const imageUrl = selectedArtifact.image_url;
    const canShare = await Sharing.isAvailableAsync();

    // If there is an image and the device supports expo-sharing, download & share
    if (imageUrl && canShare) {
      try {
        // Derive a local filename from the URL (keep extension, fallback to .jpg)
        const ext = imageUrl.split('?')[0].split('.').pop()?.toLowerCase() ?? 'jpg';
        const localUri = `${FileSystem.Paths.cache}artifact_${selectedArtifact.id}.${ext}`;

        // Download only if not already cached
        const fileInfo = await FileSystem.getInfoAsync(localUri);
        if (!fileInfo.exists) {
          await FileSystem.downloadAsync(imageUrl, localUri);
        }

        await Sharing.shareAsync(localUri, {
          mimeType: ext === 'png' ? 'image/png' : 'image/jpeg',
          dialogTitle: selectedArtifact.name,
          UTI: ext === 'png' ? 'public.png' : 'public.jpeg', // iOS
        });
        return;
      } catch (_) {
        // Fall through to text-only share if image download/share fails
      }
    }

    // Fallback: text-only share (works on all platforms, includes the link)
    try {
      await Share.share({ title: selectedArtifact.name, message: shareText });
    } catch (_) {}
  }

  function openNotifPanel() {
    setShowNotifPanel(true);
    Animated.parallel([
      Animated.spring(notifPanelSlide, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
      Animated.timing(notifPanelOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }
  function closeNotifPanel() {
    Animated.parallel([
      Animated.timing(notifPanelSlide, { toValue: SCREEN_HEIGHT, duration: 340, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
      Animated.timing(notifPanelOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setShowNotifPanel(false));
  }

  function openVisitInfoModal() {
    setShowVisitInfoModal(true);
    Animated.parallel([
      Animated.spring(visitInfoSlide, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
      Animated.timing(visitInfoOpacity, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();
  }
  function closeVisitInfoModal() {
    Animated.parallel([
      Animated.timing(visitInfoSlide, { toValue: SCREEN_HEIGHT, duration: 350, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
      Animated.timing(visitInfoOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setShowVisitInfoModal(false));
  }

  // ── Map helpers ──
  function openMapModal() {
    setShowMapModal(true);
    setLocationError(null);
    Animated.parallel([
      Animated.spring(mapModalSlide, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
      Animated.timing(mapModalOpacity, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start(() => fetchUserLocation());
  }
  function closeMapModal() {
    Animated.parallel([
      Animated.timing(mapModalSlide, { toValue: SCREEN_HEIGHT, duration: 350, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
      Animated.timing(mapModalOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      setShowMapModal(false);
      setUserLocation(null);
      setLocationError(null);
      setRouteCoords([]);
      setRouteSteps([]);
      setRouteError(null);
      setRouteLoading(false);
      setShowSteps(false);
    });
  }
  async function fetchUserLocation() {
    setLocationLoading(true); setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationError('Location permission denied. Shrine pin is shown below.'); setLocationLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setUserLocation(coords);
      setTimeout(() => {
        mapRef.current?.fitToCoordinates([coords, MUSEUM_LOCATION], {
          edgePadding: { top: 80, right: 60, bottom: 80, left: 60 }, animated: true,
        });
      }, 500);
      // Auto-fetch route once we have the user's location
      await fetchRoute(coords, routeMode);
    } catch (e: any) {
      setLocationError('Could not get your location. Showing shrine only.');
    } finally { setLocationLoading(false); }
  }

  // ── In-app routing via OSRM (no API key required) ──
  async function fetchRoute(
    origin: { latitude: number; longitude: number },
    mode: 'driving' | 'walking',
  ) {
    setRouteLoading(true);
    setRouteError(null);
    setRouteCoords([]);
    setRouteSteps([]);
    try {
      const profile = mode === 'walking' ? 'foot' : 'car';
      const url =
        `https://router.project-osrm.org/route/v1/${profile}/` +
        `${origin.longitude},${origin.latitude};` +
        `${MUSEUM_LOCATION.longitude},${MUSEUM_LOCATION.latitude}` +
        `?overview=full&geometries=geojson&steps=true&annotations=false`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`OSRM responded ${res.status}`);
      const json = await res.json();

      if (json.code !== 'Ok' || !json.routes?.length) {
        throw new Error('No route found between your location and the shrine.');
      }

      const route = json.routes[0];

      // Decode GeoJSON LineString → [{latitude, longitude}]
      const coords: { latitude: number; longitude: number }[] =
        route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
          latitude: lat,
          longitude: lng,
        }));
      setRouteCoords(coords);

      // Fit map to route
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 60, bottom: 120, left: 60 },
          animated: true,
        });
      }, 300);

      // Parse turn-by-turn steps
      const steps: { instruction: string; distance: string }[] = [];
      for (const leg of route.legs) {
        for (const step of leg.steps) {
          const maneuver = step.maneuver?.type ?? '';
          const modifier = step.maneuver?.modifier ?? '';
          const name = step.name ? ` onto ${step.name}` : '';
          const dist = step.distance < 1000
            ? `${Math.round(step.distance)} m`
            : `${(step.distance / 1000).toFixed(1)} km`;

          let instruction = '';
          if (maneuver === 'depart') {
            instruction = `Start heading ${modifier || 'forward'}${name}`;
          } else if (maneuver === 'arrive') {
            instruction = 'Arrive at National Shrine of Our Lady of Sorrows';
          } else if (maneuver === 'turn') {
            instruction = `Turn ${modifier || 'straight'}${name}`;
          } else if (maneuver === 'roundabout' || maneuver === 'rotary') {
            instruction = `Enter roundabout, take exit ${step.maneuver?.exit ?? ''}${name}`;
          } else if (maneuver === 'merge') {
            instruction = `Merge ${modifier || ''}${name}`;
          } else if (maneuver === 'fork') {
            instruction = `Keep ${modifier || 'straight'} at fork${name}`;
          } else if (maneuver === 'continue') {
            instruction = `Continue${name}`;
          } else {
            instruction = `${maneuver.charAt(0).toUpperCase() + maneuver.slice(1)}${name}`;
          }

          steps.push({ instruction, distance: dist });
        }
      }
      setRouteSteps(steps);
    } catch (e: any) {
      setRouteError(e.message || 'Could not load route. Check your connection.');
    } finally {
      setRouteLoading(false);
    }
  }

  function getDistanceText(): string {
    if (!userLocation) return '—';
    const R = 6371;
    const dLat = ((MUSEUM_LOCATION.latitude - userLocation.latitude) * Math.PI) / 180;
    const dLon = ((MUSEUM_LOCATION.longitude - userLocation.longitude) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((userLocation.latitude * Math.PI) / 180) * Math.cos((MUSEUM_LOCATION.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
  }

  function getTotalRouteDistance(): string {
    if (!routeCoords.length || !userLocation) return getDistanceText();
    // Sum step distances from OSRM if available
    return getDistanceText();
  }

  // ── Filtered artifacts ──
  const filteredArtifacts = (() => {
    let list = [...artifacts];
    if (activeTab !== 'All') list = list.filter(i => i.category === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    return list;
  })();

  const PAGE_SIZE = 6;
  const totalPages = Math.ceil(filteredArtifacts.length / PAGE_SIZE);
  const pagedArtifacts = filteredArtifacts.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const firstName = user?.first_name || 'Explorer';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Discovery state of the artifact currently open in the modal
  const selectedDiscovered = selectedArtifact ? isArtifactDiscovered(selectedArtifact.id) : false;


  // ── Loading (skeleton screen) ──
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <StatusBar style="light" />
        <View style={{ height: 260 + insets.top, backgroundColor: C.deep, justifyContent: 'flex-end', padding: 20 }}>
          <View style={{ height: 12, width: 140, borderRadius: 6, backgroundColor: C.border, marginBottom: 12 }} />
          <View style={{ height: 30, width: 220, borderRadius: 8, backgroundColor: C.border, marginBottom: 8 }} />
          <View style={{ height: 30, width: 170, borderRadius: 8, backgroundColor: C.border }} />
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <View style={{ height: 14, width: 120, borderRadius: 6, backgroundColor: C.border, marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP }}>
            {[0, 1, 2, 3].map(i => <SkeletonCard key={i} width={CARD_WIDTH} />)}
          </View>
        </View>
        <View style={{ position: 'absolute', bottom: 40, alignSelf: 'center', alignItems: 'center', gap: 10 }}>
          <View style={styles.loadingDots}>
            <LoadingDot delay={0} />
            <LoadingDot delay={160} />
            <LoadingDot delay={320} />
          </View>
          <Text style={styles.loadingText}>Loading collection…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <SafeAreaView style={[styles.safe, styles.centerScreen]} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.errorInner}>
          <View style={styles.loadingOrb}>
            <Ionicons name="cloud-offline-outline" size={28} color={C.gold} />
          </View>
          <Text style={styles.errorTitle}>Collection Unavailable</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchData} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={16} color={C.void} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <StatusBar style="light" />

      {showToast && (
        <View style={styles.toastWrapper} pointerEvents="none">
          <WelcomeToast name={firstName} />
        </View>
      )}

      {showWelcomeModal && (
        <WelcomeModal
          name={user?.first_name || 'there'}
          onClose={() => setShowWelcomeModal(false)}
        />
      )}

      <Animated.View style={{ flex: 1, opacity: contentFade }}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 + insets.bottom }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* ── Offline banner ── */}
        {isOffline && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: 'rgba(201,168,76,0.12)',
            borderBottomWidth: 1, borderBottomColor: 'rgba(201,168,76,0.25)',
            paddingHorizontal: 20, paddingVertical: 10,
          }}>
            <Ionicons name="cloud-offline-outline" size={16} color={C.gold} />
            <Text style={{ flex: 1, fontSize: 12, color: C.inkMid, lineHeight: 16 }}>
              You're offline — showing cached collection.
            </Text>
            <TouchableOpacity onPress={fetchData} activeOpacity={0.7}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.gold }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════ */}
        <ImageBackground
          source={require('../../assets/Signin.jpg')}
          style={[styles.hero, { height: 260 + insets.top, backgroundColor: C.deep }]}
          imageStyle={styles.heroBgImage}
          fadeDuration={0}
        >
          <View style={styles.heroOverlay} />

          {/* Top bar — padded by real status bar height so clock/battery stay visible */}
          <View style={[styles.heroTopBar, { paddingTop: insets.top + 14 }]}>
            <View style={styles.heroLogoGroup}>
              <Text style={styles.heroLogo}>ETURISMO</Text>
              <Text style={styles.heroLogoSub}>CULTURE · HISTORY · HERITAGE</Text>
            </View>

            {/* Notification bell */}
            <TouchableOpacity
              style={styles.heroNotifBtn}
              onPress={openNotifPanel}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={unreadNotifCount > 0 ? `Notifications — ${unreadNotifCount} new` : 'Notifications'}
            >
              <Ionicons name="notifications-outline" size={20} color="#fff" />
              {unreadNotifCount > 0 && (
                <View style={styles.heroNotifBadge}>
                  <Text style={styles.heroNotifBadgeText}>
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <View style={styles.heroBody}>
            <Text style={styles.heroGreeting}>Good day, {firstName} · {today}</Text>
            <Text style={styles.heroTitle}>
              Discover{'\n'}<Text style={styles.heroTitleAccent}>Sacred Heritage</Text>
            </Text>
          </View>
        </ImageBackground>

        <HomeSummary
          artifactCount={artifacts.length}
          favoriteCount={favoriteArtifactIds.length}
          discoveredCount={discoveredCount}
          colors={C}
        />

        {/* ══════════════════════════════════════════════════════
            DISCOVERY PROGRESS
        ══════════════════════════════════════════════════════ */}
        {!searchQuery && discoveryLoaded && (
          <DiscoveryProgress
            discovered={discoveredCount}
            total={artifacts.length}
            colors={C}
          />
        )}

        {/* ══════════════════════════════════════════════════════
            FEATURED EXHIBITION
        ══════════════════════════════════════════════════════ */}
        {!searchQuery && artifacts.length > 0 && (() => {
          const featured = artifacts[spotlightIndex] || artifacts[0];
          return (
            <>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>FEATURED</Text>
                  <Text style={styles.sectionTitle}>Exhibition Spotlight</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setActiveTab('All')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="View all artifacts"
                >
                  <Text style={styles.sectionAction}>View all</Text>
                </TouchableOpacity>
              </View>

              <Animated.View style={{ opacity: spotlightFade }}>
                <TouchableOpacity
                  style={styles.featuredCard}
                  onPress={() => setSelectedArtifact(featured)}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={`Featured exhibition: ${featured.name}`}
                  accessibilityHint="Opens artifact details"
                >
                  <SmartImage uri={featured.image_url} style={styles.featuredImage} resizeMode="cover" />
                  <View style={styles.featuredOverlay} />
                  <View style={styles.featuredContent}>
                    <View style={styles.featuredBadge}>
                      <View style={styles.featuredBadgeDot} />
                      <Text style={styles.featuredBadgeText}>FEATURED EXHIBITION</Text>
                    </View>
                    <Text style={styles.featuredTitle} numberOfLines={2}>{featured.name}</Text>
                    <Text style={styles.featuredCat}>{featured.category}</Text>
                    <View style={styles.featuredArrowRow}>
                      <Text style={styles.featuredArrowText}>Explore Exhibition</Text>
                      <View style={styles.featuredArrowBtn}>
                        <Ionicons name="arrow-forward" size={15} color={C.void} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </>
          );
        })()}

        {/* ══════════════════════════════════════════════════════
            SEARCH  (below Exhibition Spotlight)
        ══════════════════════════════════════════════════════ */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
            <Ionicons name="search-outline" size={18} color={searchFocused ? C.gold : C.inkDim} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search artifacts, artworks…"
              placeholderTextColor={C.inkDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => { setSearchFocused(false); if (searchQuery.trim()) saveRecentSearch(searchQuery); }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search the artifact collection"
              onSubmitEditing={() => { if (searchQuery.trim()) saveRecentSearch(searchQuery); }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Clear artifact search"
              >
                <Ionicons name="close-circle" size={18} color={C.inkDim} />
              </TouchableOpacity>
            )}
          </View>

          {searchFocused && !searchQuery && recentSearches.length > 0 && (
            <View>
              <Text style={[styles.recentLabel, { marginTop: 10 }]}>RECENT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
                {recentSearches.map(s => (
                  <TouchableOpacity key={s} style={styles.recentChip} onPress={() => setSearchQuery(s)} activeOpacity={0.75}>
                    <Ionicons name="time-outline" size={12} color={C.inkDim} />
                    <Text style={styles.recentChipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {searchQuery.trim().length > 0 && (
            <Text style={styles.searchResultText}>
              {filteredArtifacts.length} result{filteredArtifacts.length !== 1 ? 's' : ''} for "{searchQuery.trim()}"
            </Text>
          )}
        </View>


        {/* ══════════════════════════════════════════════════════
            EXPLORE COLLECTION
        ══════════════════════════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>DISCOVER</Text>
            <Text style={styles.sectionTitle}>Explore Collection</Text>
          </View>
          <CountBadge count={filteredArtifacts.length} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabsScrollContent, { marginBottom: 16 }]}
        >
          {ARTIFACT_TABS.map(tab => (
            <TabButton key={tab} label={tab} active={activeTab === tab} onPress={() => setActiveTab(tab)} />
          ))}
        </ScrollView>

        {filteredArtifacts.length > 0 ? (
          <>
            <FlatList
              data={pagedArtifacts}
              extraData={{ discoveredIds, discoveryLoaded, favoriteArtifactIds, currentPage }}
              renderItem={({ item, index }) => (
                <ArtifactCard
                  item={item} width={CARD_WIDTH}
                  onPress={() => setSelectedArtifact(item)}
                  isFavorite={favoriteArtifactIds.includes(item.id)}
                  discovered={discoveryLoaded ? isArtifactDiscovered(item.id) : undefined}
                  index={index}
                />
              )}
              keyExtractor={i => i.id}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.grid}
              columnWrapperStyle={styles.gridRow}
            />

            {/* ── Pagination controls ── */}
            {totalPages > 1 && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginTop: 8,
                marginBottom: 4,
                paddingHorizontal: 20,
              }}>
                {/* Prev */}
                <TouchableOpacity
                  onPress={() => {
                    setCurrentPage(p => Math.max(0, p - 1));
                    scrollViewRef.current?.scrollTo({ y: 260 + insets.top, animated: true });
                  }}
                  disabled={currentPage === 0}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Previous page"
                  style={{
                    width: 38, height: 38, borderRadius: 19,
                    borderWidth: 1,
                    borderColor: currentPage === 0 ? C.border : C.gold,
                    backgroundColor: currentPage === 0 ? C.raised : C.goldSoft,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Ionicons name="chevron-back" size={18} color={currentPage === 0 ? C.inkDim : C.gold} />
                </TouchableOpacity>

                {/* Page dots */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => {
                        setCurrentPage(i);
                        scrollViewRef.current?.scrollTo({ y: 260 + insets.top, animated: true });
                      }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Page ${i + 1}`}
                      accessibilityState={{ selected: i === currentPage }}
                    >
                      <View style={{
                        height: 8, borderRadius: 4,
                        width: i === currentPage ? 24 : 8,
                        backgroundColor: i === currentPage ? C.gold : C.border,
                      }} />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Next */}
                <TouchableOpacity
                  onPress={() => {
                    setCurrentPage(p => Math.min(totalPages - 1, p + 1));
                    scrollViewRef.current?.scrollTo({ y: 260 + insets.top, animated: true });
                  }}
                  disabled={currentPage === totalPages - 1}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Next page"
                  style={{
                    width: 38, height: 38, borderRadius: 19,
                    borderWidth: 1,
                    borderColor: currentPage === totalPages - 1 ? C.border : C.gold,
                    backgroundColor: currentPage === totalPages - 1 ? C.raised : C.goldSoft,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages - 1 ? C.inkDim : C.gold} />
                </TouchableOpacity>
              </View>
            )}

            {/* Page count label */}
            {totalPages > 1 && (
              <Text style={{
                textAlign: 'center',
                fontSize: 11,
                color: C.inkDim,
                fontWeight: '600',
                marginTop: 4,
                marginBottom: 8,
              }}>
                Page {currentPage + 1} of {totalPages} · {filteredArtifacts.length} artifacts
              </Text>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.goldSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name="search-outline" size={26} color={C.inkDim} />
            </View>
            <Text style={styles.emptyTitle}>Nothing found</Text>
            <Text style={styles.emptySub}>
              {activeTab !== 'All' ? `No artifacts in "${activeTab}".` : 'Try a different search.'}
            </Text>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════
            VISIT CARD
        ══════════════════════════════════════════════════════ */}
        {!searchQuery && (
          <View style={{ marginTop: 24 }}>
            <View style={[styles.sectionHeader, { marginTop: 0 }]}>
              <View>
                <Text style={styles.sectionEyebrow}>PLAN YOUR VISIT</Text>
                <Text style={styles.sectionTitle}>Come See Us</Text>
              </View>
            </View>

            <View style={styles.visitCard}>
              <Image source={require('../../assets/Signin.jpg')} style={styles.visitCardImage} resizeMode="cover" />
              <View style={styles.visitCardBody}>
                <View style={styles.visitTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.visitEyebrow}>NATIONAL SHRINE OF OUR LADY OF SORROWS</Text>
                    <Text style={styles.visitTitle}>Experience history{'\n'}in person.</Text>
                  </View>
                  <View style={styles.visitLocationIcon}>
                    <Ionicons name="location" size={22} color={C.gold} />
                  </View>
                </View>

                <View style={styles.visitInfoGrid}>
                  <View style={styles.visitInfoBlock}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.4)" />
                      <Text style={styles.visitInfoLabel}>LOCATION</Text>
                    </View>
                    <Text style={styles.visitInfoValue}>National Shrine of Our Lady of Sorrows</Text>
                  </View>
                  <View style={styles.visitInfoBlock}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <Ionicons name="time-outline" size={10} color="rgba(255,255,255,0.4)" />
                      <Text style={styles.visitInfoLabel}>HOURS</Text>
                    </View>
                    <Text style={styles.visitInfoValue}>8:00 AM – 5:00 PM{'\n'}Daily · Free Entry</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.visitBtn, { flex: 1, backgroundColor: C.gold }]}
                    onPress={openMapModal}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="navigate" size={16} color="#1A1510" />
                    <Text style={styles.visitBtnText}>Directions</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.visitBtn, { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }]}
                    onPress={() => openVisitInfoModal()}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="information-circle-outline" size={16} color="#fff" />
                    <Text style={[styles.visitBtnText, { color: '#fff' }]}>Visit Info</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════════════════ */}
        <View style={styles.footer}>
          <Text style={styles.footerLogo}>ETURISMO</Text>
          <View style={styles.footerLine} />
          <Text style={styles.footerCopyright}>© 2026 ETURISMO · National Shrine of Our Lady of Sorrows{'\n'}Preserving Stories · Connecting Generations</Text>
        </View>
      </ScrollView>
      </Animated.View>

      {/* ══════════════════════════════════════════════════════
          ARTIFACT DETAIL MODAL
      ══════════════════════════════════════════════════════ */}
      {selectedArtifact !== null && (
        <Animated.View style={[styles.modalWrap, { opacity: modalOpacity }]}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={handleModalClose} activeOpacity={1} />
          <Animated.View style={[styles.modalSheet, { transform: [{ translateY: modalSlide }] }]}>
            <View style={styles.modalHandle} />
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={handleModalClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close artifact details"
            >
              <Ionicons name="close" size={18} color={C.inkMid} />
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {selectedArtifact.image_url && (
                <View style={styles.modalHero}>
                  <SmartImage uri={selectedArtifact.image_url} style={styles.modalHeroImg} resizeMode="cover" />
                  <View style={styles.modalHeroScrim} />
                  <View style={styles.modalHeroCatPill}>
                    <Text style={styles.modalHeroCatText}>{selectedArtifact.category.toUpperCase()}</Text>
                  </View>
                  {selectedArtifact.is_exhibition && (
                    <View style={styles.modalHeroLive}>
                      <PulseRing />
                      <Text style={styles.modalHeroLiveText}>EXHIBITION</Text>
                    </View>
                  )}
                </View>
              )}
              <View style={styles.modalBody}>
                <View style={styles.modalGoldAccent} />
                <Text style={styles.modalTitle}>{selectedArtifact.name}</Text>
                <Text style={styles.modalDate}>{selectedArtifact.date}</Text>
                <DiscoveryBadge
                  discovered={selectedDiscovered}
                  colors={C}
                  variant="footer"
                  label={selectedDiscovered ? 'Discovered — full story unlocked' : 'Not discovered'}
                />
                <View style={styles.modalFacts}>
                  {selectedDiscovered && selectedArtifact.creator ? (
                    <View style={styles.modalFactChip}>
                      <Ionicons name="person-outline" size={12} color={C.gold} />
                      <Text style={styles.modalFactText}>{selectedArtifact.creator}</Text>
                    </View>
                  ) : null}
                  {selectedDiscovered && (
                    <View style={styles.modalFactChip}>
                      <Ionicons name="language-outline" size={12} color={C.gold} />
                      <Text style={styles.modalFactText}>
                        {selectedArtifact.translations?.length || 1} language
                        {(selectedArtifact.translations?.length || 1) === 1 ? '' : 's'}
                      </Text>
                    </View>
                  )}
                  {selectedDiscovered && (selectedArtifact.audio_url || selectedArtifact.translations?.some(t => t.audio_url)) ? (
                    <View style={styles.modalFactChip}>
                      <Ionicons name="headset-outline" size={12} color={C.gold} />
                      <Text style={styles.modalFactText}>Audio available</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, modalIsFavorite && styles.modalActionBtnGold]}
                    onPress={toggleModalFavorite} activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={modalIsFavorite ? 'Remove artifact from favorites' : 'Add artifact to favorites'}
                    accessibilityState={{ selected: modalIsFavorite }}
                  >
                    <Ionicons name={modalIsFavorite ? 'heart' : 'heart-outline'} size={18} color={modalIsFavorite ? C.void : C.inkMid} />
                    <Text style={[styles.modalActionText, modalIsFavorite && styles.modalActionTextDark]}>
                      {modalIsFavorite ? 'Favorite' : 'Add favorite'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalActionBtn}
                    onPress={shareArtifact}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Share ${selectedArtifact.name}`}
                  >
                    <Ionicons name="share-social-outline" size={18} color={C.inkMid} />
                    <Text style={styles.modalActionText}>Share</Text>
                  </TouchableOpacity>
                </View>

                {/* ── UNDISCOVERED: preview + locked panel ── */}
                {!selectedDiscovered && (
                  <>
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionLabel}>PREVIEW</Text>
                      <View style={styles.modalSectionUnderline} />
                      <Text style={styles.modalDesc}>
                        {getPreviewDescription(
                          selectedArtifact.description ||
                          selectedArtifact.translations?.find(tr => tr.language_code === 'en')?.description,
                        ) || 'Scan this artifact in the museum to reveal its story.'}
                      </Text>
                    </View>
                    <LockedArtifactContent colors={C} onScan={handleScanToDiscover} />
                  </>
                )}

                {/* ── DISCOVERED: full experience ── */}
                {selectedDiscovered && (selectedArtifact.description || selectedArtifact.translations?.find(t => t.language_code === 'en')?.description) && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>ABOUT THIS PIECE</Text>
                    <View style={styles.modalSectionUnderline} />
                    {(() => {
                      const t = selectedArtifact.translations?.find(tr => tr.language_code === selectedLanguage);
                      const fullDesc = t?.description || selectedArtifact.description || selectedArtifact.translations?.find(tr => tr.language_code === 'en')?.description || '';
                      const LIMIT = 280;
                      const needsTrunc = fullDesc.length > LIMIT;
                      const isCurrentlyPlaying = !!playingLang;
                      return (
                        <>
                          {isCurrentlyPlaying ? (
                            // Word-highlighted text while audio plays
                            <HighlightedText
                              words={audioWords}
                              highlightedIndex={highlightedIndex}
                              textStyle={styles.modalDesc}
                              highlightColor="rgba(201,168,76,0.28)"
                            />
                          ) : (
                            <Text style={styles.modalDesc}>
                              {needsTrunc && !descExpanded ? fullDesc.slice(0, LIMIT).trimEnd() + '…' : fullDesc}
                            </Text>
                          )}
                          {needsTrunc && !isCurrentlyPlaying && (
                            <TouchableOpacity
                              onPress={() => setDescExpanded(v => !v)}
                              activeOpacity={0.7}
                              style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '700', color: C.gold }}>
                                {descExpanded ? 'See Less' : 'See More'}
                              </Text>
                              <Ionicons name={descExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={C.gold} />
                            </TouchableOpacity>
                          )}
                          {isCurrentlyPlaying && (
                            <View style={{
                              flexDirection: 'row', alignItems: 'center', gap: 6,
                              marginTop: 10, backgroundColor: C.goldSoft,
                              borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.borderGold,
                            }}>
                              <Ionicons name="information-circle-outline" size={14} color={C.gold} />
                              <Text style={{ flex: 1, fontSize: 11, color: C.inkMid, lineHeight: 16 }}>
                                Words are highlighted as the narration plays.
                              </Text>
                            </View>
                          )}
                        </>
                      );
                    })()}
                  </View>
                )}

                {selectedDiscovered && selectedArtifact.Historical_Significance ? (
                  <View style={styles.modalSection}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="time-outline" size={13} color={C.gold} />
                      <Text style={styles.modalSectionLabel}>HISTORICAL SIGNIFICANCE</Text>
                    </View>
                    <View style={styles.modalSectionUnderline} />
                    <Text style={styles.modalDesc}>
                      {selectedArtifact.Historical_Significance}
                    </Text>
                  </View>
                ) : null}

                {/* Audio Narration */}
                {selectedDiscovered && (() => {
                  const translations = selectedArtifact.translations || [];
                  const langMeta: Record<string, { label: string; icon: string; name: string }> = {
                    en:  { label: 'EN',  icon: 'language-outline', name: 'English'  },
                    fil: { label: 'FIL', icon: 'language-outline', name: 'Filipino' },
                    ja:  { label: 'JA',  icon: 'language-outline', name: 'Japanese' },
                    es:  { label: 'ES',  icon: 'language-outline', name: 'Spanish'  },
                    ko:  { label: 'KO',  icon: 'language-outline', name: 'Korean'   },
                  };
                  const available = translations.filter(t => t.audio_url || t.description);
                  if (!available.length) return null;
                  const cur = available.find(t => t.language_code === selectedLanguage) || available[0];
                  const isPlaying = !!(cur && playingLang === cur.language_code);
                  return (
                    <View style={styles.modalSection}>
                      {/* Section header */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Ionicons name="headset-outline" size={13} color={C.gold} />
                        <Text style={styles.modalSectionLabel}>AUDIO NARRATION</Text>
                        {isPlaying && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 16, marginLeft: 2 }}>
                            {[0.5, 1, 0.7, 0.9, 0.6].map((h, i) => (
                              <View key={i} style={{ width: 2.5, height: 14 * h, borderRadius: 2, backgroundColor: C.gold }} />
                            ))}
                          </View>
                        )}
                      </View>
                      <View style={styles.modalSectionUnderline} />

                      {/* ── Language chips ── */}
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                        <View style={styles.audioLangRow}>
                          {available.map(t => {
                            const meta = langMeta[t.language_code] || { label: t.language_code.toUpperCase(), icon: 'language-outline', name: t.language_code };
                            const isActive = selectedLanguage === t.language_code;
                            return (
                              <TouchableOpacity
                                key={t.language_code}
                                style={[styles.audioLangChip, isActive && styles.audioLangChipActive]}
                                onPress={() => {
                                  setSelectedLanguage(t.language_code as any);
                                  setLangRowOpen(false);
                                  if (playingLang) cleanupAudio();
                                }}
                                activeOpacity={0.7}
                              >
                                <Ionicons name={(meta.icon || 'language-outline') as any} size={13} color={isActive ? C.gold : C.inkDim} />
                                <Text style={[styles.audioLangLabel, isActive && styles.audioLangLabelActive]}>
                                  {meta.name}
                                </Text>
                                {t.audio_url && (
                                  <Ionicons name="volume-medium-outline" size={11} color={isActive ? C.gold : C.inkDim} />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </ScrollView>

                      {/* ── Audio player card ── */}
                      {cur && cur.audio_url ? (
                        <View style={[styles.audioPlayer, isPlaying && styles.audioPlayerActive]}>
                          {/* Top row */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            <TouchableOpacity
                              style={[styles.audioPlayIcon, isPlaying && styles.audioPlayIconActive]}
                              onPress={() => {
                                if (isPlaying) cleanupAudio();
                                else playAudio(cur.audio_url!, cur.language_code);
                              }}
                              activeOpacity={0.8}
                            >
                              <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={isPlaying ? C.void : C.ink} />
                            </TouchableOpacity>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.audioPlayerLabel}>{isPlaying ? 'Now playing…' : 'Tap to listen'}</Text>
                              <Text style={styles.audioPlayerSub}>
                                {(langMeta[cur.language_code] || { name: cur.language_code }).name} narration
                              </Text>
                            </View>
                          </View>

                          {/* Progress + controls — only when playing */}
                          {isPlaying && (
                            <View style={{ marginTop: 14, gap: 6 }}>
                              {/* Progress track */}
                              <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' }}>
                                <View style={{
                                  height: '100%', backgroundColor: C.gold, borderRadius: 2,
                                  width: `${audioDuration > 0 ? Math.min((audioCurrentTime / audioDuration) * 100, 100) : 0}%`,
                                }} />
                              </View>
                              {/* Times */}
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 10, color: C.inkDim }}>{formatAudioTime(audioCurrentTime)}</Text>
                                <Text style={{ fontSize: 10, color: C.inkDim }}>{formatAudioTime(audioDuration)}</Text>
                              </View>
                              {/* Controls */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                                <TouchableOpacity
                                  style={{ alignItems: 'center', gap: 2, paddingHorizontal: 6 }}
                                  onPress={() => handleAudioSkip(-10)} activeOpacity={0.7}
                                >
                                  <Ionicons name="play-back" size={18} color={C.inkMid} />
                                  <Text style={{ fontSize: 9, color: C.inkMid, fontWeight: '600' }}>10s</Text>
                                </TouchableOpacity>

                                <View style={{ flexDirection: 'row', gap: 4 }}>
                                  {([0.75, 1, 1.5, 2] as const).map(r => (
                                    <TouchableOpacity
                                      key={r}
                                      style={{
                                        paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
                                        backgroundColor: playbackRate === r ? C.gold : C.goldSoft,
                                        borderWidth: 1,
                                        borderColor: playbackRate === r ? C.gold : C.borderGold,
                                      }}
                                      onPress={() => handleAudioRate(r)} activeOpacity={0.7}
                                    >
                                      <Text style={{ fontSize: 11, fontWeight: '700', color: playbackRate === r ? C.ink : C.inkMid }}>
                                        {r === 1 ? '1×' : `${r}×`}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>

                                <TouchableOpacity
                                  style={{ alignItems: 'center', gap: 2, paddingHorizontal: 6 }}
                                  onPress={() => handleAudioSkip(10)} activeOpacity={0.7}
                                >
                                  <Ionicons name="play-forward" size={18} color={C.inkMid} />
                                  <Text style={{ fontSize: 9, color: C.inkMid, fontWeight: '600' }}>10s</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 10,
                          backgroundColor: C.raised, borderWidth: 1, borderColor: C.border,
                          borderRadius: 14, padding: 14, marginTop: 10,
                        }}>
                          <Ionicons name="volume-mute-outline" size={18} color={C.inkDim} />
                          <Text style={{ flex: 1, fontSize: 13, color: C.inkMid, lineHeight: 20 }}>
                            No audio available for {(langMeta[cur?.language_code] || { name: selectedLanguage }).name} yet.
                            {available.some(t2 => t2.audio_url) ? ' Switch language to listen.' : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })()}
              </View>
              {/* ── Community comments (full experience only) ── */}
              {selectedDiscovered && (
                <View style={[styles.modalBody, { paddingTop: 0 }]}>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>COMMUNITY NOTES</Text>
                    <View style={styles.modalSectionUnderline} />
                    <ArtifactComments
                      artifactId={selectedArtifact.id}
                      currentUserId={user?.id ?? null}
                      currentUser={user ? { first_name: user.first_name, last_name: user.last_name, profile_picture: user.profile_picture } : null}
                      C={C}
                      fontScale={fontScale}
                    />
                  </View>
                </View>
              )}
              {!selectedDiscovered && <View style={{ height: 40 + insets.bottom }} />}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      )}

      {/* ══════════════════════════════════════════════════════
          NOTIFICATIONS PANEL
      ══════════════════════════════════════════════════════ */}
      {showNotifPanel && (() => {
        const TYPE_META = {
          artifact:     { icon: 'cube-outline'      as const, label: 'New Artifact',  color: C.gold,    bg: `${C.gold}18`    },
          announcement: { icon: 'megaphone-outline' as const, label: 'Announcement',  color: '#A0640A', bg: 'rgba(160,100,10,0.10)' },
          event:        { icon: 'calendar-outline'  as const, label: 'Event',         color: '#085041', bg: 'rgba(8,80,65,0.10)'    },
        };

        const allItems: { id: string; type: 'artifact'|'announcement'|'event'; title: string; subtitle: string; ts: number; raw: any }[] = [
          ...artifacts.map(a => ({ id: `artifact_${a.id}`,     type: 'artifact'     as const, title: a.name,    subtitle: a.category,                       ts: new Date(a.created_at).getTime(),                                                              raw: a })),
          ...announcements
            .filter(a => wasPublishedAfterSignup(a.created_at, user?.created_at))
            .map(a => ({ id: `announcement_${a.id}`, type: 'announcement' as const, title: a.title, subtitle: (a as any).description?.slice(0,72) ?? '', ts: new Date((a as any).created_at).getTime(), raw: a })),
          ...events
            .filter(e => wasPublishedAfterSignup(e.created_at, user?.created_at))
            .map(e => ({ id: `event_${e.id}`, type: 'event' as const, title: e.title, subtitle: (e as any).description?.slice(0,72) ?? '', ts: new Date((e as any).created_at).getTime(), raw: e })),
        ]
          .filter(i => !notifDismissedIds.has(i.id))
          .sort((a, b) => b.ts - a.ts);

        const unreadCount = allItems.filter(i => !notifReadIds.has(i.id)).length;

        const markAllRead = () =>
          setNotifReadIds(prev => {
            const s = new Set(prev);
            allItems.forEach(i => s.add(i.id));
            AsyncStorage.setItem('notifReadIds', JSON.stringify([...s])).catch(() => {});
            return s;
          });

        const dismissItem = (id: string) =>
          setNotifDismissedIds(prev => {
            const s = new Set([...prev, id]);
            AsyncStorage.setItem('notifDismissedIds', JSON.stringify([...s])).catch(() => {});
            return s;
          });

        const clearAll = () =>
          setNotifDismissedIds(() => {
            const s = new Set(allItems.map(i => i.id));
            AsyncStorage.setItem('notifDismissedIds', JSON.stringify([...s])).catch(() => {});
            return s;
          });

        return (
          <Animated.View style={[styles.modalWrap, { opacity: notifPanelOpacity }]}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={closeNotifPanel} activeOpacity={1} />
            <Animated.View style={[styles.feedModalSheet, { transform: [{ translateY: notifPanelSlide }], maxHeight: SCREEN_HEIGHT * 0.88 }]}>
              <View style={styles.modalHandle} />

              {/* ── Header ── */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12,
                borderBottomWidth: 1, borderBottomColor: C.border,
                gap: 8,
              }}>
                {/* Title + unread badge */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.inkMid, letterSpacing: 1, textTransform: 'uppercase' }}>
                    Notifications
                  </Text>
                  {unreadCount > 0 && (
                    <View style={{ backgroundColor: C.ink, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: C.surface }}>{unreadCount}</Text>
                    </View>
                  )}
                </View>
                {/* Actions */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllRead} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="checkmark-done-outline" size={13} color={C.inkMid} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: C.inkMid }}>Mark all read</Text>
                    </TouchableOpacity>
                  )}
                  {allItems.length > 0 && (
                    <TouchableOpacity onPress={clearAll} activeOpacity={0.7}>
                      <Text style={{ fontSize: 11, color: C.inkDim }}>Clear all</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={closeNotifPanel} activeOpacity={0.7}
                    style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.raised, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="close" size={15} color={C.inkMid} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── List ── */}
              {allItems.length === 0 ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 }}>
                  <Ionicons name="notifications-off-outline" size={40} color={C.border} />
                  <Text style={{ color: C.inkMid, fontSize: 13, fontWeight: '600' }}>All caught up</Text>
                  <Text style={{ color: C.inkDim, fontSize: 11, textAlign: 'center', paddingHorizontal: 32 }}>
                    New artifacts, announcements and events will appear here
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={allItems}
                  keyExtractor={i => i.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 40 }}
                  renderItem={({ item }) => {
                    const meta = TYPE_META[item.type];
                    const isRead = notifReadIds.has(item.id);
                    return (
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => {
                          // Mark this item read and persist
                          setNotifReadIds(prev => {
                            const s = new Set([...prev, item.id]);
                            AsyncStorage.setItem('notifReadIds', JSON.stringify([...s])).catch(() => {});
                            return s;
                          });
                          closeNotifPanel();
                          if (item.type === 'artifact') {
                            setTimeout(() => setSelectedArtifact(item.raw), 400);
                          } else if (item.type === 'announcement') {
                            setTimeout(() => onGoAnnouncements?.(), 400);
                          } else {
                            setTimeout(() => onGoEvents?.(), 400);
                          }
                        }}
                        style={{
                          flexDirection: 'row', alignItems: 'center',
                          paddingHorizontal: 14, paddingVertical: 11,
                          borderBottomWidth: 1, borderBottomColor: C.border,
                          gap: 11,
                          backgroundColor: isRead ? 'transparent' : `${C.gold}07`,
                        }}
                      >
                        {/* Unread dot */}
                        <View style={{ width: 7, alignItems: 'center' }}>
                          {!isRead && (
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.ink }} />
                          )}
                        </View>

                        {/* Icon circle */}
                        <View style={{
                          width: 36, height: 36, borderRadius: 10,
                          backgroundColor: meta.bg,
                          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          overflow: 'hidden',
                        }}>
                          {item.type === 'artifact' && item.raw.image_url ? (
                            <Image source={{ uri: item.raw.image_url }} style={{ width: 36, height: 36, borderRadius: 10 }} resizeMode="cover" />
                          ) : (
                            <Ionicons name={meta.icon} size={17} color={meta.color} />
                          )}
                        </View>

                        {/* Text */}
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                            <Text style={{ fontSize: 12, fontWeight: isRead ? '600' : '800', color: isRead ? C.inkMid : C.ink }} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={{ fontSize: 10, color: C.inkDim, marginLeft: 8, flexShrink: 0 }}>
                              {getTimeAgo(new Date(item.ts))}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: C.inkDim, lineHeight: 15 }} numberOfLines={1}>
                            {item.subtitle || meta.label}
                          </Text>
                        </View>

                        {/* Dismiss X */}
                        <TouchableOpacity
                          onPress={e => { dismissItem(item.id); }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.6}
                          style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.raised, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        >
                          <Ionicons name="close" size={11} color={C.inkDim} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}

              {/* ── Footer ── */}
              {allItems.length > 0 && (
                <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: C.inkDim }}>
                    {allItems.length} notification{allItems.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </Animated.View>
          </Animated.View>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
          PROFILE SHEET
      ══════════════════════════════════════════════════════ */}
      {showProfileSheet && (
        <Animated.View style={[styles.modalWrap, { opacity: profileSheetOpacity }]}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={closeProfileSheet} activeOpacity={1} />
          <Animated.View style={[styles.profileSheet, { transform: [{ translateY: profileSheetSlide }] }]}>
            <View style={styles.modalHandle} />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={closeProfileSheet} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={C.inkMid} />
            </TouchableOpacity>
            <View style={styles.profileSheetBody}>
              <View style={styles.profileSheetAvatar}>
                {user?.profile_picture
                  ? <Image source={{ uri: user.profile_picture }} style={{ width: '100%', height: '100%' }} />
                  : <Text style={styles.profileSheetInitial}>{user?.first_name?.[0]?.toUpperCase() ?? '?'}</Text>}
              </View>
              <Text style={styles.profileSheetName}>{user?.first_name} {user?.last_name}</Text>
              <Text style={styles.profileSheetEmail}>{user?.email}</Text>
              <View style={styles.profileSheetStats}>
                <View style={styles.profileSheetStat}>
                  <Text style={styles.profileSheetStatVal}>{favoriteArtifactIds.length}</Text>
                  <Text style={styles.profileSheetStatLbl}>Favorites</Text>
                </View>
                <View style={styles.profileSheetStatDiv} />
                <View style={styles.profileSheetStat}>
                  <Text style={styles.profileSheetStatVal}>{interestedIds.length}</Text>
                  <Text style={styles.profileSheetStatLbl}>Interested</Text>
                </View>
                <View style={styles.profileSheetStatDiv} />
                <View style={styles.profileSheetStat}>
                  <Text style={styles.profileSheetStatVal}>{artifacts.length}</Text>
                  <Text style={styles.profileSheetStatLbl}>In Collection</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* ══════════════════════════════════════════════════════
          MAP / DIRECTIONS MODAL  — fully in-app routing
      ══════════════════════════════════════════════════════ */}
      {showMapModal && (
        <Animated.View style={[styles.modalWrap, { opacity: mapModalOpacity }]}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={closeMapModal} activeOpacity={1} />
          <Animated.View style={[styles.mapModalSheet, { transform: [{ translateY: mapModalSlide }] }]}>
            <View style={styles.modalHandle} />

            {/* ── Header ── */}
            <View style={styles.mapModalHeader}>
              <Ionicons name="navigate" size={20} color={C.gold} />
              <Text style={styles.mapModalTitle}>Directions to Shrine</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeMapModal} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={C.inkMid} />
              </TouchableOpacity>
            </View>

            {/* ── Mode toggle: Driving / Walking ── */}
            {userLocation && (
              <View style={{
                flexDirection: 'row', gap: 8,
                paddingHorizontal: 16, paddingBottom: 12,
              }}>
                {(['driving', 'walking'] as const).map(mode => {
                  const isActive = routeMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      onPress={() => {
                        setRouteMode(mode);
                        if (userLocation) fetchRoute(userLocation, mode);
                      }}
                      activeOpacity={0.8}
                      style={{
                        flex: 1, flexDirection: 'row', alignItems: 'center',
                        justifyContent: 'center', gap: 6,
                        paddingVertical: 9, borderRadius: 50,
                        backgroundColor: isActive ? C.gold : C.raised,
                        borderWidth: 1,
                        borderColor: isActive ? C.gold : C.border,
                      }}
                    >
                      <Ionicons
                        name={mode === 'driving' ? 'car-outline' : 'walk-outline'}
                        size={15}
                        color={isActive ? C.void : C.inkMid}
                      />
                      <Text style={{
                        fontSize: 12, fontWeight: '700',
                        color: isActive ? C.void : C.inkMid,
                      }}>
                        {mode === 'driving' ? 'Driving' : 'Walking'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ── Map ── */}
            <View style={{ flex: 1, position: 'relative' }}>
              <MapView
                ref={mapRef}
                style={styles.mapView}
                provider={PROVIDER_DEFAULT}
                initialRegion={{
                  latitude: MUSEUM_LOCATION.latitude,
                  longitude: MUSEUM_LOCATION.longitude,
                  latitudeDelta: 0.04,
                  longitudeDelta: 0.04,
                }}
                showsUserLocation={!!userLocation}
                showsMyLocationButton={false}
                showsCompass
                toolbarEnabled={false}
              >
                {/* Museum marker */}
                <Marker
                  coordinate={MUSEUM_LOCATION}
                  title="National Shrine of Our Lady of Sorrows"
                  description="Your destination"
                  pinColor="#C9A84C"
                />
                {/* User marker */}
                {userLocation && (
                  <Marker
                    coordinate={userLocation}
                    title="Your Location"
                    pinColor="#2ECC71"
                  />
                )}
                {/* OSRM route polyline */}
                {routeCoords.length > 1 && (
                  <Polyline
                    coordinates={routeCoords}
                    strokeColor="#C9A84C"
                    strokeWidth={4}
                  />
                )}
                {/* Fallback straight line while route is loading */}
                {userLocation && routeCoords.length === 0 && !routeLoading && (
                  <Polyline
                    coordinates={[userLocation, MUSEUM_LOCATION]}
                    strokeColor={C.border}
                    strokeWidth={2}
                    lineDashPattern={[6, 5]}
                  />
                )}
              </MapView>

              {/* Location / route loading overlay */}
              {(locationLoading || routeLoading) && (
                <View style={styles.mapLocatingOverlay}>
                  <ActivityIndicator size="large" color="#C9A84C" />
                  <Text style={styles.mapLocatingText}>
                    {locationLoading ? 'Getting your location…' : 'Calculating route…'}
                  </Text>
                  {locationLoading && (
                    <Text style={styles.mapLocatingSubText}>
                      Please allow location access when prompted.
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* ── Info strip ── */}
            <View style={styles.mapInfoStrip}>
              <View style={styles.mapInfoItem}>
                <Ionicons name="location" size={18} color={C.gold} />
                <View>
                  <Text style={styles.mapInfoLabel}>DESTINATION</Text>
                  <Text style={styles.mapInfoValue}>National Shrine of Our Lady of Sorrows</Text>
                </View>
              </View>

              {userLocation && (
                <>
                  <View style={styles.mapDivider} />
                  <View style={styles.mapInfoItem}>
                    <Ionicons
                      name={routeMode === 'driving' ? 'car-outline' : 'walk-outline'}
                      size={18} color={C.teal}
                    />
                    <View>
                      <Text style={styles.mapInfoLabel}>DISTANCE</Text>
                      <Text style={styles.mapInfoValue}>{getDistanceText()}</Text>
                    </View>
                  </View>
                </>
              )}

              {/* Route error */}
              {routeError && (
                <>
                  <View style={styles.mapDivider} />
                  <TouchableOpacity
                    onPress={() => userLocation && fetchRoute(userLocation, routeMode)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 5,
                      backgroundColor: 'rgba(231,76,60,0.1)',
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                      borderWidth: 1, borderColor: 'rgba(231,76,60,0.25)',
                    }}
                  >
                    <Ionicons name="refresh-outline" size={14} color={C.crimson} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: C.crimson }}>Retry route</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Show / hide steps button */}
              {routeSteps.length > 0 && (
                <>
                  <View style={styles.mapDivider} />
                  <TouchableOpacity
                    onPress={() => setShowSteps(v => !v)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 5,
                      backgroundColor: showSteps ? C.goldSoft : C.raised,
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                      borderWidth: 1, borderColor: showSteps ? C.borderGold : C.border,
                    }}
                  >
                    <Ionicons name="list-outline" size={15} color={showSteps ? C.gold : C.inkMid} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: showSteps ? C.gold : C.inkMid }}>
                      {showSteps ? 'Hide' : 'Steps'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Location error (no route possible) */}
              {locationError && !userLocation && (
                <Text style={[styles.mapInfoValue, { fontSize: 10, color: C.inkMid, flex: 1 }]} numberOfLines={2}>
                  {locationError}
                </Text>
              )}
            </View>

            {/* ── Step-by-step instructions panel ── */}
            {showSteps && routeSteps.length > 0 && (
              <View style={{
                maxHeight: 220,
                borderTopWidth: 1, borderTopColor: C.divider,
                backgroundColor: C.deep,
              }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
                }}>
                  <Ionicons name="map-outline" size={14} color={C.gold} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: C.gold, letterSpacing: 1.5 }}>
                    TURN-BY-TURN
                  </Text>
                  <Text style={{ fontSize: 10, color: C.inkDim }}>
                    · {routeSteps.length} steps
                  </Text>
                </View>
                <ScrollView
                  style={{ paddingHorizontal: 16 }}
                  contentContainerStyle={{ paddingBottom: 16, gap: 2 }}
                  showsVerticalScrollIndicator={false}
                >
                  {routeSteps.map((step, i) => {
                    const isLast = i === routeSteps.length - 1;
                    return (
                      <View
                        key={i}
                        style={{
                          flexDirection: 'row', gap: 12, alignItems: 'flex-start',
                          paddingVertical: 8,
                          borderBottomWidth: isLast ? 0 : 1,
                          borderBottomColor: C.divider,
                        }}
                      >
                        {/* Step number badge */}
                        <View style={{
                          width: 24, height: 24, borderRadius: 12,
                          backgroundColor: isLast ? C.gold : C.raised,
                          borderWidth: 1,
                          borderColor: isLast ? C.gold : C.border,
                          alignItems: 'center', justifyContent: 'center',
                          marginTop: 1, flexShrink: 0,
                        }}>
                          {isLast
                            ? <Ionicons name="flag" size={12} color={C.void} />
                            : <Text style={{ fontSize: 9, fontWeight: '800', color: C.inkMid }}>{i + 1}</Text>
                          }
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, color: C.ink, fontWeight: isLast ? '700' : '500', lineHeight: 18 }}>
                            {step.instruction}
                          </Text>
                          {step.distance && step.distance !== '0 m' && !isLast && (
                            <Text style={{ fontSize: 11, color: C.inkDim, marginTop: 2 }}>
                              {step.distance}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      )}

      {/* ══════════════════════════════════════════════════════
          VISIT INFO MODAL
      ══════════════════════════════════════════════════════ */}
      {showVisitInfoModal && (
        <Animated.View style={[styles.modalWrap, { opacity: visitInfoOpacity }]}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={closeVisitInfoModal} activeOpacity={1} />
          <Animated.View style={[
            styles.modalSheet,
            { transform: [{ translateY: visitInfoSlide }], maxHeight: SCREEN_HEIGHT * 0.92 },
          ]}>
            <View style={styles.modalHandle} />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={closeVisitInfoModal} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={C.inkMid} />
            </TouchableOpacity>

            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
            >
              {/* ── Header ── */}
              <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 }}>
                <Text style={{ fontSize: 9, letterSpacing: 3, color: C.gold, fontWeight: '800', marginBottom: 6 }}>
                  PLAN YOUR VISIT
                </Text>
                <Text style={{ fontSize: 26, fontWeight: '900', color: C.ink, letterSpacing: -0.8, lineHeight: 32 }}>
                  Hours & Admission
                </Text>
                {/* Live open/closed pill */}
                {(() => {
                  const h = new Date().getHours() + new Date().getMinutes() / 60;
                  const open = h >= 8 && h < 17;
                  return (
                    <View style={{
                      alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
                      marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50,
                      backgroundColor: open ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.08)',
                      borderWidth: 1,
                      borderColor: open ? 'rgba(46,204,113,0.3)' : 'rgba(231,76,60,0.2)',
                    }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: open ? C.teal : C.crimson }} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: open ? C.teal : C.crimson }}>
                        {open ? 'Open Now · Closes at 5:00 PM' : 'Closed · Opens at 8:00 AM'}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              {/* ── Hours ── */}
              <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="time-outline" size={16} color={C.gold} />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2, color: C.gold }}>OPENING HOURS</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
                </View>
                <View style={{ backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day, idx, arr) => {
                    const dayNum = idx === 6 ? 0 : idx + 1; // Sunday = 0
                    const isToday = new Date().getDay() === dayNum;
                    return (
                      <View key={day} style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: 16, paddingVertical: 13,
                        borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: C.border,
                        backgroundColor: isToday ? C.goldSoft : 'transparent',
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: isToday ? '800' : '500', color: isToday ? C.ink : C.inkMid }}>{day}</Text>
                          {isToday && (
                            <View style={{ backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.borderGold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50 }}>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: C.gold, letterSpacing: 1 }}>TODAY</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: isToday ? '800' : '600', color: isToday ? C.gold : C.inkMid }}>
                          8:00 AM – 5:00 PM
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* ── Admission ── */}
              <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(46,204,113,0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="ticket-outline" size={16} color={C.teal} />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2, color: C.gold }}>ADMISSION</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {[
                    { label: 'General Admission', icon: 'people-outline' },
                    { label: 'Students', icon: 'school-outline' },
                    { label: 'Senior Citizens', icon: 'heart-outline' },
                    { label: 'Persons with Disability', icon: 'accessibility-outline' },
                  ].map(item => (
                    <View key={item.label} style={{
                      flex: 1, minWidth: '45%', backgroundColor: C.surface, borderRadius: 14,
                      borderWidth: 1, borderColor: C.border, padding: 14, alignItems: 'center', gap: 6,
                    }}>
                      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.borderGold, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={item.icon as any} size={18} color={C.gold} />
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: C.inkMid, textAlign: 'center', lineHeight: 15 }}>{item.label}</Text>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: C.gold }}>Free</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* ── Visitor Guidelines ── */}
              <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(231,76,60,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={C.crimson} />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2, color: C.gold }}>VISITOR GUIDELINES</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
                </View>
                {[
                  { icon: 'restaurant-outline',    color: '#E74C3C', title: 'No Food or Drinks',        body: 'Eating and drinking are strictly prohibited inside the shrine and exhibition areas to preserve the artifacts and maintain the sanctity of the space.' },
                  { icon: 'volume-mute-outline',   color: '#C9A84C', title: 'Observe Silence',          body: 'Please speak softly and keep noise to a minimum. This is a place of worship and quiet reflection — silence honours those who come to pray.' },
                  { icon: 'walk-outline',          color: '#2980B9', title: 'Walk, Do Not Run',         body: 'Running in the hallways and galleries is not permitted. Please walk at all times to ensure the safety of fellow visitors and the protection of displayed artifacts.' },
                  { icon: 'hand-left-outline',     color: '#E67E22', title: 'Do Not Touch Artifacts',   body: 'Please refrain from touching display items unless explicitly permitted. Oils from skin can cause irreversible damage to centuries-old materials.' },
                  { icon: 'camera-outline',        color: '#8E44AD', title: 'Photography Etiquette',    body: 'Personal photography is welcome. Flash photography and tripods are not allowed near artifacts. Please be mindful of other visitors.' },
                  { icon: 'shirt-outline',         color: '#27AE60', title: 'Dress Respectfully',       body: 'As a place of worship, visitors are encouraged to dress modestly out of respect for the shrine and its community.' },
                ].map(rule => (
                  <View key={rule.title} style={{
                    backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border,
                    padding: 14, marginBottom: 10, flexDirection: 'row', gap: 12, alignItems: 'flex-start',
                  }}>
                    <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: `${rule.color}18`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Ionicons name={rule.icon as any} size={18} color={rule.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: C.ink, marginBottom: 3 }}>{rule.title}</Text>
                      <Text style={{ fontSize: 12, color: C.inkMid, lineHeight: 18 }}>{rule.body}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* ── Notice ── */}
              <View style={{
                flexDirection: 'row', gap: 12, alignItems: 'flex-start',
                backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.borderGold,
                borderRadius: 14, padding: 14, marginHorizontal: 20, marginBottom: 8,
              }}>
                <Ionicons name="information-circle-outline" size={18} color={C.gold} style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 12, color: C.inkMid, lineHeight: 18 }}>
                  Hours and guidelines are subject to change during feast days, special liturgical celebrations, and Holy Week. Please check with shrine staff for updates.
                </Text>
              </View>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}