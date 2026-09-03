import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Alert, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../../context/ThemeContext';
import { useAppContext } from '../../context/AppContext';
import { THEMES } from '../../constants/themes';
import { getVisitHistory, clearVisitHistory, VisitEntry } from '../../utils/storage';

function buildC(t: typeof THEMES.light) {
  return {
    bg: t.bg, surface: t.surface, raised: t.raised,
    ink: t.ink, inkMid: t.inkMid, inkDim: t.inkDim,
    gold: t.gold, goldSoft: t.goldSoft, borderGold: t.borderGold,
    border: t.border, crimson: t.crimson, teal: t.teal,
    deep: t.deep,
  };
}

function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins   = Math.floor(diffMs / 60000);
  const hours  = Math.floor(mins / 60);
  const days   = Math.floor(hours / 24);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFullDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

// Group entries by calendar day
function groupByDay(entries: VisitEntry[]): { label: string; items: VisitEntry[] }[] {
  const map = new Map<string, VisitEntry[]>();
  for (const entry of entries) {
    const d = new Date(entry.visitedAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let label: string;
    if (d.toDateString() === today.toDateString()) {
      label = 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday';
    } else {
      label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(entry);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

export default function VisitHistory({ navigation }: any) {
  const { theme } = useAppTheme();
  const C = buildC(theme);
  const { fontScale } = useAppContext();

  const [history, setHistory] = useState<VisitEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const entries = await getVisitHistory();
    setHistory(entries);
    setLoading(false);
  };

  // Reload every time screen is focused
  useFocusEffect(useCallback(() => { load(); }, []));

  const handleClear = () => {
    Alert.alert(
      'Clear Visit History',
      'This will permanently remove all your visit records. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearVisitHistory();
            setHistory([]);
          },
        },
      ]
    );
  };

  const s = StyleSheet.create({
    safe:      { flex: 1, backgroundColor: C.bg },
    header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
    backBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
    pageTitle: { fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
    heroContent:    { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 28 },
    heroEyebrow:    { fontSize: 9, letterSpacing: 4, color: C.gold, fontWeight: '700', marginBottom: 8 },
    heroTitle:      { fontSize: 32, fontWeight: '900', color: C.ink, letterSpacing: -1.2, lineHeight: 36 },
    statsRow:       { flexDirection: 'row', gap: 10, marginTop: 14 },
    statPill:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.borderGold, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50 },
    statPillText:   { fontSize: 11, fontWeight: '700', color: C.gold },
    dayLabel:       { fontSize: 10, fontWeight: '800', color: C.gold, letterSpacing: 2, marginTop: 22, marginBottom: 10, paddingHorizontal: 20 },
    card:           { marginHorizontal: 20, marginBottom: 10, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, overflow: 'hidden', flexDirection: 'row' },
    cardImage:      { width: 80, height: 80 },
    cardImagePlaceholder: { width: 80, height: 80, backgroundColor: C.deep, alignItems: 'center', justifyContent: 'center' },
    cardBody:       { flex: 1, padding: 12, gap: 3 },
    cardCatPill:    { alignSelf: 'flex-start', backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.borderGold, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    cardCatText:    { fontSize: 8, fontWeight: '800', color: C.gold, letterSpacing: 1 },
    cardName:       { fontSize: 13, fontWeight: '700', color: C.ink, lineHeight: 18 },
    cardTime:       { fontSize: 10, color: C.inkDim, marginTop: 2 },
    cardTimeIcon:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
    emptyWrap:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 60, gap: 12 },
    emptyIcon:      { width: 72, height: 72, borderRadius: 36, backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.borderGold, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    emptyTitle:     { fontSize: 18, fontWeight: '800', color: C.ink, textAlign: 'center' },
    emptySub:       { fontSize: 13, color: C.inkDim, textAlign: 'center', lineHeight: 20 },
    clearBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(231,76,60,0.08)', borderWidth: 1, borderColor: 'rgba(231,76,60,0.25)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50 },
    clearBtnText:   { fontSize: 12, fontWeight: '700', color: C.crimson },
  });

  const groups = groupByDay(history);

  const uniqueCategories = new Set(history.map(e => e.category)).size;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>

        {/* ── Hero header ── */}
        <ImageBackground
          source={require('../../assets/Signin.jpg')}
          style={{ paddingBottom: 8 }}
          imageStyle={{ opacity: 0.1, resizeMode: 'cover' }}
        >
          <LinearGradient
            colors={['rgba(255,252,248,0.95)', 'rgba(255,252,248,0.85)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={C.ink} />
            </TouchableOpacity>
            <Text style={s.pageTitle}>Visit History</Text>
            {history.length > 0 ? (
              <TouchableOpacity onPress={handleClear} style={s.clearBtn} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={14} color={C.crimson} />
                <Text style={s.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 60 }} />
            )}
          </View>
          <View style={s.heroContent}>
            <Text style={s.heroEyebrow}>ACTIVITY</Text>
            <Text style={[s.heroTitle, { fontSize: 32 * fontScale }]}>Your{'\n'}Visits</Text>
            {history.length > 0 && (
              <View style={s.statsRow}>
                <View style={s.statPill}>
                  <Ionicons name="footsteps-outline" size={12} color={C.gold} />
                  <Text style={s.statPillText}>{history.length} artifact{history.length !== 1 ? 's' : ''} visited</Text>
                </View>
                <View style={s.statPill}>
                  <Ionicons name="grid-outline" size={12} color={C.gold} />
                  <Text style={s.statPillText}>{uniqueCategories} categor{uniqueCategories !== 1 ? 'ies' : 'y'}</Text>
                </View>
              </View>
            )}
          </View>
        </ImageBackground>

        {/* ── Content ── */}
        {loading ? (
          <View style={s.emptyWrap}>
            <Text style={{ color: C.inkDim, fontSize: 13 }}>Loading…</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Ionicons name="time-outline" size={34} color={C.gold} />
            </View>
            <Text style={s.emptyTitle}>No visits yet</Text>
            <Text style={s.emptySub}>
              Open any artifact from the Home screen or QR Scanner — your visits will appear here.
            </Text>
          </View>
        ) : (
          groups.map(group => (
            <View key={group.label}>
              <Text style={s.dayLabel}>{group.label.toUpperCase()}</Text>
              {group.items.map((entry, idx) => (
                <View key={`${entry.artifactId}-${idx}`} style={s.card}>
                  {entry.image_url ? (
                    <Image source={{ uri: entry.image_url }} style={s.cardImage} resizeMode="cover" />
                  ) : (
                    <View style={s.cardImagePlaceholder}>
                      <Ionicons name="image-outline" size={24} color={C.inkDim} />
                    </View>
                  )}
                  <View style={s.cardBody}>
                    <View style={s.cardCatPill}>
                      <Text style={s.cardCatText}>{entry.category.split(' ')[0].toUpperCase()}</Text>
                    </View>
                    <Text style={[s.cardName, { fontSize: 13 * fontScale }]} numberOfLines={2}>
                      {entry.artifactName}
                    </Text>
                    <View style={s.cardTimeIcon}>
                      <Ionicons name="time-outline" size={11} color={C.inkDim} />
                      <Text style={s.cardTime}>{formatRelativeTime(entry.visitedAt)}</Text>
                      <Text style={{ fontSize: 10, color: C.inkDim, opacity: 0.5 }}>·</Text>
                      <Text style={s.cardTime}>{formatFullDate(entry.visitedAt)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
