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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── SACRED HERITAGE THEME TOKENS ──────────────────────────────────────────────
function buildC(t: typeof THEMES.light) {
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
    ...StyleSheet.absoluteFillObject,
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

type ArtifactTranslation = {
  language_code: string;
  name: string;
  description: string | null;
  audio_url: string | null;
};

type Artifact = {
  id: string;
  name: string;
  category: string;
  qr_code: string;
  qr_value: string;
  created_at: string;
  description?: string;
  image_url?: string;
  creator?: string;
};

const CATEGORY_IMAGES: Record<string, string> = {
  'Vestments':          'https://images.unsplash.com/photo-1582552938356-8b6b14c0e1ee?w=600',
  'Sacred Vessels':     'https://images.unsplash.com/photo-1602351447937-7457d2e0ffc3?w=600',
  'Liturgical Books':   'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
  'Devotional Objects': 'https://images.unsplash.com/photo-1566505237780-6bf6d4c1b84e?w=600',
  'Altar Furnishings':  'https://images.unsplash.com/photo-1601940462811-2c893df9477c?w=600',
  'Sacramentals':       'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=600',
};

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
function AudioWaveform({ isPlaying }: { isPlaying: boolean }) {
  const bars = [useRef(new Animated.Value(0.4)).current, useRef(new Animated.Value(0.6)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.8)).current, useRef(new Animated.Value(0.5)).current];
  useEffect(() => {
    if (!isPlaying) { bars.forEach(b => Animated.timing(b, { toValue: 0.3, duration: 300, useNativeDriver: true }).start()); return; }
    const anims = bars.map((bar, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 80),
        Animated.timing(bar, { toValue: 1, duration: 300 + i * 60, useNativeDriver: true }),
        Animated.timing(bar, { toValue: 0.25, duration: 300 + i * 60, useNativeDriver: true }),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [isPlaying]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 24 }}>
      {bars.map((b, i) => (
        <Animated.View key={i} style={{ width: 3, borderRadius: 2, backgroundColor: C.gold, transform: [{ scaleY: b }], height: 20 }} />
      ))}
    </View>
  );
}

