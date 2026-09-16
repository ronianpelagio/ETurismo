import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Modal, ScrollView, Image,
  Dimensions, Platform, FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase';
import { STORAGE_KEYS, toggleInStringArray, getStringArray } from '../../utils/storage';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguage } from '../../context/LanguageContext';
import PostTourFeedback from './PostTourFeedback';
import { THEMES } from '../../constants/themes';
import { useAudioWordHighlight } from '../../hooks/useAudioWordHighlight';
import HighlightedText from '../../components/HighlightedText';
import type { Artifact, ArtifactTranslation } from '../../features/artifacts/types';
import { ARTIFACT_CATEGORY_IMAGES } from '../../features/artifacts/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── SACRED HERITAGE THEME TOKENS ──────────────────────────────────────────────
function buildC(t: typeof THEMES[keyof typeof THEMES]) {
  return {
    bg: t.bg, surface: t.surface,
    ink: t.ink, inkMid: t.inkMid, inkLight: t.inkDim,
    gold: t.gold, goldWarm: t.goldBright, goldSoft: t.goldSoft,
    goldLight: t.goldGlow,
    border: t.border, borderGold: t.borderGold,
    error: t.crimson, success: t.teal,
    overlay: 'rgba(30,27,23,0.75)',
    vignette: 'rgba(30,27,23,0.35)',
  };
}
let C = buildC(THEMES.light);
let sf = getSfStyles(C);
let ams = getAmsStyles(C);
function getStyles(C: ReturnType<typeof buildC>) { return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
    padding: 32,
  },

  // ── Header with Collection Icon ──
  headerSafe: {
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 9.5,
    letterSpacing: 3.5,
    color: C.gold,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.8,
  },
  goldLine: {
    width: 40,
    height: 3,
    backgroundColor: C.gold,
    borderRadius: 2,
    marginTop: 8,
  },
  
  // Collection Icon Button
  collectionIconBtn: {
    marginTop: 4,
  },
  collectionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderGold,
    position: 'relative',
  },
  collectionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.gold,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: C.bg,
  },
  collectionBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.ink,
  },
  tourProgressPill: {
    marginTop: 4,
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: C.goldSoft,
    borderWidth: 1,
    borderColor: C.borderGold,
  },
  tourProgressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tourProgressText: {
    color: C.ink,
    fontSize: 11,
    fontWeight: '800',
  },
  tourProgressTrack: {
    height: 3,
    marginTop: 7,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: C.border,
  },
  tourProgressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: C.gold,
  },

  // ── Camera Container ──
  cameraContainer: {
    height: SCREEN_HEIGHT * 0.45,
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: C.ink,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 8,
  },
  cameraWrap: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '20%',
    backgroundColor: C.vignette,
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '20%',
    backgroundColor: C.vignette,
  },
  vignetteLeft: {
    position: 'absolute',
    top: '20%',
    left: 0,
    width: '12%',
    height: '60%',
    backgroundColor: C.vignette,
  },
  vignetteRight: {
    position: 'absolute',
    top: '20%',
    right: 0,
    width: '12%',
    height: '60%',
    backgroundColor: C.vignette,
  },
  frameContainer: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanHintOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanHintText: {
    backgroundColor: 'rgba(30,27,23,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 12,
    color: C.gold,
    fontWeight: '600',
    letterSpacing: 0.5,
    borderWidth: 1,
    borderColor: C.borderGold,
  },

  // ── Torch Button ──
  torchBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30,27,23,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderGold,
  },
  torchBtnActive: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },

  // ── Toast ──
  toast: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.ink,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 50,
    shadowColor: C.ink,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
  },
  toastText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Post-Scan View ──
  postScanBg: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ── Camera Inactive ──
  cameraInactive: {
    flex: 1,
    backgroundColor: '#0E0C09',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 32,
  },
  cameraInactiveTitle: {
    color: C.gold,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cameraInactiveSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 18,
  },

  // ── Status Area ──
  statusSafe: {
    backgroundColor: C.bg,
  },
  statusArea: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    minHeight: 100,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusTxt: {
    fontSize: 14,
    color: C.inkMid,
    fontWeight: '500',
  },

  // ── Error ──
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.goldSoft,
    borderWidth: 1.5,
    borderColor: C.borderGold,
    borderRadius: 16,
    padding: 14,
  },
  errorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconTxt: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.error,
    marginBottom: 2,
  },
  errorSub: {
    fontSize: 12,
    color: C.inkMid,
  },
  errorAutoReset: {
    fontSize: 11,
    color: C.inkLight,
    fontStyle: 'italic',
    marginTop: 2,
  },
  retryBtn: {
    backgroundColor: C.ink,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryBtnTxt: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '700',
  },

  // ── Hint ──
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  hintIco: {
    fontSize: 18,
    color: C.gold,
    marginTop: 1,
  },
  hintTxt: {
    flex: 1,
    fontSize: 14,
    color: C.inkMid,
    lineHeight: 22,
  },

  // ── Permission Screen ──
  permIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.borderGold,
  },
  permTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  permSub: {
    fontSize: 15,
    color: C.inkMid,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permBtn: {
    backgroundColor: C.ink,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
  },
  permBtnTxt: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
}

let styles = getStyles(C);

