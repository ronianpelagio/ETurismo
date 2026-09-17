import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Image,
  Animated, ScrollView, ActivityIndicator, Modal, Dimensions,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase';
import { useAppTheme } from '../../context/ThemeContext';
import { THEMES } from '../../constants/themes';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';

const { width: W, height: H } = Dimensions.get('window');
const CARD_W = (W - 48 - 12) / 2; // 2-col grid with 24px side padding + 12px gap

// ─── Theme ────────────────────────────────────────────────────────────────────
function buildC(t: typeof THEMES[keyof typeof THEMES]) {
  return {
    bg: t.bg, surface: t.surface, ink: t.ink, inkMid: t.inkMid,
    inkLight: t.inkDim, gold: t.gold, goldSoft: t.goldSoft,
    goldGlow: t.goldGlow, border: t.border, borderGold: t.borderGold,
    error: t.crimson,
  };
}
let C = buildC(THEMES.light);

// ─── Types ────────────────────────────────────────────────────────────────────
type Artifact = {
  id: string; name: string; category: string;
  qr_code: string; qr_value: string; created_at: string;
  description?: string; image_url?: string; creator?: string; date?: string;
};
type ArtifactTranslation = {
  id: string; language_code: string; name: string;
  description: string | null; audio_url: string | null;
};
type AudioGuide = { id: string; artifact_id: string; audio_url: string; created_at: string };

const CATEGORY_IMAGES: Record<string, string> = {
  'Vestments':          'https://images.unsplash.com/photo-1582552938356-8b6b14c0e1ee?w=600',
  'Sacred Vessels':     'https://images.unsplash.com/photo-1602351447937-7457d2e0ffc3?w=600',
  'Devotional Objects': 'https://images.unsplash.com/photo-1566505237780-6bf6d4c1b84e?w=600',
  'Altar Furnishings':  'https://images.unsplash.com/photo-1601940462811-2c893df9477c?w=600',
  'Sacramentals':       'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=600',
};
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=600';