// ─── Artifact Detail Modal (Redesigned with Audio Guide + Word Highlighting) ────
function ArtifactModal({
  artifact, onClose,
}: { artifact: Artifact | null; onClose: () => void }) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const { language: appLanguage } = useLanguage();

  const [playingLang, setPlayingLang] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(appLanguage);
  const [translations, setTranslations] = useState<ArtifactTranslation[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number>(60); // seconds, updated on load
  const playerRef = useRef<any>(null);
  const playbackSubscriptionRef = useRef<any>(null);

  // Sync selectedLanguage when user changes app-wide language in Settings
  useEffect(() => {
    setSelectedLanguage(appLanguage);
  }, [appLanguage]);

  // ── Current description text for the selected language ──
  function getDescByLang(lang: string): string {
    const t = translations.find(t => t.language_code === lang);
    return t?.description || artifact?.description || 'This sacred artifact is part of the Sacred Heritage Collection, preserved as a testament to centuries of liturgical tradition and craftsmanship.';
  }

  const currentDesc = getDescByLang(selectedLanguage);

  // ── Word-highlighting hook ──
  const { words, highlightedIndex, startHighlight, stopHighlight, resetHighlight } =
    useAudioWordHighlight({ text: currentDesc, durationSeconds: audioDuration });

  useEffect(() => {
    if (artifact) {
      setupAudioModal();
      checkSaveAndFavorite();
      fetchTranslations(artifact.id);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [artifact]);

  // Reset highlight state when language changes
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
      // Default to the app-wide language if available, then English, then the first available
      if (data && data.length > 0) {
        const hasAppLang = data.find(t => t.language_code === appLanguage);
        const hasEn = data.find(t => t.language_code === 'en');
        setSelectedLanguage(
          hasAppLang ? appLanguage : hasEn ? 'en' : data[0].language_code
        );
      }
    } catch (e: any) {
      console.error('Translations fetch:', e.message);
      setTranslations([]);
    }
  }

  async function checkSaveAndFavorite() {
    if (!artifact) return;
    const saved = await getStringArray(STORAGE_KEYS.savedArtifacts);
    setIsSaved(saved.includes(artifact.id));
  }

  async function toggleSave() {
    if (!artifact) return;
    const updated = await toggleInStringArray(STORAGE_KEYS.savedArtifacts, artifact.id);
    setIsSaved(updated.includes(artifact.id));
  }

  async function playAudio(audioUrl: string, lang: string) {
    try {
      await stopAudio();
      setPlayingLang(lang);
      const player = createAudioPlayer({ uri: audioUrl }) as any;
      playerRef.current = player;

      const sub = player.addListener('playbackStatusUpdate', (status: any) => {
        // Capture duration when known
        if (status.durationMillis && status.durationMillis > 0) {
          setAudioDuration(status.durationMillis / 1000);
        }
        if (status.didJustFinish) {
          setPlayingLang(null);
          stopHighlight();
          sub.remove();
          playerRef.current?.remove?.();
          playerRef.current = null;
        }
      });
      playbackSubscriptionRef.current = sub;
      player.play();

      // Start word highlighting
      startHighlight(player);
    } catch (e: any) {
      console.error('Playback error:', e.message);
      setPlayingLang(null);
      resetHighlight();
    }
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
    setPlayingLang(null);
    stopHighlight();
  }

  const handleClose = () => {
    stopAudio();
    resetHighlight();
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 350, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => { setSelectedLanguage(appLanguage); setTranslations([]); onClose(); });
  };

  if (!artifact) return null;

  const imgUrl = artifact.image_url ?? CATEGORY_IMAGES[artifact.category] ?? 'https://via.placeholder.com/600?text=Artifact';

  const langMeta: Record<string, { label: string; flag: string }> = {
    en:  { label: 'English',  flag: '🇺🇸' },
    fil: { label: 'Filipino', flag: '🇵🇭' },
    ja:  { label: 'Japanese', flag: '🇯🇵' },
    es:  { label: 'Spanish',  flag: '🇪🇸' },
    ko:  { label: 'Korean',   flag: '🇰🇷' },
  };

  const availableLangs = translations.filter(t => t.description || t.audio_url);
  const currentLangAudio = translations.find(t => t.language_code === selectedLanguage && t.audio_url);
  const isCurrentlyPlaying = playingLang === selectedLanguage;

  return (
    <Modal transparent animationType="none" visible={!!artifact} onRequestClose={handleClose} statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,8,6,0.72)', opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View style={[ams.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Drag Handle */}
        <View style={ams.handle} />

        {/* Close button */}
        <TouchableOpacity style={ams.closeBtn} onPress={handleClose} activeOpacity={0.7}>
          <Ionicons name="close" size={18} color={C.inkMid} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* ── Hero Image ── */}
          <View style={ams.heroWrap}>
            <Image source={{ uri: imgUrl }} style={ams.heroImg} resizeMode="cover" />
            <View style={ams.heroScrim} />
            {/* Category pill */}
            <View style={ams.catPill}>
              <Text style={ams.catPillText}>{artifact.category.toUpperCase()}</Text>
            </View>
            {/* Scan success badge */}
            <View style={ams.scanBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#2ECC71" />
              <Text style={ams.scanBadgeText}>SCANNED</Text>
            </View>
          </View>

          {/* ── Content ── */}
          <View style={ams.body}>
            {/* Title row */}
            <View style={ams.titleRow}>
              <View style={{ flex: 1 }}>
                <View style={ams.goldBar} />
                <Text style={ams.name}>{artifact.name}</Text>
                <Text style={ams.period}>Circa {new Date(artifact.created_at).getFullYear()}</Text>
              </View>
              {/* Save button */}
              <TouchableOpacity style={[ams.saveBtn, isSaved && ams.saveBtnActive]} onPress={toggleSave} activeOpacity={0.75}>
                <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={20} color={isSaved ? C.gold : C.inkMid} />
              </TouchableOpacity>
            </View>

            {/* ── Language Switcher ── */}
            {availableLangs.length > 0 && (
              <View style={ams.section}>
                <View style={ams.sectionHeaderRow}>
                  <Ionicons name="language-outline" size={14} color={C.gold} />
                  <Text style={ams.sectionLabel}>LANGUAGE</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                  <View style={ams.langRow}>
                    {availableLangs.map(t => {
                      const meta = langMeta[t.language_code] || { label: t.language_code.toUpperCase(), flag: '🌐' };
                      const isActive = selectedLanguage === t.language_code;
                      return (
                        <TouchableOpacity
                          key={t.language_code}
                          style={[ams.langChip, isActive && ams.langChipActive]}
                          onPress={() => { setSelectedLanguage(t.language_code); stopAudio(); }}
                          activeOpacity={0.7}
                        >
                          <Text style={ams.langFlag}>{meta.flag}</Text>
                          <Text style={[ams.langLabel, isActive && ams.langLabelActive]}>{meta.label}</Text>
                          {t.audio_url && (
                            <Ionicons name="volume-medium-outline" size={11} color={isActive ? C.gold : C.inkLight} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* ── About this Piece (with word highlighting) ── */}
            <View style={ams.section}>
              <View style={ams.sectionHeaderRow}>
                <Ionicons name="book-outline" size={14} color={C.gold} />
                <Text style={ams.sectionLabel}>ABOUT THIS PIECE</Text>
              </View>
              <View style={ams.descBox}>
                {isCurrentlyPlaying ? (
                  // Show word-highlighted text while audio plays
                  <HighlightedText
                    words={words}
                    highlightedIndex={highlightedIndex}
                    textStyle={ams.descText}
                    highlightColor="rgba(201,168,76,0.30)"
                  />
                ) : (
                  <Text style={ams.descText}>{currentDesc}</Text>
                )}
              </View>
            </View>

            {/* ── Audio Guide ── */}
            <View style={ams.section}>
              <View style={ams.sectionHeaderRow}>
                <Ionicons name="headset-outline" size={14} color={C.gold} />
                <Text style={ams.sectionLabel}>AUDIO GUIDE</Text>
              </View>

              {currentLangAudio ? (
                /* Player card */
                <TouchableOpacity
                  style={[ams.playerCard, isCurrentlyPlaying && ams.playerCardActive]}
                  onPress={() => isCurrentlyPlaying ? stopAudio() : playAudio(currentLangAudio.audio_url!, selectedLanguage)}
                  activeOpacity={0.85}
                >
                  {/* Play / pause circle */}
                  <View style={[ams.playCircle, isCurrentlyPlaying && ams.playCircleActive]}>
                    <Ionicons name={isCurrentlyPlaying ? 'pause' : 'play'} size={22} color={isCurrentlyPlaying ? C.ink : C.gold} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={ams.playerLabel}>
                      {isCurrentlyPlaying ? 'Now playing…' : 'Tap to listen'}
                    </Text>
                    <Text style={ams.playerSub}>
                      {(langMeta[selectedLanguage] || { flag: '🌐' }).flag}{' '}
                      {(langMeta[selectedLanguage] || { label: selectedLanguage }).label} narration
                    </Text>
                    {isCurrentlyPlaying && (
                      <Text style={ams.highlightHint}>↑ Words highlighted above as audio plays</Text>
                    )}
                  </View>

                  {/* Waveform / volume icon */}
                  {isCurrentlyPlaying
                    ? <AudioWaveform isPlaying />
                    : <Ionicons name="volume-medium-outline" size={22} color={C.inkLight} />
                  }
                </TouchableOpacity>
              ) : (
                /* No audio available for this language */
                <View style={ams.noAudioBox}>
                  <Ionicons name="volume-mute-outline" size={20} color={C.inkLight} />
                  <Text style={ams.noAudioText}>
                    No audio guide for{' '}
                    {(langMeta[selectedLanguage] || { label: selectedLanguage }).label} yet.
                    {availableLangs.some(t => t.audio_url) ? ' Try another language above.' : ''}
                  </Text>
                </View>
              )}

              {/* Tip only shown when audio is playing */}
              {isCurrentlyPlaying && (
                <View style={ams.tipRow}>
                  <Ionicons name="information-circle-outline" size={14} color={C.gold} />
                  <Text style={ams.tipText}>Words in the description are highlighted as the guide speaks.</Text>
                </View>
              )}
            </View>

            {/* ── Close Button ── */}
            <TouchableOpacity style={ams.closeFullBtn} onPress={handleClose} activeOpacity={0.85}>
              <Text style={ams.closeFullBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function getAmsStyles(C: ReturnType<typeof buildC>) { return StyleSheet.create({
  // ── Bottom sheet ──
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.92,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderColor: C.borderGold,
    shadowColor: C.ink,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: -6 },
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 16, zIndex: 10,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.goldLight,
    borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Hero ──
  heroWrap: { width: '100%', height: 240, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,8,5,0.28)' },
  catPill: {
    position: 'absolute', bottom: 14, left: 18,
    backgroundColor: 'rgba(10,8,5,0.82)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 50,
    borderWidth: 1, borderColor: C.borderGold,
  },
  catPillText: { fontSize: 9, fontWeight: '800', color: C.gold, letterSpacing: 2.5 },
  scanBadge: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(10,8,5,0.78)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.4)',
  },
  scanBadgeText: { fontSize: 9, fontWeight: '800', color: '#2ECC71', letterSpacing: 1.5 },

  // ── Body ──
  body: { padding: 22, paddingBottom: 40 },

  // ── Title ──
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 24 },
  goldBar: { width: 34, height: 3, backgroundColor: C.gold, borderRadius: 2, marginBottom: 10 },
  name: { fontSize: 26, fontWeight: '900', color: C.ink, letterSpacing: -0.8, lineHeight: 32, marginBottom: 4 },
  period: { fontSize: 12, color: C.inkLight, fontStyle: 'italic' },

  saveBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center', marginTop: 6,
  },
  saveBtnActive: { backgroundColor: C.goldSoft, borderColor: C.gold },

  // ── Section ──
  section: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  sectionLabel: { fontSize: 9, fontWeight: '800', color: C.gold, letterSpacing: 3 },

  // ── Language chips ──
  langRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  langChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50,
    backgroundColor: C.goldLight, borderWidth: 1.5, borderColor: C.borderGold,
  },
  langChipActive: { backgroundColor: C.goldSoft, borderColor: C.gold },
  langFlag: { fontSize: 14 },
  langLabel: { fontSize: 12, fontWeight: '700', color: C.inkMid },
  langLabelActive: { color: C.gold },

  // ── Description box ──
  descBox: {
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 10,
  },
  descText: { fontSize: 14.5, color: C.inkMid, lineHeight: 26 },

  // ── Audio player card ──
  playerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.bg,
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 18, padding: 16, marginTop: 10,
  },
  playerCardActive: { borderColor: C.borderGold, backgroundColor: C.goldLight },
  playCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.surface,
    borderWidth: 1.5, borderColor: C.borderGold,
    justifyContent: 'center', alignItems: 'center',
  },
  playCircleActive: { backgroundColor: C.gold, borderColor: C.gold },
  playerLabel: { fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 2 },
  playerSub: { fontSize: 12, color: C.inkLight },
  highlightHint: { fontSize: 10, color: C.gold, fontStyle: 'italic', marginTop: 4 },

  // ── No audio ──
  noAudioBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14, marginTop: 10,
  },
  noAudioText: { flex: 1, fontSize: 13, color: C.inkMid, lineHeight: 20 },

  // ── Tip ──
  tipRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: C.goldLight, borderRadius: 12, padding: 12,
    marginTop: 10, borderWidth: 1, borderColor: C.borderGold,
  },
  tipText: { flex: 1, fontSize: 12, color: C.inkMid, lineHeight: 18 },

  // ── Done button ──
  closeFullBtn: {
    backgroundColor: C.ink, borderRadius: 50,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
    shadowColor: C.ink, shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4,
  },
  closeFullBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
}

// ─── Main QRScanner Component ──────────────────────────────────────────────────
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
    supabase
      .from('artifacts')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => {
        if (count != null && count > 0) setTotalArtifacts(count);
      })
      .catch(() => {});
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

  const reset = () => {
    setArtifact(null);   // closing artifact triggers isActive effect to re-enable camera
    setScanned(false);
    setScanError(null);
    showToast('Ready to scan');
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
      <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.85}>
        <Text style={styles.permBtnTxt}>Grant Permission</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.eyebrow}>✦ SACRED HERITAGE</Text>
            <Text style={styles.title}>QR Scanner</Text>
            <View style={styles.goldLine} />
          </View>
          {/* Scan history badge */}
          {scannedArtifacts.length > 0 && (
            <View style={styles.collectionIconCircle}>
              <Ionicons name="scan-outline" size={20} color={C.gold} />
              <View style={styles.collectionBadge}>
                <Text style={styles.collectionBadgeText}>{scannedArtifacts.length}</Text>
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
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={C.gold} />
              <Text style={styles.statusTxt}>Looking up artifact…</Text>
            </View>
          ) : scanError ? (
            <View style={styles.errorBox}>
              <View style={styles.errorIcon}>
                <Text style={styles.errorIconTxt}>!</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Not Recognised</Text>
                <Text style={styles.errorSub}>{scanError}</Text>
                <Text style={styles.errorAutoReset}>Retrying automatically…</Text>
              </View>
              <TouchableOpacity onPress={startScanning} style={styles.retryBtn} activeOpacity={0.85}>
                <Text style={styles.retryBtnTxt}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : cameraActive && !scanned ? (
            <View style={styles.hintBox}>
              <Text style={styles.hintIco}>◈</Text>
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
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
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