// ─── Corner Frame (with gold accent) ────────────────────────────────────────────
function ScanFrame({ pulse }: { pulse: Animated.Value }) {
  const corners = [
    { top: 0,    left: 0,    borderTopWidth: 2.5,    borderLeftWidth: 2.5  },
    { top: 0,    right: 0,   borderTopWidth: 2.5,    borderRightWidth: 2.5 },
    { bottom: 0, left: 0,    borderBottomWidth: 2.5, borderLeftWidth: 2.5  },
    { bottom: 0, right: 0,   borderBottomWidth: 2.5, borderRightWidth: 2.5 },
  ];

  const borderColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [C.gold, '#FFFFFF'],
  });

  return (
    <View style={sf.frame}>
      {corners.map((corner, i) => (
        <Animated.View key={i} style={[sf.corner, corner, { borderColor }]} />
      ))}
      <Animated.View
        style={[sf.scanLine, {
          opacity: pulse.interpolate({ inputRange: [0, 40/180, 45/180, 1], outputRange: [0, 0, 0.9, 0.9] }),
          transform: [{
            translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 220] }),
          }],
        }]}
      />
    </View>
  );
}

function getSfStyles(C: ReturnType<typeof buildC>) { return StyleSheet.create({
  frame:    { width: 240, height: 240, position: 'relative' },
  corner:   { position: 'absolute', width: 28, height: 28, borderColor: C.gold },
  scanLine: {
    position: 'absolute', left: 10, right: 10, height: 2,
    backgroundColor: C.gold, borderRadius: 1,
  },
});
}

// ─── Audio-Guide Waveform Animation ─────────────────────────────────────────────
function AudioWaveform({ isPlaying, color = '#C9A84C' }: { isPlaying: boolean; color?: string }) {
  const bars = [useRef(new Animated.Value(0.35)).current, useRef(new Animated.Value(0.6)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.8)).current, useRef(new Animated.Value(0.45)).current];
  useEffect(() => {
    if (!isPlaying) { bars.forEach(b => Animated.spring(b, { toValue: 0.3, useNativeDriver: true }).start()); return; }
    const anims = bars.map((bar, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 70),
        Animated.timing(bar, { toValue: 1,    duration: 280 + i * 55, useNativeDriver: true }),
        Animated.timing(bar, { toValue: 0.22, duration: 280 + i * 55, useNativeDriver: true }),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [isPlaying]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 22 }}>
      {bars.map((b, i) => (
        <Animated.View key={i} style={{ width: 3, borderRadius: 2, backgroundColor: color, transform: [{ scaleY: b }], height: 18 }} />
      ))}
    </View>
  );
}

// ─── Artifact Detail Modal (Redesigned with Audio Guide + Word Highlighting) ────
function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}


// ─── Artifact Detail Tabs ────────────────────────────────────────────────────
type ArtifactDetailTab = 'Overview' | 'History' | 'Significance' | 'Fun Facts';
const ARTIFACT_DETAIL_TABS: ArtifactDetailTab[] = ['Overview', 'History', 'Significance', 'Fun Facts'];

