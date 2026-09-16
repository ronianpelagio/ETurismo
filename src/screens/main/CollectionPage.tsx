import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Animated,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase';
import { useAppTheme } from '../../context/ThemeContext';
import { THEMES } from '../../constants/themes';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import type { Artifact, ArtifactTranslation } from '../../features/artifacts/types';
import { useAudioWordHighlight } from '../../hooks/useAudioWordHighlight';
import ArtifactAudioPlayer from '../../components/ArtifactAudioPlayer';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Design tokens ─────────────────────────────────────────────────────────────
function buildC(t: typeof THEMES[keyof typeof THEMES]) {
  return {
    bg:       t.bg,
    surface:  t.surface,
    ink:      t.ink,
    inkMid:   t.inkMid,
    inkLight: t.inkDim,
    gold:     t.gold,
    goldSoft: t.goldSoft,
    border:   t.border,
    error:    t.crimson,
  };
}

// Initialise with light theme so module-level references are never undefined
let C    = buildC(THEMES.light);
let ams  = getAmsStyles(buildC(THEMES.light));
let styles = getStyles(buildC(THEMES.light));

// ─── Fallback images by category ──────────────────────────────────────────────
const CATEGORY_IMAGES: Record<string, string> = {
  'Vestments':          'https://images.unsplash.com/photo-1582552938356-8b6b14c0e1ee?w=600',
  'Sacred Vessels':     'https://images.unsplash.com/photo-1602351447937-7457d2e0ffc3?w=600',
  'Liturgical Books':   'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
  'Devotional Objects': 'https://images.unsplash.com/photo-1566505237780-6bf6d4c1b84e?w=600',
  'Altar Furnishings':  'https://images.unsplash.com/photo-1601940462811-2c893df9477c?w=600',
  'Sacramentals':       'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=600',
  'Musical Instruments':'https://images.unsplash.com/photo-1510915361-a1da77b45a6f?w=600',
  'Architectural and Decorative Elements':
                        'https://images.unsplash.com/photo-1595359910253-6c0e6b8a4440?w=600',
};