// ─── Artifact Detail Bottom-Sheet Modal ──────────────────────────────────────
function ArtifactModal({
  artifact, onClose, onNext,
}: { artifact: Artifact | null; onClose: () => void; onNext?: () => void }) {
  const slideAnim = useRef(new Animated.Value(H)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [translations, setTranslations] = useState<ArtifactTranslation[]>([]);
  const [audioGuides,  setAudioGuides]  = useState<AudioGuide[]>([]);
  const [loadingData,  setLoadingData]  = useState(false);
  const [playingUrl,   setPlayingUrl]   = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState('en');
  const playerRef = useRef<any>(null);
  const subRef    = useRef<any>(null);

  useEffect(() => {
    if (!artifact) return;
    setTranslations([]); setAudioGuides([]); setSelectedLang('en');
    loadData(artifact.id);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [artifact]);

  useEffect(() => () => { stopAudio(); }, []);

  async function loadData(id: string) {
    setLoadingData(true);
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'duckOthers' });
      const [{ data: t }, { data: g }] = await Promise.all([
        supabase.from('artifact_translations').select('id,language_code,name,description,audio_url').eq('artifact_id', id),
        supabase.from('audio_guides').select('id,artifact_id,audio_url,created_at').eq('artifact_id', id),
      ]);
      setTranslations(t || []);
      setAudioGuides(g || []);
      if (t && t.length > 0) setSelectedLang(t[0].language_code);
    } catch (_) {}
    finally { setLoadingData(false); }
  }

  async function playAudio(url: string) {
    await stopAudio();
    setPlayingUrl(url);
    const player = createAudioPlayer({ uri: url }) as any;
    playerRef.current = player;
    subRef.current = player.addListener('playbackStatusUpdate', (s: any) => {
      if (s.didJustFinish) { setPlayingUrl(null); subRef.current?.remove(); playerRef.current?.remove?.(); playerRef.current = null; }
    });
    player.play();
  }

  async function stopAudio() {
    try { if (playerRef.current) { await playerRef.current.pause(); subRef.current?.remove(); playerRef.current.remove?.(); playerRef.current = null; } }
    catch (_) {}
    setPlayingUrl(null);
  }

  const dismiss = () => {
    stopAudio();
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: H, duration: 320, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  if (!artifact) return null;

  const imgUrl = artifact.image_url ?? CATEGORY_IMAGES[artifact.category] ?? FALLBACK_IMG;
  const desc   = translations.find(t => t.language_code === selectedLang)?.description ?? artifact.description ?? 'No description available.';
  const audioUrl = translations.find(t => t.language_code === selectedLang)?.audio_url ?? audioGuides[0]?.audio_url ?? null;
  const langs  = translations.filter(t => t.description || t.audio_url);

  const LANG_LABELS: Record<string, string> = { en: 'English', fil: 'Filipino', ja: 'Japanese', es: 'Spanish', ko: 'Korean' };

  return (
    <Modal transparent animationType="none" visible={!!artifact} onRequestClose={dismiss} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,8,6,0.72)', opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={dismiss} activeOpacity={1} />
      </Animated.View>

      <Animated.View style={[ms.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={ms.handle} />

        {/* Hero */}
        <View style={ms.heroWrap}>
          <Image source={{ uri: imgUrl }} style={ms.heroImg} resizeMode="cover" />
          <View style={ms.heroScrim} />
          <View style={ms.catBadge}><Text style={ms.catBadgeText}>{artifact.category}</Text></View>
          <TouchableOpacity style={ms.closeX} onPress={dismiss} activeOpacity={0.8}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 36 }}>
          {/* Title */}
          <View style={ms.titleRow}>
            <View style={{ flex: 1 }}>
              <View style={ms.goldBar} />
              <Text style={ms.name}>{artifact.name}</Text>
              {(artifact.date || artifact.creator) && (
                <Text style={ms.meta}>
                  {[artifact.date, artifact.creator].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
          </View>

          {/* Language pills */}
          {langs.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ms.langBar} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
              {langs.map(t => (
                <TouchableOpacity
                  key={t.language_code}
                  style={[ms.langPill, selectedLang === t.language_code && ms.langPillActive]}
                  onPress={() => { setSelectedLang(t.language_code); stopAudio(); }}
                  activeOpacity={0.75}
                >
                  <Text style={[ms.langPillText, selectedLang === t.language_code && ms.langPillTextActive]}>
                    {LANG_LABELS[t.language_code] ?? t.language_code.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Description */}
          <View style={ms.body}>
            <Text style={ms.sectionLabel}>ABOUT THIS PIECE</Text>
            <Text style={ms.desc}>{loadingData ? 'Loading…' : desc}</Text>

            {/* Audio */}
            {(audioUrl || loadingData) && (
              <View style={ms.audioCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={[ms.playBtn, playingUrl === audioUrl && ms.playBtnActive]}>
                    <TouchableOpacity
                      onPress={() => playingUrl === audioUrl ? stopAudio() : audioUrl && playAudio(audioUrl)}
                      activeOpacity={0.85}
                      style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {loadingData
                        ? <ActivityIndicator size="small" color={C.gold} />
                        : <Ionicons name={playingUrl === audioUrl ? 'pause' : 'play'} size={20} color={playingUrl === audioUrl ? C.ink : '#fff'} />
                      }
                    </TouchableOpacity>
                  </View>
                  <View>
                    <Text style={ms.audioLabel}>Audio Guide</Text>
                    <Text style={ms.audioSub}>{LANG_LABELS[selectedLang] ?? selectedLang} narration</Text>
                  </View>
                </View>
                <Ionicons name="headset-outline" size={22} color={C.inkLight} />
              </View>
            )}

            {/* Buttons */}
            <View style={{ gap: 10, marginTop: 8 }}>
              {onNext && (
                <TouchableOpacity style={ms.nextBtn} onPress={() => { stopAudio(); onNext(); }} activeOpacity={0.85}>
                  <Ionicons name="arrow-forward-circle-outline" size={18} color="#fff" />
                  <Text style={ms.nextBtnText}>Next Artifact</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={ms.closeBtn} onPress={dismiss} activeOpacity={0.85}>
                <Text style={ms.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// Modal styles
const ms = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: '#F7F4EF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: H * 0.92, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.25, shadowOffset: { width: 0, height: -6 }, shadowRadius: 20, elevation: 24,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(26,22,18,0.15)', alignSelf: 'center', marginTop: 12, marginBottom: 0 },
  heroWrap: { width: '100%', height: 260, position: 'relative', backgroundColor: '#0E0C09' },
  heroImg:  { width: '100%', height: '100%' },
  heroScrim:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(10,8,5,0.5)' },
  catBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(10,8,5,0.75)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(201,168,76,0.4)' },
  catBadgeText: { fontSize: 11, fontWeight: '700', color: '#C9A84C' },
  closeX: { position: 'absolute', top: 12, right: 14, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(30,27,23,0.65)', alignItems: 'center', justifyContent: 'center' },
  titleRow: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
  goldBar:  { width: 32, height: 3, backgroundColor: '#C9A84C', borderRadius: 2, marginBottom: 10 },
  name:     { fontSize: 26, fontWeight: '900', color: '#1A1612', letterSpacing: -0.6, lineHeight: 32 },
  meta:     { fontSize: 13, color: '#A59C90', marginTop: 4, fontStyle: 'italic' },
  langBar:  { marginTop: 14, marginBottom: 2 },
  langPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 1.5, borderColor: 'rgba(201,168,76,0.25)' },
  langPillActive: { backgroundColor: 'rgba(201,168,76,0.15)', borderColor: '#C9A84C' },
  langPillText:       { fontSize: 12, fontWeight: '700', color: '#6E665B' },
  langPillTextActive: { color: '#C9A84C' },
  body:     { paddingHorizontal: 20, paddingTop: 18, gap: 14 },
  sectionLabel: { fontSize: 9, fontWeight: '800', color: '#C9A84C', letterSpacing: 2.5, marginBottom: 6 },
  desc:     { fontSize: 15, color: '#6E665B', lineHeight: 26 },
  audioCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(201,168,76,0.2)' },
  playBtn:  { width: 46, height: 46, borderRadius: 23, backgroundColor: '#1A1612', alignItems: 'center', justifyContent: 'center', marginRight: 2 },
  playBtnActive: { backgroundColor: '#C9A84C' },
  audioLabel: { fontSize: 14, fontWeight: '700', color: '#1A1612' },
  audioSub:   { fontSize: 11, color: '#A59C90', marginTop: 1 },
  nextBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1A1612', borderRadius: 50, paddingVertical: 15 },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  closeBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(26,22,18,0.15)' },
  closeBtnText: { fontSize: 15, fontWeight: '700', color: '#6E665B' },
});

// ─── Artifact Card (grid) ─────────────────────────────────────────────────────
function ArtifactCard({ artifact, scanned, onPress }: { artifact: Artifact; scanned: boolean; onPress: () => void }) {
  const imgUrl = artifact.image_url ?? CATEGORY_IMAGES[artifact.category] ?? FALLBACK_IMG;

  return (
    <TouchableOpacity
      style={[cs.card, !scanned && cs.cardLocked]}
      onPress={scanned ? onPress : undefined}
      activeOpacity={scanned ? 0.75 : 1}
    >
      {/* Image */}
      <View style={cs.imgWrap}>
        <Image source={{ uri: imgUrl }} style={[cs.img, !scanned && cs.imgGray]} resizeMode="cover" />
        {/* Gold shimmer on unlocked */}
        {scanned && <View style={cs.shimmer} />}
        {/* Lock overlay */}
        {!scanned && (
          <View style={cs.lockOverlay}>
            <View style={cs.lockCircle}>
              <Ionicons name="lock-closed" size={18} color="#fff" />
            </View>
          </View>
        )}
        {/* Scanned badge */}
        {scanned && (
          <View style={cs.scannedBadge}>
            <Ionicons name="checkmark-circle" size={13} color="#2ECC71" />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={cs.info}>
        <Text style={cs.cardName} numberOfLines={2}>{artifact.name}</Text>
        <Text style={cs.cardCat} numberOfLines={1}>{artifact.category}</Text>
        {scanned && (
          <View style={cs.viewRow}>
            <Text style={cs.viewTxt}>View</Text>
            <Ionicons name="chevron-forward" size={12} color="#C9A84C" />
          </View>
        )}
        {!scanned && <Text style={cs.lockedTxt}>Scan to unlock</Text>}
      </View>
    </TouchableOpacity>
  );
}

const cs = StyleSheet.create({
  card: {
    width: CARD_W, borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(26,22,18,0.08)',
    shadowColor: '#000', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3,
  },
  cardLocked: { opacity: 0.65 },
  imgWrap: { width: '100%', height: CARD_W, position: 'relative', backgroundColor: '#E8E2D8' },
  img:     { width: '100%', height: '100%' },
  imgGray: { opacity: 0.45 },
  shimmer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: '#C9A84C' },
  lockOverlay: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' } as any,
  lockCircle:  { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(10,8,5,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)' },
  scannedBadge:{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(10,8,5,0.65)', borderRadius: 50, padding: 3, borderWidth: 1, borderColor: 'rgba(46,204,113,0.4)' },
  info:    { padding: 12, gap: 3 },
  cardName:{ fontSize: 13, fontWeight: '700', color: '#1A1612', lineHeight: 18 },
  cardCat: { fontSize: 10, color: '#C9A84C', fontWeight: '600' },
  viewRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  viewTxt: { fontSize: 11, color: '#C9A84C', fontWeight: '700' },
  lockedTxt:{ fontSize: 10, color: '#A59C90', fontStyle: 'italic', marginTop: 4 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CATEGORIES = ['Sacred Vessels', 'Vestments', 'Altar Furnishings', 'Devotional Objects', 'Sacramentals'];

export default function CollectionPage({ onBack }: { onBack: () => void }) {
  const { theme } = useAppTheme();
  C = buildC(theme);

  const [allArtifacts,    setAllArtifacts]    = useState<Artifact[]>([]);
  const [scannedIds,      setScannedIds]      = useState<string[]>([]);
  const [activeCategory,  setActiveCategory]  = useState<string | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch from Supabase — if this returns empty, check RLS: artifacts table
      // must have a policy allowing `anon` or `authenticated` role to SELECT.
      const { data, error: err } = await supabase
        .from('artifacts')
        .select('id,name,category,qr_code,qr_value,created_at,description,image_url,creator,date')
        .order('name', { ascending: true });

      if (err) throw err;
      setAllArtifacts(data ?? []);

      const raw = await AsyncStorage.getItem('scannedArtifacts').catch(() => null);
      if (raw) {
        try { setScannedIds(JSON.parse(raw).map((a: Artifact) => a.id)); } catch (_) {}
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const displayed = activeCategory
    ? allArtifacts.filter(a => a.category === activeCategory)
    : allArtifacts;

  const scannedCount = scannedIds.length;
  const totalCount   = allArtifacts.length;

  const goNext = () => {
    if (!selectedArtifact) return;
    const idx  = displayed.findIndex(a => a.id === selectedArtifact.id);
    const next = displayed[idx + 1];
    if (next) setSelectedArtifact(next);
  };
  const hasNext = selectedArtifact
    ? displayed.findIndex(a => a.id === selectedArtifact.id) < displayed.length - 1
    : false;

  const bg = theme.bg;

  // ── Loading ──
  if (loading) return (
    <SafeAreaView style={[st.root, { backgroundColor: bg }]}>
      <View style={st.loadingWrap}>
        <ActivityIndicator size="large" color="#C9A84C" />
        <Text style={st.loadingTxt}>Loading collection…</Text>
      </View>
    </SafeAreaView>
  );

  // ── Error ──
  if (error) return (
    <SafeAreaView style={[st.root, { backgroundColor: bg }]}>
      <TouchableOpacity style={st.backRow} onPress={onBack} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={22} color={C.ink} />
        <Text style={[st.backTxt, { color: C.ink }]}>Back</Text>
      </TouchableOpacity>
      <View style={st.loadingWrap}>
        <Ionicons name="cloud-offline-outline" size={52} color="#C9A84C" style={{ marginBottom: 16 }} />
        <Text style={[st.errorTitle, { color: C.ink }]}>Could not load artifacts</Text>
        <Text style={[st.errorSub, { color: C.inkMid }]}>{error}</Text>
        <TouchableOpacity style={st.retryBtn} onPress={fetchData} activeOpacity={0.85}>
          <Text style={st.retryBtnTxt}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={[st.root, { backgroundColor: bg }]} edges={['top']}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={[st.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity style={st.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[st.eyebrow, { color: C.gold }]}>SACRED HERITAGE</Text>
          <Text style={[st.pageTitle, { color: C.ink }]}>Collection</Text>
        </View>
        {/* Progress pill */}
        <View style={[st.progressPill, { backgroundColor: C.goldSoft, borderColor: C.borderGold }]}>
          <Text style={[st.progressTxt, { color: C.ink }]}>{scannedCount}</Text>
          <Text style={[st.progressOf, { color: C.inkMid }]}>/{totalCount}</Text>
        </View>
      </View>

      {/* Progress bar */}
      {totalCount > 0 && (
        <View style={[st.progressBarTrack, { backgroundColor: C.border }]}>
          <View style={[st.progressBarFill, { backgroundColor: C.gold, width: `${Math.min((scannedCount / totalCount) * 100, 100)}%` as any }]} />
        </View>
      )}

      {/* ── Category filter ── */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={[st.filterBar, { borderBottomColor: C.border }]}
        contentContainerStyle={st.filterContent}
      >
        {[null, ...CATEGORIES].map(cat => {
          const active = activeCategory === cat;
          return (
            <TouchableOpacity
              key={cat ?? '__all__'}
              style={[st.filterPill, { borderColor: active ? C.gold : C.border, backgroundColor: active ? C.gold : C.surface }]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.75}
            >
              <Text style={[st.filterPillTxt, { color: active ? '#fff' : C.inkMid }]}>
                {cat ?? 'All'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Grid ── */}
      {displayed.length === 0 ? (
        <View style={st.emptyWrap}>
          <Ionicons name="archive-outline" size={52} color={C.inkLight} />
          <Text style={[st.emptyTxt, { color: C.inkMid }]}>No artifacts in this category</Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={a => a.id}
          numColumns={2}
          columnWrapperStyle={st.row}
          contentContainerStyle={st.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ArtifactCard
              artifact={item}
              scanned={scannedIds.includes(item.id)}
              onPress={() => setSelectedArtifact(item)}
            />
          )}
        />
      )}

      {/* ── Modal ── */}
      <ArtifactModal
        artifact={selectedArtifact}
        onClose={() => setSelectedArtifact(null)}
        onNext={hasNext ? goNext : undefined}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root:        { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingTxt:  { marginTop: 12, fontSize: 14, color: '#6E665B' },
  errorTitle:  { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  errorSub:    { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  retryBtn:    { backgroundColor: '#1A1612', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 50 },
  retryBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  backRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 16 },
  backTxt:     { fontSize: 15, fontWeight: '600' },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  backBtn:     { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  eyebrow:     { fontSize: 9, fontWeight: '800', letterSpacing: 2.5, marginBottom: 2 },
  pageTitle:   { fontSize: 26, fontWeight: '900', letterSpacing: -0.6 },
  progressPill:{ flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50, borderWidth: 1 },
  progressTxt: { fontSize: 16, fontWeight: '900' },
  progressOf:  { fontSize: 12, fontWeight: '600' },

  progressBarTrack: { height: 3, marginHorizontal: 0 },
  progressBarFill:  { height: '100%' as any },

  filterBar:     { borderBottomWidth: 1, flexGrow: 0, flexShrink: 0 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterPill:    { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 50, borderWidth: 1.5 },
  filterPillTxt: { fontSize: 13, fontWeight: '700' },

  grid:    { padding: 16, gap: 12 },
  row:     { gap: 12 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTxt:  { marginTop: 14, fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