function ArtifactModal({
  artifact, onClose,
}: { artifact: Artifact | null; onClose: (scanAgain?: boolean) => void }) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const { language: appLanguage } = useLanguage();

  const [activeTab, setActiveTab]           = useState<ArtifactDetailTab>('Overview');
  const [playingLang, setPlayingLang]       = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(appLanguage);
  const [translations, setTranslations]     = useState<ArtifactTranslation[]>([]);
  const [isFavorite, setIsFavorite]         = useState(false);
  const [audioDuration, setAudioDuration]   = useState<number>(60);
  const [playbackRate, setPlaybackRate]     = useState<number>(1);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const playerRef = useRef<any>(null);
  const playbackSubscriptionRef = useRef<any>(null);

  const langMeta: Record<string, string> = {
    en: 'English', fil: 'Filipino', ja: 'Japanese', es: 'Spanish', ko: 'Korean',
  };

  useEffect(() => { setSelectedLanguage(appLanguage); }, [appLanguage]);

  function getTabContent(tab: ArtifactDetailTab): string {
    const t = translations.find(t => t.language_code === selectedLanguage);
    switch (tab) {
      case 'Overview':     return t?.description || artifact?.description || 'No description available.';
      case 'History':      return artifact?.Historical_Significance || 'Historical information is not yet available for this artifact.';
      case 'Significance': return artifact?.Historical_Significance || 'Significance information is not yet available for this artifact.';
      case 'Fun Facts':    return 'Fun facts are not yet available for this artifact.';
    }
  }

  const currentDesc = getTabContent('Overview');

  const { words, highlightedIndex, currentTime, startHighlight, stopHighlight, resetHighlight } =
    useAudioWordHighlight({ text: currentDesc, durationSeconds: audioDuration });

  useEffect(() => {
    if (artifact) {
      setActiveTab('Overview');
      setupAudioModal();
      checkFavorite();
      fetchTranslations(artifact.id);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [artifact]);

  useEffect(() => { resetHighlight(); }, [selectedLanguage]);
  useEffect(() => { return () => { stopAudio(); }; }, []);

  async function setupAudioModal() {
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'duckOthers' });
    } catch (e: any) { console.error('Audio mode:', e.message); }
  }

  async function fetchTranslations(artifactId: string) {
    try {
      const { data, error } = await supabase
        .from('artifact_translations')
        .select('language_code, name, description, audio_url')
        .eq('artifact_id', artifactId);
      if (error) throw error;
      setTranslations(data || []);
      if (data && data.length > 0) {
        const hasAppLang = data.find(t => t.language_code === appLanguage);
        const hasEn      = data.find(t => t.language_code === 'en');
        setSelectedLanguage(hasAppLang ? appLanguage : hasEn ? 'en' : data[0].language_code);
      }
    } catch (e: any) { console.error('Translations fetch:', e.message); setTranslations([]); }
  }

  async function checkFavorite() {
    if (!artifact) return;
    const favorites = await getStringArray(STORAGE_KEYS.favoriteArtifacts);
    setIsFavorite(favorites.includes(artifact.id));
  }

  async function toggleFavorite() {
    if (!artifact) return;
    const updated = await toggleInStringArray(STORAGE_KEYS.favoriteArtifacts, artifact.id);
    setIsFavorite(updated.includes(artifact.id));
  }

  async function playAudio(audioUrl: string, lang: string) {
    try {
      await stopAudio();
      setPlayingLang(lang);
      setPlaybackRate(1);
      const player = createAudioPlayer({ uri: audioUrl }) as any;
      playerRef.current = player;
      const sub = player.addListener('playbackStatusUpdate', (status: any) => {
        const dur: number =
          typeof player.duration === 'number' && player.duration > 0 ? player.duration
          : status.durationMillis && status.durationMillis > 0 ? status.durationMillis / 1000
          : 0;
        if (dur > 0) setAudioDuration(dur);
        if (status.didJustFinish) {
          setPlayingLang(null); stopHighlight();
          sub.remove(); playerRef.current?.remove?.(); playerRef.current = null;
        }
      });
      playbackSubscriptionRef.current = sub;
      player.play();
      startHighlight(player);
    } catch (e: any) { console.error('Playback error:', e.message); setPlayingLang(null); resetHighlight(); }
  }

  async function stopAudio() {
    try {
      if (playerRef.current) {
        await playerRef.current.pause();
        playbackSubscriptionRef.current?.remove();
        playbackSubscriptionRef.current = null;
        playerRef.current.remove?.();
        playerRef.current = null;
      }
    } catch (e: any) { console.error('Stop audio:', e.message); }
    setPlayingLang(null); stopHighlight();
  }

  function handleSeek(s: number) { try { playerRef.current?.seekTo(s); } catch (_) {} }
  function handleRateChange(r: number) { try { playerRef.current?.setPlaybackRate(r); setPlaybackRate(r); } catch (_) {} }
  function handleSkip(d: number) { handleSeek(Math.max(0, Math.min(currentTime + d, audioDuration - 0.5))); }

  const dismiss = (scanAgain = false) => {
    stopAudio(); resetHighlight(); setLangDropdownOpen(false);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 350, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => { setSelectedLanguage(appLanguage); setTranslations([]); onClose(scanAgain); });
  };

  if (!artifact) return null;

  const imgUrl = artifact.image_url ?? ARTIFACT_CATEGORY_IMAGES[artifact.category] ?? 'https://via.placeholder.com/600?text=Artifact';
  const availableLangs     = translations.filter(t => t.description || t.audio_url);
  const currentLangAudio   = translations.find(t => t.language_code === selectedLanguage && t.audio_url);
  const isCurrentlyPlaying = playingLang === selectedLanguage;
  const selectedLangLabel  = langMeta[selectedLanguage] ?? selectedLanguage.toUpperCase();

  return (
    <Modal transparent animationType="none" visible={!!artifact} onRequestClose={() => dismiss()} statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,8,6,0.75)', opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => dismiss()} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[ams.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* ── Hero Image ── */}
        <View style={ams.heroWrap}>
          <Image source={{ uri: imgUrl }} style={ams.heroImg} resizeMode="cover" />
          <View style={ams.heroScrim} />

          {/* Drag handle */}
          <View style={ams.handle} />

          {/* Category pill — top left */}
          <View style={ams.catPill}>
            <Ionicons name="business-outline" size={11} color={C.gold} />
            <Text style={ams.catPillText}>{artifact.category}</Text>
          </View>

          {/* Close X — top right */}
          <TouchableOpacity style={ams.closeBtn} onPress={() => dismiss()} activeOpacity={0.8}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>

          {/* 1/1 counter — bottom right */}
          <View style={ams.imgCounter}>
            <Text style={ams.imgCounterText}>1 / 1</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* ── Title + Favorite ── */}
          <View style={ams.titleSection}>
            <View style={{ flex: 1 }}>
              <Text style={ams.name}>{artifact.name}</Text>
              <Text style={ams.shrine}>National Shrine of Our Lady of Sorrows</Text>
            </View>
            <TouchableOpacity
              style={[ams.iconBtn, isFavorite && ams.iconBtnActive]}
              onPress={toggleFavorite}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            >
              <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? C.gold : C.inkMid} />
              <Text style={[ams.iconBtnLabel, isFavorite && ams.iconBtnLabelActive]}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* ── Tab bar ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ams.tabBar} contentContainerStyle={ams.tabBarContent}>
            {ARTIFACT_DETAIL_TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                style={[ams.tabChip, activeTab === tab && ams.tabChipActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.75}
              >
                <Text style={[ams.tabChipText, activeTab === tab && ams.tabChipTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={ams.body}>
            {/* ── Tab content ── */}
            <Text style={ams.tabContent}>{getTabContent(activeTab)}</Text>

            {/* ── Metadata grid — Overview only ── */}
            {activeTab === 'Overview' && (
              <View style={ams.metaGrid}>
                <View style={ams.metaCell}>
                  <Ionicons name="calendar-outline" size={18} color={C.inkMid} />
                  <Text style={ams.metaLabel}>Date</Text>
                  <Text style={ams.metaValue}>{artifact.date ?? 'Date unknown'}</Text>
                </View>
                <View style={[ams.metaCell, ams.metaCellRight]}>
                  <Ionicons name="person-outline" size={18} color={C.inkMid} />
                  <Text style={ams.metaLabel}>Creator / Artist</Text>
                  <Text style={ams.metaValue}>{artifact.creator ?? 'Unknown'}</Text>
                </View>
                <View style={[ams.metaCell, ams.metaCellBottom]}>
                  <Ionicons name="layers-outline" size={18} color={C.inkMid} />
                  <Text style={ams.metaLabel}>Category</Text>
                  <Text style={ams.metaValue}>{artifact.category}</Text>
                </View>
                <View style={[ams.metaCell, ams.metaCellRight, ams.metaCellBottom]}>
                  <Ionicons name="location-outline" size={18} color={C.inkMid} />
                  <Text style={ams.metaLabel}>Location</Text>
                  <Text style={ams.metaValue}>National Shrine of Our Lady of Sorrows</Text>
                </View>
              </View>
            )}

            {/* ── Audio Narration ── */}
            <View style={ams.audioSection}>
              {/* Header */}
              <View style={ams.audioHeader}>
                <View style={ams.audioHeaderLeft}>
                  <Ionicons name="headset-outline" size={18} color={C.ink} />
                  <Text style={ams.audioHeaderText}>Audio Narration</Text>
                  {isCurrentlyPlaying && <AudioWaveform isPlaying color={C.gold} />}
                </View>
                {availableLangs.length > 0 && (
                  <TouchableOpacity
                    style={ams.langDropdown}
                    onPress={() => setLangDropdownOpen(v => !v)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="globe-outline" size={14} color={C.inkMid} />
                    <Text style={ams.langDropdownText}>{selectedLangLabel}</Text>
                    <Ionicons name={langDropdownOpen ? 'chevron-up' : 'chevron-down'} size={14} color={C.inkMid} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Language options */}
              {langDropdownOpen && availableLangs.length > 0 && (
                <View style={ams.langOptions}>
                  {availableLangs.map(t => {
                    const label    = langMeta[t.language_code] ?? t.language_code.toUpperCase();
                    const isActive = selectedLanguage === t.language_code;
                    return (
                      <TouchableOpacity
                        key={t.language_code}
                        style={[ams.langOption, isActive && ams.langOptionActive]}
                        onPress={() => { setSelectedLanguage(t.language_code); stopAudio(); setLangDropdownOpen(false); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[ams.langOptionText, isActive && ams.langOptionTextActive]}>{label}</Text>
                        {t.audio_url && <Ionicons name="volume-medium-outline" size={12} color={isActive ? C.gold : C.inkLight} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Player */}
              {currentLangAudio ? (
                <View style={ams.playerRow}>
                  <TouchableOpacity
                    style={[ams.playCircle, isCurrentlyPlaying && ams.playCircleActive]}
                    onPress={() => isCurrentlyPlaying ? stopAudio() : playAudio(currentLangAudio.audio_url!, selectedLanguage)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={isCurrentlyPlaying ? 'pause' : 'play'} size={22} color="#fff" />
                  </TouchableOpacity>
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={ams.progressTrack}>
                      <View style={[ams.progressFill, { width: `${audioDuration > 0 ? Math.min((currentTime / audioDuration) * 100, 100) : 0}%` }]} />
                    </View>
                    <View style={ams.progressTimes}>
                      <Text style={ams.progressTime}>{formatTime(currentTime)}</Text>
                      <Text style={ams.progressTime}>-{formatTime(Math.max(0, audioDuration - currentTime))}</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={ams.noAudioBox}>
                  <Ionicons name="volume-mute-outline" size={16} color={C.inkLight} />
                  <Text style={ams.noAudioText}>
                    No audio for {selectedLangLabel}.{availableLangs.some(t => t.audio_url) ? ' Try another language.' : ''}
                  </Text>
                </View>
              )}

              {/* Speed controls — only while playing */}
              {isCurrentlyPlaying && (
                <View style={ams.controlsRow}>
                  <TouchableOpacity style={ams.skipBtn} onPress={() => handleSkip(-10)} activeOpacity={0.7}>
                    <Ionicons name="play-back" size={16} color={C.inkMid} />
                    <Text style={ams.skipLabel}>10s</Text>
                  </TouchableOpacity>
                  <View style={ams.rateRow}>
                    {([0.75, 1, 1.5, 2] as const).map(r => (
                      <TouchableOpacity
                        key={r}
                        style={[ams.rateBtn, playbackRate === r && ams.rateBtnActive]}
                        onPress={() => handleRateChange(r)}
                        activeOpacity={0.7}
                      >
                        <Text style={[ams.rateText, playbackRate === r && ams.rateTextActive]}>
                          {r === 1 ? '1×' : `${r}×`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={ams.skipBtn} onPress={() => handleSkip(10)} activeOpacity={0.7}>
                    <Ionicons name="play-forward" size={16} color={C.inkMid} />
                    <Text style={ams.skipLabel}>10s</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* ── Bottom action button ── */}
            <View style={ams.bottomBtns}>
              <TouchableOpacity style={ams.scanAgainBtn} onPress={() => dismiss(true)} activeOpacity={0.85}>
                <Ionicons name="qr-code-outline" size={18} color="#fff" />
                <Text style={ams.scanAgainBtnText}>Scan Another Artifact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function getAmsStyles(C: ReturnType<typeof buildC>) { return StyleSheet.create({
  // ── Sheet ──
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.93,
    overflow: 'hidden',
    shadowColor: C.ink, shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: -6 }, shadowRadius: 22, elevation: 26,
  },

  // ── Hero ──
  heroWrap: { width: '100%', height: 280, position: 'relative' },
  heroImg:  { width: '100%', height: '100%' },
  heroScrim: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: 'rgba(10,8,5,0.32)',
  },
  handle: {
    position: 'absolute', top: 10, alignSelf: 'center', left: '50%',
    marginLeft: -20,
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  catPill: {
    position: 'absolute', top: 16, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(10,8,5,0.72)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50,
    borderWidth: 1, borderColor: C.borderGold,
  },
  catPillText: { fontSize: 12, fontWeight: '700', color: C.gold },
  closeBtn: {
    position: 'absolute', top: 12, right: 14,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(30,27,23,0.65)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  imgCounter: {
    position: 'absolute', bottom: 14, right: 16,
    backgroundColor: 'rgba(10,8,5,0.65)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  imgCounterText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  // ── Title ──
  titleSection: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4, gap: 12,
  },
  name:   { fontSize: 28, fontWeight: '900', color: C.ink, letterSpacing: -0.8, lineHeight: 34, marginBottom: 4 },
  shrine: { fontSize: 13, color: C.inkMid },

  iconBtn: {
    alignItems: 'center', gap: 4, marginTop: 4,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center',
  },
  iconBtnActive:      { backgroundColor: C.goldSoft, borderColor: C.gold },
  iconBtnLabel:       { fontSize: 10, fontWeight: '700', color: C.inkMid },
  iconBtnLabelActive: { color: C.gold },

  // ── Tab bar ──
  tabBar:        { marginTop: 16, paddingLeft: 20 },
  tabBarContent: { flexDirection: 'row', gap: 8, paddingRight: 20, paddingBottom: 4 },
  tabChip: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 50,
    backgroundColor: C.goldLight, borderWidth: 1.5, borderColor: C.border,
  },
  tabChipActive:    { backgroundColor: C.ink, borderColor: C.ink },
  tabChipText:      { fontSize: 13, fontWeight: '700', color: C.inkMid },
  tabChipTextActive:{ color: '#fff' },

  // ── Body ──
  body: { paddingHorizontal: 20, paddingTop: 16 },
  tabContent: { fontSize: 15, color: C.inkMid, lineHeight: 26, marginBottom: 20 },

  // ── Metadata grid ──
  metaGrid: {
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden', marginBottom: 24,
  },
  metaCell: {
    padding: 14, backgroundColor: C.bg, flex: 1, gap: 4,
    borderRightWidth: 0, borderBottomWidth: 0,
  },
  metaCellRight:  { borderLeftWidth: 1, borderColor: C.border },
  metaCellBottom: { borderTopWidth: 1,  borderColor: C.border },
  metaLabel: { fontSize: 10, color: C.inkLight, marginTop: 4 },
  metaValue: { fontSize: 13, fontWeight: '700', color: C.ink, lineHeight: 18 },

  // ── Audio section ──
  audioSection: {
    backgroundColor: C.bg, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    padding: 16, marginBottom: 24, gap: 12,
  },
  audioHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  audioHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  audioHeaderText: { fontSize: 15, fontWeight: '700', color: C.ink },

  // Language dropdown
  langDropdown: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.borderGold,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50,
  },
  langDropdownText: { fontSize: 13, fontWeight: '700', color: C.inkMid },
  langOptions: {
    backgroundColor: C.surface, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  langOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: 1, borderColor: C.border,
  },
  langOptionActive:     { backgroundColor: C.goldSoft },
  langOptionText:       { fontSize: 13, fontWeight: '600', color: C.inkMid },
  langOptionTextActive: { color: C.gold, fontWeight: '700' },

  // Player row
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  playCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.ink,
    justifyContent: 'center', alignItems: 'center',
  },
  playCircleActive: { backgroundColor: C.gold },

  progressTrack: { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: C.gold, borderRadius: 2 },
  progressTimes: { flexDirection: 'row', justifyContent: 'space-between' },
  progressTime:  { fontSize: 11, color: C.inkLight },

  controlsRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 4,
  },
  skipBtn:  { alignItems: 'center', gap: 2, paddingHorizontal: 6 },
  skipLabel:{ fontSize: 9, color: C.inkMid, fontWeight: '600' },
  rateRow:  { flexDirection: 'row', gap: 4 },
  rateBtn: {
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20,
    backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.borderGold,
  },
  rateBtnActive:  { backgroundColor: C.gold, borderColor: C.gold },
  rateText:       { fontSize: 11, fontWeight: '700', color: C.inkMid },
  rateTextActive: { color: C.ink },

  noAudioBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
  },
  noAudioText: { flex: 1, fontSize: 13, color: C.inkMid, lineHeight: 20 },

  // ── Bottom buttons ──
  bottomBtns: { gap: 12, marginTop: 4 },
  scanAgainBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.ink, borderRadius: 50,
    paddingVertical: 16,
    shadowColor: C.ink, shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 5,
  },
  scanAgainBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
});
}

export default function QRScanner({
  setNavbarVisible,
  isActive = false,
}: {
  setNavbarVisible?: (v: boolean) => void;
  isActive?: boolean;
}) {
  const { theme } = useAppTheme(); C = buildC(theme); sf = getSfStyles(C); ams = getAmsStyles(C); styles = getStyles(C);
  const { user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [torchOn, setTorchOn]           = useState(false);
  const [scanned, setScanned]           = useState(false);
  const [scanning, setScanning]         = useState(false);
  const [artifact, setArtifact]         = useState<Artifact | null>(null);
  const [scanError, setScanError]       = useState<string | null>(null);
  const [scannedArtifacts, setScannedArtifacts] = useState<Artifact[]>([]);
  const [toast, setToast]               = useState<string | null>(null);
  const [photoMatching, setPhotoMatching] = useState(false);
  const toastTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inCooldown  = useRef(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // ── Tour-completion state ────────────────────────────────────────────────────
  const [totalArtifacts, setTotalArtifacts]         = useState(0);
  const [showFeedback, setShowFeedback]             = useState(false);
  // Guard: only trigger the feedback modal once per app session
  const feedbackShownThisSession = useRef(false);

  // ── Camera lifecycle: only active when this tab is focused and no modal is open ──
  useEffect(() => {
    if (isActive && !artifact) {
      if (inCooldown.current) return; // still in cooldown — don't re-enable yet
      // Small delay so the swipe animation finishes before camera activates
      const t = setTimeout(() => {
        setScanned(false);
        setScanError(null);
        setCameraActive(true);
      }, 300);
      return () => clearTimeout(t);
    } else {
      // Immediately cut the camera when leaving the tab or opening an artifact modal
      setCameraActive(false);
      setTorchOn(false);
    }
  }, [isActive, artifact]);

  // Hide navbar when modal is open
  useEffect(() => {
    setNavbarVisible?.(!artifact);
  }, [artifact]);

  // Load scanned artifacts from storage
  useEffect(() => {
    AsyncStorage.getItem('scannedArtifacts')
      .then(stored => stored && setScannedArtifacts(JSON.parse(stored)))
      .catch(() => {});
  }, []);

  // Fetch the total number of artifacts from Supabase (for tour-completion detection)
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const { count } = await supabase
        .from('artifacts')
        .select('id', { count: 'exact', head: true });
      if (mounted && count != null && count > 0) setTotalArtifacts(count);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Tour-completion: show feedback modal when all artifacts have been scanned
  useEffect(() => {
    if (
      totalArtifacts > 0 &&
      scannedArtifacts.length >= totalArtifacts &&
      !feedbackShownThisSession.current &&
      !showFeedback
    ) {
      // Small delay so the artifact detail modal can close first
      const t = setTimeout(() => {
        feedbackShownThisSession.current = true;
        setShowFeedback(true);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [scannedArtifacts.length, totalArtifacts]);

  // Pulse animation loop
  useEffect(() => {
    if (!cameraActive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.delay(200),
        Animated.timing(pulse, { toValue: 0, duration: 1500, useNativeDriver: false }),
        Animated.delay(200),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [cameraActive]);

  // Cleanup timers on unmount
  useEffect(() => () => {
    toastTimer.current && clearTimeout(toastTimer.current);
    errorTimer.current && clearTimeout(errorTimer.current);
    cooldownTimer.current && clearTimeout(cooldownTimer.current);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  const playScanSound = async () => {
    // Drop in a sound file at assets/sounds/scan_success.mp3 to enable audio feedback.
    // Using a try/catch ensures silence if the asset is missing or fails to load.
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'duckOthers' });
      // NOTE: Place scan_success.mp3 in assets/sounds/ and uncomment the line below.
      // const player = createAudioPlayer(require('../../../assets/sounds/scan_success.mp3')) as any;
      // player.play();
      // setTimeout(() => player.remove?.(), 3000);
    } catch (_) {}
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setScanning(true);
    setScanError(null);

    // Haptic + sound feedback immediately on detection
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playScanSound();

    try {
      const { data: result, error } = await supabase
        .from('artifacts')
        .select('*')
        .eq('qr_value', data)
        .maybeSingle();

      if (error) throw error;
      if (!result) {
        setScanError('QR code not recognised. Make sure you\'re scanning an official Sacred Heritage QR tag.');
        // Auto-reset after 3 s
        errorTimer.current = setTimeout(() => startScanning(), 3000);
        return;
      }

      setCameraActive(false);
      setArtifact(result); // ← modal opens immediately

      // Persist to scan history
      setScannedArtifacts(prev => {
        if (prev.find(a => a.id === result.id)) return prev;
        const updated = [...prev, result];
        AsyncStorage.setItem('scannedArtifacts', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setScanError(e.message ?? 'Something went wrong. Please try again.');
      errorTimer.current = setTimeout(() => startScanning(), 3000);
    } finally {
      setScanning(false);
    }
  };

  // scanAgain=true  → "Scan Another Artifact" button → 1s cooldown
  // scanAgain=false → X / backdrop dismiss           → 5s cooldown
  const reset = (scanAgain = false) => {
    setArtifact(null);
    setScanned(false);
    setScanError(null);
    const delay = scanAgain ? 1000 : 5000;
    const label = scanAgain ? '1s' : '5s';
    inCooldown.current = true;
    cooldownTimer.current && clearTimeout(cooldownTimer.current);
    cooldownTimer.current = setTimeout(() => {
      inCooldown.current = false;
      if (isActive) {
        setScanned(false);
        setScanError(null);
        setCameraActive(true);
      }
    }, delay);
    showToast(`Camera ready in ${label}…`);
  };

  const startScanning = () => {
    errorTimer.current && clearTimeout(errorTimer.current);
    setScanned(false);
    setScanError(null);
    if (isActive) setCameraActive(true);
  };

  // ── Photo fallback: pick an image and fuzzy-match by filename/artifact name ──
  const handlePhotoFallback = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.5,
      });
      if (result.canceled || !result.assets?.length) return;

      setPhotoMatching(true);
      setScanError(null);

      // Extract a search keyword from the file name
      const uri = result.assets[0].uri;
      const fileName = uri.split('/').pop() ?? '';
      // Strip extension and common camera prefixes, convert underscores/dashes to spaces
      const keyword = fileName
        .replace(/\.[^.]+$/, '')
        .replace(/^(img|image|photo|dsc|pic|screenshot)[_\-]?/i, '')
        .replace(/[_\-]/g, ' ')
        .trim();

      if (!keyword || keyword.length < 2) {
        // Fallback: show all artifacts for the user to pick
        const { data: all } = await supabase
          .from('artifacts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        if (all && all.length > 0) {
          setArtifact(all[0]);
          setCameraActive(false);
          setScannedArtifacts(prev => {
            if (prev.find(a => a.id === all[0].id)) return prev;
            const updated = [...prev, all[0]];
            AsyncStorage.setItem('scannedArtifacts', JSON.stringify(updated)).catch(() => {});
            return updated;
          });
        } else {
          setScanError('Could not match image to any artifact. Try a more specific photo.');
        }
        return;
      }

      // Search by name containing the keyword
      const { data: matches, error } = await supabase
        .from('artifacts')
        .select('*')
        .ilike('name', `%${keyword}%`)
        .limit(5);

      if (error) throw error;

      if (matches && matches.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCameraActive(false);
        setArtifact(matches[0]);
        setScannedArtifacts(prev => {
          if (prev.find(a => a.id === matches[0].id)) return prev;
          const updated = [...prev, matches[0]];
          AsyncStorage.setItem('scannedArtifacts', JSON.stringify(updated)).catch(() => {});
          return updated;
        });
        showToast(`Matched: ${matches[0].name}`);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setScanError(`No artifact matched "${keyword}". Try renaming the photo to match an artifact name, or scan the QR code directly.`);
      }
    } catch (e: any) {
      setScanError(e.message ?? 'Photo matching failed. Please try again.');
    } finally {
      setPhotoMatching(false);
    }
  };

  // ── Permission states ────────────────────────────────────────────────────────
  if (!permission) return (
    <SafeAreaView style={styles.centered}>
      <ActivityIndicator size="large" color={C.gold} />
    </SafeAreaView>
  );

  if (!permission.granted) return (
    <SafeAreaView style={styles.centered}>
      <View style={styles.permIconWrap}>
        <Ionicons name="camera-outline" size={48} color={C.gold} />
      </View>
      <Text style={styles.permTitle}>Camera Access Needed</Text>
      <Text style={styles.permSub}>Allow camera access to scan artifact QR codes and discover their sacred history</Text>
      <TouchableOpacity
        style={styles.permBtn}
        onPress={requestPermission}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Grant camera permission"
        accessibilityHint="Allows ETurismo to scan museum QR codes"
      >
        <Text style={styles.permBtnTxt}>Grant Permission</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.eyebrow}>SACRED HERITAGE</Text>
            <Text style={styles.title}>QR Scanner</Text>
            <View style={styles.goldLine} />
          </View>
          {/* Tour progress */}
          {scannedArtifacts.length > 0 && (
            <View
              style={styles.tourProgressPill}
              accessible
              accessibilityLabel={`${scannedArtifacts.length} of ${totalArtifacts || scannedArtifacts.length} artifacts scanned`}
            >
              <View style={styles.tourProgressTop}>
                <Ionicons name="footsteps-outline" size={14} color={C.gold} />
                <Text style={styles.tourProgressText}>
                  {scannedArtifacts.length}/{totalArtifacts || '—'} visited
                </Text>
              </View>
              <View style={styles.tourProgressTrack}>
                <View
                  style={[
                    styles.tourProgressFill,
                    {
                      width: `${totalArtifacts > 0 ? Math.min((scannedArtifacts.length / totalArtifacts) * 100, 100) : 0}%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* ── Camera View ── */}
      <View style={styles.cameraContainer}>
        {cameraActive ? (
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torchOn}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />

            {/* Dark vignette overlay */}
            <View style={styles.vignetteTop} />
            <View style={styles.vignetteBottom} />
            <View style={styles.vignetteLeft} />
            <View style={styles.vignetteRight} />

            {/* Scan frame centered */}
            <View style={styles.frameContainer}>
              <ScanFrame pulse={pulse} />
            </View>

            {/* Torch toggle */}
            <TouchableOpacity
              style={[styles.torchBtn, torchOn && styles.torchBtnActive]}
              onPress={() => setTorchOn(v => !v)}
              activeOpacity={0.8}
              accessibilityRole="switch"
              accessibilityLabel="Camera flashlight"
              accessibilityState={{ checked: torchOn }}
            >
              <Ionicons name={torchOn ? 'flashlight' : 'flashlight-outline'} size={20} color={torchOn ? C.ink : C.gold} />
            </TouchableOpacity>

            {/* Scanning hint overlay */}
            <View style={styles.scanHintOverlay}>
              <Text style={styles.scanHintText}>Position QR code inside the gold frame</Text>
            </View>
          </View>
        ) : (
          /* Camera is off — show a clear inactive state */
          <View style={styles.cameraInactive}>
            <Ionicons name="videocam-off-outline" size={36} color={C.gold} style={{ marginBottom: 10 }} />
            <Text style={styles.cameraInactiveTitle}>Camera Inactive</Text>
            <Text style={styles.cameraInactiveSub}>
              {isActive ? 'Starting camera…' : 'Navigate to this tab to activate the camera'}
            </Text>
            {isActive && <ActivityIndicator size="small" color={C.gold} style={{ marginTop: 12 }} />}
          </View>
        )}
      </View>

      {/* ── Status Area ── */}
      <SafeAreaView edges={['bottom']} style={styles.statusSafe}>
        <View style={styles.statusArea}>
          {scanning ? (
            <View style={styles.statusRow} accessibilityLiveRegion="polite">
              <ActivityIndicator size="small" color={C.gold} />
              <Text style={styles.statusTxt}>Looking up artifact…</Text>
            </View>
          ) : scanError ? (
            <View style={styles.errorBox} accessibilityLiveRegion="assertive">
              <View style={styles.errorIcon}>
                <Text style={styles.errorIconTxt}>!</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Not Recognised</Text>
                <Text style={styles.errorSub}>{scanError}</Text>
                <Text style={styles.errorAutoReset}>Retrying automatically…</Text>
              </View>
              <TouchableOpacity
                onPress={startScanning}
                style={styles.retryBtn}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Retry QR scan"
              >
                <Text style={styles.retryBtnTxt}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : cameraActive && !scanned ? (
            <View style={styles.hintBox}>
              <Ionicons name="scan-outline" size={18} color={C.gold} style={{ marginTop: 1 }} />
              <Text style={styles.hintTxt}>
                Point your camera at an artifact's QR code to reveal its sacred history and liturgical significance
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Photo fallback button ── */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
          <TouchableOpacity
            onPress={handlePhotoFallback}
            disabled={photoMatching}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Identify an artifact from a photo"
            accessibilityState={{ disabled: photoMatching, busy: photoMatching }}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
              borderWidth: 1.5, borderColor: C.borderGold,
              borderRadius: 50, paddingVertical: 13,
              backgroundColor: C.goldSoft,
            }}
          >
            {photoMatching
              ? <ActivityIndicator size="small" color={C.gold} />
              : <Ionicons name="image-outline" size={18} color={C.gold} />
            }
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.gold }}>
              {photoMatching ? 'Matching photo…' : "Can't scan? Match by photo"}
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 10, color: C.inkLight, textAlign: 'center', marginTop: 7, lineHeight: 15 }}>
            Pick a photo of an artifact — we'll try to identify it by name
          </Text>
        </View>
      </SafeAreaView>

      {/* ── Toast ── */}
      {toast && (
        <Animated.View
          style={[styles.toast, { opacity: toastOpacity }]}
          accessibilityLiveRegion="polite"
        >
          <Ionicons name="checkmark-circle" size={16} color={C.gold} />
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      {/* ─── Artifact Detail Modal (camera already unmounted above) ── */}
      <ArtifactModal artifact={artifact} onClose={reset} />

      {/* ─── Post-Tour Feedback Modal ─────────────────────────────────────── */}
      <PostTourFeedback
        visible={showFeedback}
        totalArtifacts={totalArtifacts}
        userId={user?.id}
        onClose={() => setShowFeedback(false)}
      />
    </View>
  );
}

// ─── Styles (Sacred Heritage Theme) ────────────────────────────────────────────