// ─── Artifact Detail Modal ─────────────────────────────────────────────────────
function ArtifactModal({
  artifact,
  onClose,
}: {
  artifact: Artifact | null;
  onClose: () => void;
}) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.93)).current;

  const [translations, setTranslations]   = useState<ArtifactTranslation[]>([]);
  const [loadingAudio, setLoadingAudio]   = useState(false);
  const [playingUrl, setPlayingUrl]       = useState<string | null>(null);
  const [selectedLang, setSelectedLang]   = useState('en');
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate]   = useState(1);
  const playerRef                         = useRef<any>(null);
  const subRef                            = useRef<any>(null);

  // currentTime polled every 100 ms from the player via the highlight hook
  const curDesc = (translations.find(t => t.language_code === selectedLang)?.description) ?? '';
  const { currentTime, startHighlight, stopHighlight, resetHighlight } =
    useAudioWordHighlight({ text: curDesc, durationSeconds: audioDuration });

  // Open / reset
  useEffect(() => {
    if (artifact) {
      // If the artifact already carries embedded translations (from the fetch), use them
      if (artifact.translations && artifact.translations.length > 0) {
        setTranslations(artifact.translations as ArtifactTranslation[]);
        setSelectedLang(artifact.translations[0].language_code);
        setLoadingAudio(false);
      } else {
        // Fallback: fetch translations separately
        loadTranslations(artifact.id);
      }

      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 10 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();

      setupAudio();
    }
  }, [artifact]);

  // Reset highlight + duration when language changes
  useEffect(() => {
    resetHighlight();
    setAudioDuration(0);
    setPlaybackRate(1);
  }, [selectedLang]);

  // Cleanup on unmount
  useEffect(() => () => { stopAudio(); }, []);

  async function setupAudio() {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
      });
    } catch (_) {}
  }

  async function loadTranslations(artifactId: string) {
    setLoadingAudio(true);
    try {
      const { data, error } = await supabase
        .from('artifact_translations')
        .select('language_code, name, description, audio_url')
        .eq('artifact_id', artifactId);
      if (error) throw error;
      const list = (data ?? []) as ArtifactTranslation[];
      setTranslations(list);
      if (list.length > 0) setSelectedLang(list[0].language_code);
    } catch (_) {
      setTranslations([]);
    } finally {
      setLoadingAudio(false);
    }
  }

  async function playAudio(url: string) {
    try {
      await stopAudio();
      setPlayingUrl(url);
      setPlaybackRate(1);
      const player = createAudioPlayer({ uri: url }) as any;
      playerRef.current = player;
      subRef.current = player.addListener('playbackStatusUpdate', (s: any) => {
        // Grab duration as soon as it becomes available
        const dur = player.duration ?? (s.durationMillis ? s.durationMillis / 1000 : 0);
        if (dur > 0) setAudioDuration(dur);
        if (s.didJustFinish) {
          setPlayingUrl(null);
          stopHighlight();
          subRef.current?.remove();
          subRef.current = null;
          playerRef.current?.remove?.();
          playerRef.current = null;
        }
      });
      player.play();
      startHighlight(player);
    } catch (e: any) {
      console.error('Audio play error:', e.message);
      setPlayingUrl(null);
    }
  }

  async function stopAudio() {
    try {
      if (playerRef.current) {
        await playerRef.current.pause();
        subRef.current?.remove();
        subRef.current = null;
        playerRef.current.remove?.();
        playerRef.current = null;
      }
    } catch (_) {}
    setPlayingUrl(null);
    stopHighlight();
  }

  function handleSeek(seconds: number) {
    try { playerRef.current?.seekTo(seconds); } catch (_) {}
  }

  function handleSkip(delta: number) {
    const next = Math.max(0, Math.min(currentTime + delta, audioDuration - 0.5));
    handleSeek(next);
  }

  function handleRate(rate: number) {
    try { playerRef.current?.setPlaybackRate(rate); } catch (_) {}
    setPlaybackRate(rate);
  }

  const handleClose = () => {
    stopAudio();
    resetHighlight();
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,    duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setTranslations([]);
      setSelectedLang('en');
      onClose();
    });
  };

  if (!artifact) return null;

  const imgUrl =
    artifact.image_url ||
    CATEGORY_IMAGES[artifact.category] ||
    'https://via.placeholder.com/600?text=Artifact';

  const curTranslation = translations.find(t => t.language_code === selectedLang);
  const description    =
    curTranslation?.description ||
    artifact.description ||
    `This ${artifact.category?.toLowerCase() ?? 'artifact'} is part of the Sacred Heritage Collection.`;

  const audioUrl = curTranslation?.audio_url ?? null;

  const availableLangs = translations.length > 0
    ? translations.map(t => t.language_code)
    : ['en'];

  return (
    <Modal
      transparent
      animationType="none"
      visible={!!artifact}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <View style={ams.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: fadeAnim, backgroundColor: 'rgba(26,22,18,0.78)' },
            ]}
          />
        </TouchableOpacity>

        {/* Card */}
        <Animated.View
          style={[ams.modal, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
        >
          {/* Close */}
          <TouchableOpacity style={ams.closeBtn} onPress={handleClose} activeOpacity={0.7}>
            <View style={ams.closeBtnCircle}>
              <Ionicons name="close" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

            {/* ── Hero Image ── */}
            <View style={ams.imageSection}>
              <Image
                source={{ uri: imgUrl }}
                style={ams.image}
                resizeMode="contain"
              />
              <View style={ams.categoryPill}>
                <Text style={ams.categoryPillText}>{artifact.category?.toUpperCase()}</Text>
              </View>
            </View>

            {/* ── Content ── */}
            <View style={ams.content}>
              <View style={ams.goldAccent} />

              <Text style={ams.name}>{artifact.name}</Text>

              {artifact.creator ? (
                <Text style={ams.creator}>By {artifact.creator}</Text>
              ) : null}

              {/* Description */}
              <View style={ams.section}>
                <Text style={ams.sectionLabel}>ABOUT THIS PIECE</Text>
                <Text style={ams.description}>{description}</Text>
              </View>

              {/* Historical Significance */}
              {artifact.Historical_Significance ? (
                <View style={ams.section}>
                  <Text style={ams.sectionLabel}>HISTORICAL SIGNIFICANCE</Text>
                  <Text style={ams.description}>{artifact.Historical_Significance}</Text>
                </View>
              ) : null}

              {/* ── Language selector ── */}
              {availableLangs.length > 1 && (
                <View style={ams.langRow}>
                  <Text style={ams.langLabel}>LANGUAGE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={ams.langList}>
                      {availableLangs.map(lang => (
                        <TouchableOpacity
                          key={lang}
                          style={[ams.langBtn, selectedLang === lang && ams.langBtnActive]}
                          onPress={() => { setSelectedLang(lang); stopAudio(); }}
                          activeOpacity={0.75}
                        >
                          <Text style={[ams.langBtnText, selectedLang === lang && ams.langBtnTextActive]}>
                            {lang.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* ── Audio Guide ── */}
              <View style={ams.audioCard}>
                <View style={ams.audioHeader}>
                  <Ionicons name="headset-outline" size={16} color={C.gold} />
                  <Text style={ams.audioLabel}>AUDIO GUIDE</Text>
                </View>

                {loadingAudio ? (
                  <View style={ams.audioRow}>
                    <ActivityIndicator size="small" color={C.gold} />
                    <Text style={ams.audioMeta}>Loading…</Text>
                  </View>
                ) : audioUrl ? (
                  <ArtifactAudioPlayer
                    audioUrl={audioUrl}
                    imageUrl={imgUrl}
                    trackLabel={`${selectedLang.toUpperCase()} narration`}
                    isPlaying={playingUrl === audioUrl}
                    currentTime={currentTime}
                    duration={audioDuration}
                    playbackRate={playbackRate}
                    onPlay={() => playAudio(audioUrl)}
                    onPause={stopAudio}
                    onSeek={handleSeek}
                    onSkip={handleSkip}
                    onRateChange={handleRate}
                    C={C}
                  />
                ) : (
                  <View style={ams.audioRow}>
                    <Ionicons name="volume-mute-outline" size={18} color={C.inkLight} />
                    <Text style={ams.audioMeta}>No audio available for this language</Text>
                  </View>
                )}
              </View>

              {/* Close button */}
              <TouchableOpacity style={ams.doneBtn} onPress={handleClose} activeOpacity={0.85}>
                <Text style={ams.doneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Main Collection Page ──────────────────────────────────────────────────────
export default function CollectionPage({ onBack }: { onBack: () => void }) {
  const { theme } = useAppTheme();
  C      = buildC(theme);
  ams    = getAmsStyles(C);
  styles = getStyles(C);

  const [allArtifacts, setAllArtifacts]           = useState<Artifact[]>([]);
  const [scannedArtifactIds, setScannedArtifactIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory]   = useState<string | null>(null);
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact]   = useState<Artifact | null>(null);

  // Fetch artifacts + scanned IDs
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setError(null);

        // Use the same explicit-column + embedded-translations pattern as Home.tsx
        const { data, error: fetchError } = await supabase
          .from('artifacts')
          .select(
            'id, name, category, qr_code, qr_value, created_at, description, image_url, creator, Historical_Significance, artifact_translations(language_code, name, description, audio_url)'
          )
          .order('category', { ascending: true });

        if (fetchError) throw fetchError;

        if (mounted) {
          // Map the Supabase response to our Artifact type, renaming the
          // nested key from 'artifact_translations' → 'translations'
          const mapped: Artifact[] = (data ?? []).map((row: any) => ({
            ...row,
            translations: row.artifact_translations ?? [],
          }));
          setAllArtifacts(mapped);
        }

        // Load scanned artifact IDs from AsyncStorage
        const stored = await AsyncStorage.getItem('scannedArtifacts');
        if (stored && mounted) {
          const parsed = JSON.parse(stored);
          setScannedArtifactIds(parsed.map((a: { id: string }) => a.id));
        }
      } catch (err: any) {
        console.error('CollectionPage fetch error:', err);
        if (mounted) setError(err?.message ?? 'Failed to load artifacts.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Derive categories from real data so the filter is always accurate
  const allCategories = [...new Set(allArtifacts.map(a => a.category))].sort();

  const filteredArtifacts = selectedCategory
    ? allArtifacts.filter(a => a.category === selectedCategory)
    : allArtifacts;

  const isScanned = (id: string) => scannedArtifactIds.includes(id);

  // ── Locked card ──
  const renderLocked = (artifact: Artifact) => {
    const img = artifact.image_url || CATEGORY_IMAGES[artifact.category] || '';
    return (
      <View style={styles.cardLocked}>
        <View style={styles.cardThumb}>
          <Image source={{ uri: img }} style={[styles.thumbImg, styles.thumbImgGray]} resizeMode="cover" />
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={22} color="#FFF" />
          </View>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={2}>{artifact.name}</Text>
          <Text style={styles.cardCategory}>{artifact.category}</Text>
          <Text style={styles.cardLock}>Scan QR to unlock</Text>
        </View>
      </View>
    );
  };

  // ── Unlocked card ──
  const renderUnlocked = (artifact: Artifact) => {
    const img = artifact.image_url || CATEGORY_IMAGES[artifact.category] || '';
    return (
      <TouchableOpacity
        style={styles.cardUnlocked}
        onPress={() => setSelectedArtifact(artifact)}
        activeOpacity={0.75}
      >
        <View style={styles.cardThumb}>
          <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="cover" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={2}>{artifact.name}</Text>
          <Text style={[styles.cardCategory, { color: C.gold }]}>{artifact.category}</Text>
          <View style={styles.viewRow}>
            <Text style={styles.viewText}>View details</Text>
            <Ionicons name="chevron-forward" size={14} color={C.gold} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Loading ──
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={C.inkLight} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setLoading(true); setError(null); }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>— Collection</Text>
          <Text style={styles.title}>My Artifacts</Text>
          <View style={styles.goldLine} />
        </View>
        <Text style={styles.countBadge}>
          {scannedArtifactIds.length}/{allArtifacts.length}
        </Text>
      </View>

      {/* ── Category pills ── */}
      <View style={styles.categorySection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          <TouchableOpacity
            style={[styles.pill, selectedCategory === null && styles.pillActive]}
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, selectedCategory === null && styles.pillTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {allCategories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.pill, selectedCategory === cat && styles.pillActive]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.pillText, selectedCategory === cat && styles.pillTextActive]}
                numberOfLines={1}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── List ── */}
      {filteredArtifacts.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="library-outline" size={48} color={C.inkLight} />
          <Text style={styles.emptyText}>No artifacts in this category</Text>
        </View>
      ) : (
        <FlatList
          data={filteredArtifacts}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) =>
            isScanned(item.id) ? renderUnlocked(item) : renderLocked(item)
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Modal ── */}
      <ArtifactModal
        artifact={selectedArtifact}
        onClose={() => setSelectedArtifact(null)}
      />
    </SafeAreaView>
  );
}

// ─── Modal styles ──────────────────────────────────────────────────────────────
function getAmsStyles(C: ReturnType<typeof buildC>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modal: {
      width: '100%',
      maxWidth: 440,
      maxHeight: SCREEN_HEIGHT * 0.88,
      backgroundColor: C.surface,
      borderRadius: 24,
      shadowColor: '#000',
      shadowOpacity: 0.32,
      shadowOffset: { width: 0, height: 14 },
      shadowRadius: 28,
      elevation: 18,
    },
    closeBtn: {
      position: 'absolute',
      top: 14,
      right: 14,
      zIndex: 20,
    },
    closeBtnCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(26,22,18,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    // ── Hero image ──
    imageSection: {
      width: '100%',
      height: SCREEN_HEIGHT * 0.28,
      backgroundColor: '#000',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    categoryPill: {
      position: 'absolute',
      bottom: 14,
      left: 18,
      backgroundColor: 'rgba(26,22,18,0.82)',
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 20,
    },
    categoryPillText: {
      fontSize: 9,
      letterSpacing: 2.2,
      color: C.gold,
      fontWeight: '800',
    },
    // ── Content ──
    content: {
      padding: 24,
    },
    goldAccent: {
      width: 36,
      height: 3,
      backgroundColor: C.gold,
      borderRadius: 2,
      marginBottom: 14,
    },
    name: {
      fontSize: 24,
      fontWeight: '900',
      color: C.ink,
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    creator: {
      fontSize: 13,
      color: C.inkMid,
      fontStyle: 'italic',
      marginBottom: 20,
    },
    section: {
      marginBottom: 22,
    },
    sectionLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: C.gold,
      letterSpacing: 2.5,
      marginBottom: 8,
    },
    description: {
      fontSize: 14,
      color: C.inkMid,
      lineHeight: 22,
    },
    // ── Language ──
    langRow: {
      marginBottom: 16,
    },
    langLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: C.gold,
      letterSpacing: 2.5,
      marginBottom: 10,
    },
    langList: {
      flexDirection: 'row',
      gap: 8,
    },
    langBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: C.goldSoft,
      borderWidth: 1,
      borderColor: C.border,
    },
    langBtnActive: {
      backgroundColor: C.gold,
      borderColor: C.gold,
    },
    langBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: C.inkMid,
    },
    langBtnTextActive: {
      color: '#FFF',
    },
    // ── Audio ──
    audioCard: {
      backgroundColor: C.bg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
      marginBottom: 22,
    },
    audioHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
    },
    audioLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: C.gold,
      letterSpacing: 2,
    },
    audioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    audioMeta: {
      fontSize: 13,
      color: C.inkMid,
    },
    // ── Done ──
    doneBtn: {
      backgroundColor: C.ink,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: C.ink,
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 4,
    },
    doneBtnText: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
  });
}

