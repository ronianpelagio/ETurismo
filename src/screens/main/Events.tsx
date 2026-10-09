import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../services/supabase';
import { useAppTheme } from '../../context/ThemeContext';
import { buildC } from '../../features/home/styles';
import { THEMES } from '../../constants/themes';
import { STORAGE_KEYS, toggleInStringArray, getStringArray } from '../../utils/storage';
import { useAuthStore } from '../../store/useAuthStore';
import type { Event } from '../../features/home/types';
import {
  formatEventTime,
  getEventCountdown,
} from '../../features/home/dateUtils';

// ─── Constants ────────────────────────────────────────────────────────────────
const TEAL = '#085041';

let C = buildC(THEMES.light);

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function ExpandableText({ text, lines = 3, color }: { text: string; lines?: number; color: string }) {
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  return (
    <View>
      <Text
        style={{ fontSize: 13.5, lineHeight: 21, color: C.inkMid, textAlign: 'justify' }}
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

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({
  item, isInterested, onToggleInterested, index = 0,
}: { item: Event; isInterested?: boolean; onToggleInterested?: () => void; index?: number }) {
  const anim = useEntrance(index);
  const date = new Date(item.event_datetime);
  const countdown = getEventCountdown(item.event_datetime);
  const isPast = !countdown && date.getTime() < Date.now();
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate().toString().padStart(2, '0');
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const heartScale = useRef(new Animated.Value(1)).current;

  // Optimistic local count — starts from what the server returned
  const [localCount, setLocalCount] = useState(item.interested_count ?? 0);
  useEffect(() => {
    setLocalCount(item.interested_count ?? 0);
  }, [item.interested_count]);

  const pressInterested = () => {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.25, useNativeDriver: true, tension: 300, friction: 8 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 8 }),
    ]).start();
    // Optimistic UI update
    setLocalCount(prev => isInterested ? Math.max(prev - 1, 0) : prev + 1);
    onToggleInterested?.();
  };

  const countLabel = localCount > 0
    ? localCount === 1 ? '1 interested' : `${localCount} interested`
    : null;

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
            minHeight: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
            backgroundColor: isInterested ? 'rgba(8,80,65,0.1)' : TEAL,
            borderWidth: 1.5, borderColor: TEAL,
            paddingVertical: 10, paddingHorizontal: 16,
          }}
          accessibilityRole="button"
          accessibilityLabel={isInterested ? "Remove interest in event" : "Mark interest in event"}
          accessibilityState={{ selected: isInterested }}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons name={isInterested ? 'heart' : 'heart-outline'} size={19} color={isInterested ? '#E74C3C' : '#fff'} />
          </Animated.View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: isInterested ? TEAL : '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 }}>
              {isInterested ? "You're Interested" : "I'm Interested"}
            </Text>
            {countLabel && (
              <Text style={{ color: isInterested ? `${TEAL}99` : 'rgba(255,255,255,0.7)', fontSize: 10.5, fontWeight: '700', marginTop: 1 }}>
                {countLabel}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 70, gap: 10 }}>
      <View style={{
        width: 72, height: 72, borderRadius: 36, backgroundColor: `${TEAL}14`,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${TEAL}30`,
      }}>
        <Ionicons name="calendar-outline" size={30} color={TEAL} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>No events scheduled</Text>
      <Text style={{ fontSize: 12.5, color: C.inkDim, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18 }}>
        Check back soon — upcoming museum events will appear here.
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EventsScreen({
  setNavbarVisible,
}: {
  setNavbarVisible?: (visible: boolean) => void;
}) {
  const { theme } = useAppTheme();
  C = buildC(theme);
  const insets = useSafeAreaInsets();
  const { session } = useAuthStore();
  const userId = session?.user?.id ?? null;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interestedIds, setInterestedIds] = useState<string[]>([]);

  const lastScrollY = useRef(0);
  const navbarVisibleRef = useRef(true);

  // Load interested event IDs — from Supabase if logged in, AsyncStorage otherwise
  const loadInterestedIds = useCallback(async () => {
    if (userId) {
      const { data } = await supabase
        .from('event_interests')
        .select('event_id')
        .eq('user_id', userId);
      setInterestedIds((data ?? []).map((r: { event_id: string }) => r.event_id));
    } else {
      const ids = await getStringArray(STORAGE_KEYS.interestedEvents);
      setInterestedIds(ids);
    }
  }, [userId]);

  // Load interested IDs whenever auth state changes
  useEffect(() => {
    loadInterestedIds();
  }, [loadInterestedIds]);

  const fetchEvents = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('id, title, event_datetime, description, image_url, created_at, interested_count')
        .order('event_datetime', { ascending: false });

      if (fetchError) throw fetchError;
      setEvents(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();

    const channel = supabase
      .channel('events-screen-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchEvents(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchEvents]);

  // Toggle interest — Supabase for logged-in users, local storage for guests
  const handleToggleInterested = useCallback(async (eventId: string) => {
    const isCurrentlyInterested = interestedIds.includes(eventId);

    if (userId) {
      if (isCurrentlyInterested) {
        await supabase
          .from('event_interests')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', userId);
        setInterestedIds(prev => prev.filter(id => id !== eventId));
      } else {
        await supabase
          .from('event_interests')
          .insert({ event_id: eventId, user_id: userId });
        setInterestedIds(prev => [...prev, eventId]);
      }
      // Refresh counts from DB after toggling
      fetchEvents(true);
    } else {
      // Guest — persist to AsyncStorage only (no count tracked)
      const updated = await toggleInStringArray(STORAGE_KEYS.interestedEvents, eventId);
      setInterestedIds(updated);
    }
  }, [userId, interestedIds, fetchEvents]);

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

  // Split upcoming and past events
  const upcoming = events.filter(e => {
    const countdown = getEventCountdown(e.event_datetime);
    return countdown !== null || new Date(e.event_datetime).getTime() >= Date.now();
  });
  const past = events.filter(e => {
    const countdown = getEventCountdown(e.event_datetime);
    return !countdown && new Date(e.event_datetime).getTime() < Date.now();
  });

  const renderItem = ({ item, index }: { item: Event; index: number }) => (
    <EventCard
      item={item}
      index={index}
      isInterested={interestedIds.includes(item.id)}
      onToggleInterested={() => handleToggleInterested(item.id)}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }} edges={[]}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 14, borderBottomColor: C.border }]}>
        <View>
          <Text style={[styles.headerEyebrow, { color: TEAL }]}>STAY CONNECTED</Text>
          <Text style={[styles.headerTitle, { color: C.ink }]}>Events</Text>
        </View>
        {events.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: `${TEAL}18`, borderColor: `${TEAL}30` }]}>
            <Text style={[styles.countBadgeText, { color: TEAL }]}>{events.length}</Text>
          </View>
        )}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={[styles.loadingText, { color: C.inkDim }]}>Loading events…</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <View style={[styles.errorIconWrap, { backgroundColor: `${TEAL}14`, borderColor: `${TEAL}30` }]}>
            <Ionicons name="cloud-offline-outline" size={28} color={TEAL} />
          </View>
          <Text style={[styles.errorTitle, { color: C.ink }]}>Couldn't load</Text>
          <Text style={[styles.errorBody, { color: C.inkDim }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: C.ink }]}
            onPress={() => fetchEvents()}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh-outline" size={15} color="#fff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={i => i.id}
          contentContainerStyle={{
            padding: 16,
            gap: 14,
            paddingBottom: 90 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onRefresh={() => { setRefreshing(true); fetchEvents(true); }}
          refreshing={refreshing}
          ListEmptyComponent={<EmptyState />}
          ListHeaderComponent={
            upcoming.length > 0 && past.length > 0 ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
              }}>
                <Ionicons name="time-outline" size={12} color={TEAL} />
                <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2, color: TEAL }}>
                  UPCOMING · {upcoming.length}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            // Insert a "Past Events" separator before the first past event
            const isPastItem = !getEventCountdown(item.event_datetime) && new Date(item.event_datetime).getTime() < Date.now();
            const prevItem = index > 0 ? events[index - 1] : null;
            const prevIsPast = prevItem
              ? (!getEventCountdown(prevItem.event_datetime) && new Date(prevItem.event_datetime).getTime() < Date.now())
              : true;

            return (
              <View>
                {isPastItem && !prevIsPast && (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    marginBottom: 8, marginTop: 6,
                  }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
                    <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2, color: C.inkDim }}>
                      PAST EVENTS
                    </Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
                  </View>
                )}
                {renderItem({ item, index })}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerEyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  countBadge: {
    minWidth: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 4,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  errorBody: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 50,
    marginTop: 4,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
