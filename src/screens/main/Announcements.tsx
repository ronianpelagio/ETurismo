import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
  LayoutChangeEvent,
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
import type { Announcement } from '../../features/home/types';
import {
  formatDate,
  getTimeAgo,
} from '../../features/home/dateUtils';
import SmartImage from '../../features/home/SmartImage';

// ─── Constants ────────────────────────────────────────────────────────────────
const AMBER = '#A0640A';

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

// ─── Announcement Card ────────────────────────────────────────────────────────
function AnnouncementCard({ item, index = 0 }: { item: Announcement; index?: number }) {
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

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 70, gap: 10 }}>
      <View style={{
        width: 72, height: 72, borderRadius: 36, backgroundColor: `${AMBER}14`,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${AMBER}30`,
      }}>
        <Ionicons name="megaphone-outline" size={30} color={AMBER} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>No announcements yet</Text>
      <Text style={{ fontSize: 12.5, color: C.inkDim, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18 }}>
        Check back soon — new updates from the shrine will appear here.
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AnnouncementsScreen({
  setNavbarVisible,
}: {
  setNavbarVisible?: (visible: boolean) => void;
}) {
  const { theme } = useAppTheme();
  C = buildC(theme);
  const insets = useSafeAreaInsets();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastScrollY = useRef(0);
  const navbarVisibleRef = useRef(true);

  const fetchAnnouncements = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('announcements')
        .select('id, title, announcement_datetime, description, image_url, created_at')
        .order('announcement_datetime', { ascending: false });

      if (fetchError) throw fetchError;
      setAnnouncements(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();

    const channel = supabase
      .channel('announcements-screen-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchAnnouncements(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAnnouncements]);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }} edges={[]}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 14, borderBottomColor: C.border }]}>
        <View>
          <Text style={[styles.headerEyebrow, { color: AMBER }]}>STAY CONNECTED</Text>
          <Text style={[styles.headerTitle, { color: C.ink }]}>Announcements</Text>
        </View>
        {announcements.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: `${AMBER}18`, borderColor: `${AMBER}30` }]}>
            <Text style={[styles.countBadgeText, { color: AMBER }]}>{announcements.length}</Text>
          </View>
        )}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={AMBER} />
          <Text style={[styles.loadingText, { color: C.inkDim }]}>Loading announcements…</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <View style={[styles.errorIconWrap, { backgroundColor: `${AMBER}14`, borderColor: `${AMBER}30` }]}>
            <Ionicons name="cloud-offline-outline" size={28} color={AMBER} />
          </View>
          <Text style={[styles.errorTitle, { color: C.ink }]}>Couldn't load</Text>
          <Text style={[styles.errorBody, { color: C.inkDim }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: C.ink }]}
            onPress={() => fetchAnnouncements()}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh-outline" size={15} color="#fff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={i => i.id}
          contentContainerStyle={{
            padding: 16,
            gap: 14,
            paddingBottom: 90 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onRefresh={() => { setRefreshing(true); fetchAnnouncements(true); }}
          refreshing={refreshing}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item, index }) => (
            <AnnouncementCard item={item} index={index} />
          )}
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