// ─── Page styles ───────────────────────────────────────────────────────────────
function getStyles(C: ReturnType<typeof buildC>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    backBtn: { padding: 8, marginRight: 10 },
    eyebrow: { fontSize: 10, letterSpacing: 2.5, color: C.inkMid, marginBottom: 2 },
    title: { fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.5, marginBottom: 6 },
    goldLine: { width: 30, height: 3, backgroundColor: C.gold, borderRadius: 2 },
    countBadge: {
      fontSize: 12, fontWeight: '700', color: C.gold,
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 12, backgroundColor: C.goldSoft,
      borderWidth: 1, borderColor: C.border,
    },

    // Category pills
    categorySection: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    categoryList: { paddingHorizontal: 20, gap: 8 },
    pill: {
      paddingHorizontal: 16, paddingVertical: 7,
      borderRadius: 20, backgroundColor: C.surface,
      borderWidth: 1, borderColor: C.border,
    },
    pillActive: { backgroundColor: C.gold, borderColor: C.gold },
    pillText: { fontSize: 12, fontWeight: '600', color: C.inkMid },
    pillTextActive: { color: '#FFF' },

    // List
    list: { paddingHorizontal: 20, paddingVertical: 14, gap: 10 },

    // Shared card thumb
    cardThumb: { width: 96, height: 96, overflow: 'hidden' },
    thumbImg: { width: '100%', height: '100%' },
    thumbImgGray: { opacity: 0.45 },

    // Locked card
    cardLocked: {
      flexDirection: 'row',
      backgroundColor: C.surface,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: C.border,
      opacity: 0.65,
    },
    lockOverlay: {
      position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
      justifyContent: 'center', alignItems: 'center',
      backgroundColor: 'rgba(20,16,12,0.35)',
    },

    // Unlocked card
    cardUnlocked: {
      flexDirection: 'row',
      backgroundColor: C.surface,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: C.border,
      shadowColor: '#000',
      shadowOpacity: 0.07,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 2,
    },

    // Card info
    cardInfo: { flex: 1, padding: 12, justifyContent: 'center', gap: 4 },
    cardName: { fontSize: 14, fontWeight: '700', color: C.ink },
    cardCategory: { fontSize: 12, color: C.inkMid, fontWeight: '500' },
    cardLock: { fontSize: 11, color: C.error, fontWeight: '500', fontStyle: 'italic' },
    viewRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
    viewText: { fontSize: 11, color: C.gold, fontWeight: '600' },

    // Empty / error
    emptyText: { fontSize: 15, fontWeight: '600', color: C.inkMid, marginTop: 12, textAlign: 'center' },
    errorText: { fontSize: 14, color: C.error, marginTop: 12, textAlign: 'center', lineHeight: 20 },
    retryBtn: {
      marginTop: 16, backgroundColor: C.gold,
      paddingHorizontal: 28, paddingVertical: 10, borderRadius: 20,
    },
    retryText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  });
}
