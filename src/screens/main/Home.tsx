import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  FlatList, Image, Animated, Dimensions,
  ActivityIndicator, TextInput,
  ImageBackground, Easing, Share, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../../services/supabase';
import { STORAGE_KEYS, toggleInStringArray, getStringArray, logVisit } from '../../utils/storage';
import { useAppTheme } from '../../context/ThemeContext';
import { useAppContext } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { THEMES } from '../../constants/themes';
import { useAudioWordHighlight } from '../../hooks/useAudioWordHighlight';
import ArtifactComments from './ArtifactComments';
import ArtifactAudioPlayer from '../../components/ArtifactAudioPlayer';
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
import { buildC, getStyles, widgetS } from '../../features/home/styles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;


let C = buildC(THEMES.light);
let styles = getStyles(C);

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
            { icon: 'headset-outline',  text: 'Listen to multilingual audio guides' },
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
      <Text style={styles.toastText}>Welcome back, <Text style={styles.toastName}>{name}</Text></Text>
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
function ArtifactCard({ item, width, onPress, isFavorite, index }: {
  item: Artifact; width: number; onPress: () => void; isFavorite?: boolean; index: number;
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
  return (
    <Animated.View style={{ width, opacity: fadeAnim, transform: [{ scale: scaleAnim }, { translateY: slideAnim }] }}>
      <TouchableOpacity
        style={styles.card} onPress={onPress} activeOpacity={1}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.category}${isFavorite ? ', favorite' : ''}`}
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
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.cardAccentLine} />
            <Text style={styles.cardDate}>{item.date}</Text>
          </View>
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

// ─── Feed Card (modal) ───────────────────────────────────────────────────────────
function FeedCard({ item, type, isInterested, onToggleInterested }: {
  item: any; type: 'announcement' | 'event'; isInterested?: boolean; onToggleInterested?: () => void;
}) {
  const rawDate = type === 'announcement' ? item.announcement_datetime : item.event_datetime;
  const date = new Date(rawDate);
  const isEvent = type === 'event';
  const badgeColor = isEvent ? '#085041' : '#854F0B';
  const badgeBg = isEvent ? 'rgba(8,80,65,0.1)' : 'rgba(133,79,11,0.1)';
  return (
    <View style={styles.feedCard}>
      {item.image_url ? <SmartImage uri={item.image_url} style={styles.feedCardImage} resizeMode="cover" /> : null}
      <View style={styles.feedCardBody}>
        <View style={styles.feedTopRow}>
          <View style={[styles.feedBadge, { backgroundColor: badgeBg, borderColor: `${badgeColor}40` }]}>
            <Ionicons name={isEvent ? 'calendar-outline' : 'megaphone-outline'} size={10} color={badgeColor} />
            <Text style={[styles.feedBadgeText, { color: badgeColor }]}>{isEvent ? 'EVENT' : 'ANNOUNCEMENT'}</Text>
          </View>
          <TouchableOpacity style={[styles.interestedBtn, isInterested && styles.interestedBtnActive]} onPress={onToggleInterested} activeOpacity={0.75}>
            <Ionicons name={isInterested ? 'heart' : 'heart-outline'} size={14} color={isInterested ? '#E74C3C' : C.inkMid} />
            <Text style={[styles.interestedBtnText, isInterested && styles.interestedBtnTextActive]}>Interested</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.feedTitle}>{item.title}</Text>
        {item.description ? <Text style={styles.feedDesc}>{item.description}</Text> : null}
        <View style={styles.feedFooter}>
          <Ionicons name={isEvent ? 'time-outline' : 'calendar-outline'} size={11} color={C.inkDim} />
          <Text style={styles.feedFooterText}>{formatDate(rawDate)}</Text>
          {isEvent && (<><View style={styles.feedFooterDot} /><Text style={styles.feedFooterText}>{date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text></>)}
        </View>
      </View>
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

// ─── UpdatesWidget ────────────────────────────────────────────────────────────────
// A single unified card widget with tab switcher between Announcements & Events.
// Announcements: horizontally scrollable peekable cards
// Events: vertical timeline list with countdown chips
function UpdatesWidget({
  announcements, events, hasUnread, onSeeAllAnnouncements, onSeeAllEvents,
}: {
  announcements: Announcement[];
  events: Event[];
  hasUnread: boolean;
  onSeeAllAnnouncements: () => void;
  onSeeAllEvents: () => void;
}) {
  const [tab, setTab] = React.useState<'announcements' | 'events'>('announcements');
  const tabAnim = useRef(new Animated.Value(0)).current;

  const switchTab = (t: 'announcements' | 'events') => {
    setTab(t);
    Animated.spring(tabAnim, {
      toValue: t === 'announcements' ? 0 : 1,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  };

  const indicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '52%'],
  });

  const AMBER = '#A0640A';
  const TEAL  = '#085041';

  return (
    <View style={{ marginTop: 8, marginBottom: 4 }}>
      {/* ── Widget header ── */}
      <View style={[widgetS.sectionHeader]}>
        <View>
          <Text style={widgetS.eyebrow}>STAY CONNECTED</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={widgetS.title}>Latest Updates</Text>
            {hasUnread && <View style={widgetS.unreadPill} />}
          </View>
        </View>
      </View>

      {/* ── Widget card ── */}
      <View style={widgetS.card}>
        {/* Tab switcher */}
        <View style={widgetS.tabRow}>
          <Animated.View style={[widgetS.tabIndicator, { left: indicatorLeft }]} />
          <TouchableOpacity
            style={widgetS.tabBtn}
            onPress={() => switchTab('announcements')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="megaphone"
              size={13}
              color={tab === 'announcements' ? AMBER : C.inkDim}
            />
            <Text style={[widgetS.tabLabel, tab === 'announcements' && { color: AMBER, fontWeight: '700' }]}>
              Announcements
            </Text>
            {announcements.length > 0 && (
              <View style={[widgetS.tabCount, { backgroundColor: tab === 'announcements' ? `${AMBER}22` : C.raised }]}>
                <Text style={[widgetS.tabCountText, { color: tab === 'announcements' ? AMBER : C.inkDim }]}>
                  {announcements.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={widgetS.tabBtn}
            onPress={() => switchTab('events')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="calendar"
              size={13}
              color={tab === 'events' ? TEAL : C.inkDim}
            />
            <Text style={[widgetS.tabLabel, tab === 'events' && { color: TEAL, fontWeight: '700' }]}>
              Events
            </Text>
            {events.length > 0 && (
              <View style={[widgetS.tabCount, { backgroundColor: tab === 'events' ? `${TEAL}18` : C.raised }]}>
                <Text style={[widgetS.tabCountText, { color: tab === 'events' ? TEAL : C.inkDim }]}>
                  {events.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Announcements pane ── */}
        {tab === 'announcements' && (
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}
              decelerationRate="fast"
              snapToInterval={SCREEN_WIDTH - 72}
              snapToAlignment="start"
            >
              {announcements.slice(0, 5).map((item, idx) => {
                const date = new Date(item.announcement_datetime);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={onSeeAllAnnouncements}
                    activeOpacity={0.85}
                    style={[widgetS.annoCard, { width: SCREEN_WIDTH - 72 }]}
                  >
                    {item.image_url ? (
                      <SmartImage
                        uri={item.image_url}
                        style={widgetS.annoImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[widgetS.annoImagePlaceholder]}>
                        <Ionicons name="megaphone" size={28} color={`${AMBER}60`} />
                      </View>
                    )}
                    <View style={widgetS.annoBody}>
                      <View style={widgetS.annoTopRow}>
                        <View style={widgetS.annoBadge}>
                          <Ionicons name="megaphone-outline" size={9} color={AMBER} />
                          <Text style={[widgetS.annoBadgeText, { color: AMBER }]}>ANNOUNCEMENT</Text>
                        </View>
                        <Text style={widgetS.annoTime}>{getTimeAgo(date)}</Text>
                      </View>
                      <Text style={widgetS.annoTitle} numberOfLines={2}>{item.title}</Text>
                      {item.description ? (
                        <Text style={widgetS.annoDesc} numberOfLines={2}>{item.description}</Text>
                      ) : null}
                      <View style={widgetS.annoFooter}>
                        <Ionicons name="calendar-outline" size={10} color={C.inkDim} />
                        <Text style={widgetS.annoFooterText}>{formatDate(item.announcement_datetime)}</Text>
                        <View style={widgetS.annoFooterDot} />
                        <Text style={[widgetS.annoFooterText, { color: AMBER, fontWeight: '600' }]}>Read more →</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {/* See-all tile */}
              <TouchableOpacity
                onPress={onSeeAllAnnouncements}
                activeOpacity={0.8}
                style={widgetS.seeAllTile}
              >
                <View style={widgetS.seeAllIcon}>
                  <Ionicons name="chevron-forward" size={20} color={AMBER} />
                </View>
                <Text style={[widgetS.seeAllText, { color: AMBER }]}>All</Text>
                <Text style={[widgetS.seeAllText, { color: AMBER }]}>updates</Text>
              </TouchableOpacity>
            </ScrollView>
            {/* Dot indicators */}
            {announcements.length > 1 && (
              <View style={widgetS.dotRow}>
                {announcements.slice(0, 5).map((_, i) => (
                  <View key={i} style={[widgetS.dot, i === 0 && widgetS.dotActive]} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Events pane ── */}
        {tab === 'events' && (
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
            {events.slice(0, 3).map((item, idx) => {
              const date = new Date(item.event_datetime);
              const countdown = getEventCountdown(item.event_datetime);
              const isLast = idx === Math.min(events.length, 3) - 1;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={onSeeAllEvents}
                  activeOpacity={0.85}
                  style={widgetS.eventRow}
                >
                  {/* Timeline column */}
                  <View style={widgetS.timeline}>
                    <View style={[widgetS.timelineDot, { borderColor: TEAL, backgroundColor: `${TEAL}18` }]}>
                      <View style={[widgetS.timelineDotInner, { backgroundColor: TEAL }]} />
                    </View>
                    {!isLast && <View style={[widgetS.timelineLine, { backgroundColor: `${TEAL}25` }]} />}
                  </View>
                  {/* Content */}
                  <View style={[widgetS.eventCard, isLast && { marginBottom: 14 }]}>
                    <View style={widgetS.eventCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={widgetS.eventTitle} numberOfLines={2}>{item.title}</Text>
                        <View style={widgetS.eventMeta}>
                          <Ionicons name="time-outline" size={10} color={C.inkDim} />
                          <Text style={widgetS.eventMetaText}>
                            {formatDate(item.event_datetime)} · {formatEventTime(date)}
                          </Text>
                        </View>
                      </View>
                      {countdown ? (
                        <View style={[widgetS.countdownChip, { borderColor: `${TEAL}40`, backgroundColor: `${TEAL}12` }]}>
                          <Text style={[widgetS.countdownText, { color: TEAL }]}>{countdown}</Text>
                        </View>
                      ) : null}
                    </View>
                    {item.description ? (
                      <Text style={widgetS.eventDesc} numberOfLines={2}>{item.description}</Text>
                    ) : null}
                    <View style={widgetS.eventFooter}>
                      <Text style={[widgetS.eventDetailsLink, { color: TEAL }]}>View details →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            {events.length > 3 && (
              <TouchableOpacity
                onPress={onSeeAllEvents}
                activeOpacity={0.8}
                style={widgetS.seeAllRow}
              >
                <Text style={[widgetS.seeAllRowText, { color: TEAL }]}>
                  +{events.length - 3} more event{events.length - 3 !== 1 ? 's' : ''}
                </Text>
                <Ionicons name="chevron-forward" size={13} color={TEAL} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Module-level constants ───────────────────────────────────────────────────
const MUSEUM_LOCATION = { latitude: 14.016902, longitude: 121.402152 };

// ─── HomeScreen ──────────────────────────────────────────────────────────────────
export default function HomeScreen({ setNavbarVisible }: { setNavbarVisible?: (visible: boolean) => void }) {
  const { theme } = useAppTheme();
  C = buildC(theme);
  const insets = useSafeAreaInsets();
  const styles = getStyles(C);
  const { fontScale } = useAppContext();
  const { language: appLanguage } = useLanguage();

  // ── State ──
  const [activeTab, setActiveTab] = useState<ArtifactTab>('All');
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

  // Keep selectedLanguage in sync when user changes the app-wide language in Settings
  useEffect(() => {
    setSelectedLanguage(appLanguage);
  }, [appLanguage]);
  const [audioDuration, setAudioDuration] = useState<number>(60);
  const [favoriteArtifactIds, setFavoriteArtifactIds] = useState<string[]>([]);
  const [modalIsFavorite, setModalIsFavorite] = useState(false);
  const [interestedIds, setInterestedIds] = useState<string[]>([]);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [hasUnreadFeed, setHasUnreadFeed] = useState(false);
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [feedModalTab, setFeedModalTab] = useState<'announcements' | 'events'>('announcements');
  const [showVisitInfoModal, setShowVisitInfoModal] = useState(false);

  // ── Exhibition Spotlight state ──
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const spotlightFade = useRef(new Animated.Value(1)).current;

  // ── Offline state ──
  const [isOffline, setIsOffline] = useState(false);

  // ── Map state ──
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
  const [routeDistanceM, setRouteDistanceM] = useState<number | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  // ── Animated refs ──
  const profileSheetSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const profileSheetOpacity = useRef(new Animated.Value(0)).current;
  const feedModalSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const feedModalOpacity = useRef(new Animated.Value(0)).current;
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

  // ── Word-highlighting for audio guide ──
  const currentAudioDesc: string = (() => {
    if (!selectedArtifact) return '';
    const t = selectedArtifact.translations?.find(tr => tr.language_code === selectedLanguage);
    return t?.description || selectedArtifact.description || '';
  })();
  const {
    currentTime: audioCurrentTime,
    startHighlight,
    stopHighlight,
    resetHighlight,
  } = useAudioWordHighlight({ text: currentAudioDesc, durationSeconds: audioDuration });

  // ── Navbar visibility ──
  useEffect(() => {
    setNavbarVisible?.(!selectedArtifact && !showFeedModal && !showProfileSheet && !showMapModal && !showVisitInfoModal);
  }, [selectedArtifact, showFeedModal, showProfileSheet, showMapModal, showVisitInfoModal]);

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
    return () => cleanupAudio();
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
      const lastSeen = await AsyncStorage.getItem('feedLastSeen');
      setHasUnreadFeed(!lastSeen);
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

  // ── Data fetch ──
  async function fetchData() {
    setLoading(true); setError(null);
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authUser) throw new Error('Please sign in to continue');
      const { data: userData, error: userError } = await supabase
        .from('users').select('id, first_name, last_name, email, profile_picture')
        .eq('id', authUser.id).single();
      if (userError) throw userError;
      setUser(userData);

      // ── Welcome: new user → modal, returning user → toast ──
      const welcomeKey = `welcome_modal_seen_${authUser.id}`;
      const alreadySeen = await AsyncStorage.getItem(welcomeKey);
      if (!alreadySeen) {
        // First login on this install — show welcome modal and mark as seen
        await AsyncStorage.setItem(welcomeKey, 'true');
        setShowWelcomeModal(true);
      } else {
        // Returning user — show welcome back toast
        setShowToast(true);
      }

      const { data: items, error: itemsError } = await supabase
        .from('artifacts')
        .select('id, name, category, qr_code, created_at, description, image_url, creator, Historical_Significance, artifact_translations(language_code, name, description, audio_url)')
        .order('created_at', { ascending: false });
      if (itemsError) throw itemsError;

      const enriched: Artifact[] = (items || []).map(item => ({
        ...item,
        translations: (item as any).artifact_translations || [],
        audio_url: (item as any).audio_guides?.[0]?.audio_url || null,
        date: formatYear(item.created_at),
        image_url: item.image_url || ARTIFACT_CATEGORY_IMAGES[item.category] || 'https://via.placeholder.com/600',
        is_exhibition: item.category === 'Vestments' || item.category === 'Sacred Vessels',
        is_crown: item.name?.toLowerCase().includes('crown') || item.category === 'Altar Furnishings',
        is_artwork: item.category === 'Devotional Objects' || item.category === 'Sacramentals',
      }));
      setArtifacts(enriched);
      setIsOffline(false);

      // ── Persist cache for offline use ──
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.cachedArtifacts, JSON.stringify(enriched));
      } catch (_) {}

      const { data: eventsData, error: eventsError } = await supabase
        .from('events').select('id, title, event_datetime, description, image_url, created_at')
        .order('event_datetime', { ascending: false });
      if (!eventsError) setEvents(eventsData || []);

      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements').select('id, title, announcement_datetime, description, image_url, created_at')
        .order('announcement_datetime', { ascending: false });
      if (!announcementsError) setAnnouncements(announcementsData || []);

      try {
        const lastSeen = await AsyncStorage.getItem('feedLastSeen');
        const newestTs = [...(eventsData || []), ...(announcementsData || [])]
          .map(i => new Date((i as any).event_datetime || (i as any).announcement_datetime).getTime())
          .reduce((a, b) => Math.max(a, b), 0);
        setHasUnreadFeed(!lastSeen || newestTs > parseInt(lastSeen, 10));
      } catch (_) {}
    } catch (err: any) {
      // ── Fall back to cache if offline ──
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

  function openFeedModal(tab: 'announcements' | 'events') {
    setFeedModalTab(tab);
    setShowFeedModal(true);
    setHasUnreadFeed(false);
    AsyncStorage.setItem('feedLastSeen', Date.now().toString()).catch(() => {});
    Animated.parallel([
      Animated.spring(feedModalSlide, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
      Animated.timing(feedModalOpacity, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
    ]).start();
  }
  function closeFeedModal() {
    Animated.parallel([
      Animated.timing(feedModalSlide, { toValue: SCREEN_HEIGHT, duration: 350, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
      Animated.timing(feedModalOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setShowFeedModal(false));
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
    setRouteDistanceM(null);
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
      setRouteDistanceM(route.distance ?? null);
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
    if (routeDistanceM !== null) {
      return routeDistanceM < 1000
        ? `${Math.round(routeDistanceM)} m`
        : `${(routeDistanceM / 1000).toFixed(1)} km`;
    }
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

  const firstName = user?.first_name || 'Explorer';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });


  // ── Loading ──
  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.centerScreen]} edges={['top']}>
        <StatusBar style="dark" />
          <View style={styles.loadingOrb}>
            <Ionicons name="sparkles" size={28} color={C.gold} />
          </View>
          <Text style={styles.loadingEyebrow}>ETURISMO</Text>
          <Text style={styles.loadingText}>Loading collection…</Text>
          <View style={styles.loadingDots}>
            <LoadingDot delay={0} />
            <LoadingDot delay={160} />
            <LoadingDot delay={320} />
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

      <ScrollView
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
          style={[styles.hero, { height: 260 + insets.top }]}
          imageStyle={styles.heroBgImage}
        >
          <View style={styles.heroOverlay} />

          {/* Top bar — padded by real status bar height so clock/battery stay visible */}
          <View style={[styles.heroTopBar, { paddingTop: insets.top + 14 }]}>
            <View style={styles.heroLogoGroup}>
              <Text style={styles.heroLogo}>ETURISMO</Text>
              <Text style={styles.heroLogoSub}>CULTURE · HISTORY · HERITAGE</Text>
            </View>
            <TouchableOpacity
              style={styles.heroProfileBtn}
              onPress={openProfileSheet}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open profile summary"
            >
              {user?.profile_picture
                ? <Image source={{ uri: user.profile_picture }} style={styles.heroProfileImage} />
                : <Text style={styles.heroProfileInitial}>{firstName[0]?.toUpperCase()}</Text>}
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
          eventCount={events.length}
          colors={C}
        />

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
          <FlatList
            data={filteredArtifacts}
            renderItem={({ item, index }) => (
              <ArtifactCard
                item={item} width={CARD_WIDTH}
                onPress={() => setSelectedArtifact(item)}
                isFavorite={favoriteArtifactIds.includes(item.id)}
                index={index}
              />
            )}
            keyExtractor={i => i.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
          />
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
            UPDATES WIDGET
        ══════════════════════════════════════════════════════ */}
        {(announcements.length > 0 || events.length > 0) && !searchQuery && (
          <UpdatesWidget
            announcements={announcements}
            events={events}
            hasUnread={hasUnreadFeed}
            onSeeAllAnnouncements={() => openFeedModal('announcements')}
            onSeeAllEvents={() => openFeedModal('events')}
          />
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
                    onPress={() => openVisitInfoModal()}                    activeOpacity={0.85}
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
                  <SmartImage uri={selectedArtifact.image_url} style={styles.modalHeroImg} resizeMode="contain" />
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
                <View style={styles.modalFacts}>
                  {selectedArtifact.creator ? (
                    <View style={styles.modalFactChip}>
                      <Ionicons name="person-outline" size={12} color={C.gold} />
                      <Text style={styles.modalFactText}>{selectedArtifact.creator}</Text>
                    </View>
                  ) : null}
                  <View style={styles.modalFactChip}>
                    <Ionicons name="language-outline" size={12} color={C.gold} />
                    <Text style={styles.modalFactText}>
                      {selectedArtifact.translations?.length || 1} language
                      {(selectedArtifact.translations?.length || 1) === 1 ? '' : 's'}
                    </Text>
                  </View>
                  {(selectedArtifact.audio_url || selectedArtifact.translations?.some(t => t.audio_url)) ? (
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

                {(selectedArtifact.description || selectedArtifact.translations?.find(t => t.language_code === 'en')?.description) && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>ABOUT THIS PIECE</Text>
                    <View style={styles.modalSectionUnderline} />
                    {(() => {
                      const t = selectedArtifact.translations?.find(tr => tr.language_code === selectedLanguage);
                      const fullDesc = t?.description || selectedArtifact.description || selectedArtifact.translations?.find(tr => tr.language_code === 'en')?.description || '';
                      const LIMIT = 280;
                      const needsTrunc = fullDesc.length > LIMIT;
                      return (
                        <>
                          <Text style={styles.modalDesc}>
                            {needsTrunc && !descExpanded ? fullDesc.slice(0, LIMIT).trimEnd() + '…' : fullDesc}
                          </Text>
                          {needsTrunc && (
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
                        </>
                      );
                    })()}
                  </View>
                )}

                {selectedArtifact.Historical_Significance ? (
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

                {/* Audio Guide */}
                {(() => {
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
                        <Text style={styles.modalSectionLabel}>AUDIO GUIDE</Text>
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
                        <ArtifactAudioPlayer
                          audioUrl={cur.audio_url}
                          imageUrl={selectedArtifact.image_url}
                          trackLabel={`${(langMeta[cur.language_code] || { name: cur.language_code }).name} narration`}
                          isPlaying={isPlaying}
                          currentTime={audioCurrentTime}
                          duration={audioDuration}
                          playbackRate={playbackRate}
                          onPlay={() => playAudio(cur.audio_url!, cur.language_code)}
                          onPause={cleanupAudio}
                          onSeek={handleAudioSeek}
                          onSkip={handleAudioSkip}
                          onRateChange={handleAudioRate}
                          C={C}
                        />
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
              {/* ── Community comments ── */}
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
            </ScrollView>
          </Animated.View>
        </Animated.View>
      )}

      {/* ══════════════════════════════════════════════════════
          FEED MODAL
      ══════════════════════════════════════════════════════ */}
      {showFeedModal && (
        <Animated.View style={[styles.modalWrap, { opacity: feedModalOpacity }]}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={closeFeedModal} activeOpacity={1} />
          <Animated.View style={[styles.feedModalSheet, { transform: [{ translateY: feedModalSlide }] }]}>
            <View style={styles.modalHandle} />
            <View style={styles.feedModalHeader}>
              <View style={styles.feedModalTabs}>
                {(['announcements', 'events'] as const).map(tab => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.feedModalTab, feedModalTab === tab && styles.feedModalTabActive]}
                    onPress={() => setFeedModalTab(tab)} activeOpacity={0.75}
                  >
                    <Ionicons name={tab === 'announcements' ? 'megaphone-outline' : 'calendar-outline'} size={13} color={feedModalTab === tab ? C.void : C.inkMid} />
                    <Text style={[styles.feedModalTabText, feedModalTab === tab && styles.feedModalTabTextActive]}>
                      {tab === 'announcements' ? 'Announcements' : 'Events'}
                    </Text>
                    <View style={[styles.feedModalTabCount, feedModalTab === tab && styles.feedModalTabCountActive]}>
                      <Text style={[styles.feedModalTabCountText, feedModalTab === tab && styles.feedModalTabCountTextActive]}>
                        {tab === 'announcements' ? announcements.length : events.length}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeFeedModal} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={C.inkMid} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={(feedModalTab === 'announcements' ? announcements : events) as any[]}
              keyExtractor={i => i.id}
              contentContainerStyle={styles.feedModalList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <FeedCard
                  item={item}
                  type={feedModalTab === 'announcements' ? 'announcement' : 'event'}
                  isInterested={interestedIds.includes(item.id)}
                  onToggleInterested={async () => {
                    const updated = await toggleInStringArray(STORAGE_KEYS.interestedEvents, item.id);
                    setInterestedIds(updated);
                  }}
                />
              )}
            />
          </Animated.View>
        </Animated.View>
      )}

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
                      <Text style={styles.mapInfoValue}>{getTotalRouteDistance()}</Text>
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
