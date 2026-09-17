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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Design tokens ──────────────────────────────────────────────────────────────
function buildC(t: typeof THEMES[keyof typeof THEMES]) {
  return {
    bg: t.bg, surface: t.surface, ink: t.ink, inkMid: t.inkMid, inkLight: t.inkDim, gold: t.gold, goldSoft: t.goldSoft, border: t.border, error: t.crimson, success: t.teal,
  };
}
let C = buildC(THEMES.light);
let ams: ReturnType<typeof getAmsStyles>;
function getStyles(C: ReturnType<typeof buildC>) { return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2.5,
    color: C.inkMid,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  goldLine: {
    width: 32,
    height: 3,
    backgroundColor: C.gold,
    borderRadius: 2,
  },

  // ── Category Filter ──
  categorySection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  categoryList: {
    paddingHorizontal: 24,
    gap: 10,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryPillActive: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkMid,
  },
  categoryPillTextActive: {
    color: C.surface,
  },

  // ── Artifacts List ──
  artifactsList: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },

  // ── Locked Artifact Card ──
  artifactCardLocked: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    opacity: 0.6,
  },
  lockedImageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  grayscaleImage: {
    opacity: 0.5,
  },
  lockOverlay: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26,22,18,0.3)',
  },
  artifactImage: {
    width: '100%',
    height: '100%',
  },
  artifactInfoLocked: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  artifactNameLocked: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 4,
  },
  artifactCategoryLocked: {
    fontSize: 12,
    color: C.inkLight,
    marginBottom: 6,
  },
  lockedText: {
    fontSize: 11,
    color: C.error,
    fontWeight: '500',
    fontStyle: 'italic',
  },

  // ── Unlocked Artifact Card ──
  artifactCardUnlocked: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  unlockedImageWrapper: {
    width: 100,
    height: 100,
    overflow: 'hidden',
  },
  artifactInfoUnlocked: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  artifactNameUnlocked: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 4,
  },
  artifactCategoryUnlocked: {
    fontSize: 12,
    color: C.gold,
    fontWeight: '500',
    marginBottom: 8,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 11,
    color: C.gold,
    fontWeight: '600',
  },

  // ── Empty State ──
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.inkMid,
    marginTop: 12,
    textAlign: 'center',
  },
});
}

let styles = getStyles(C);

type ArtifactTranslation = {
  id: string;
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

type AudioGuide = {
  id: string;
  artifact_id: string;
  audio_url: string;
  created_at: string;
};

const CATEGORY_IMAGES: Record<string, string> = {
  'Vestments':          'https://images.unsplash.com/photo-1582552938356-8b6b14c0e1ee?w=600',
  'Sacred Vessels':     'https://images.unsplash.com/photo-1602351447937-7457d2e0ffc3?w=600',
  'Devotional Objects': 'https://images.unsplash.com/photo-1566505237780-6bf6d4c1b84e?w=600',
  'Altar Furnishings':  'https://images.unsplash.com/photo-1601940462811-2c893df9477c?w=600',
  'Sacramentals':       'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=600',
};

// ─── Artifact Detail Modal ─────────────────────────────────────────────────────
function ArtifactModal({
  artifact, onClose, onNext,
}: { artifact: Artifact | null; onClose: () => void; onNext?: () => void }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const [audioGuides, setAudioGuides] = useState<AudioGuide[]>([]);
  const [translations, setTranslations] = useState<ArtifactTranslation[]>([]);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const playerRef = useRef<any>(null);
  const playbackSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (artifact) {
      setupAudioModal();
      fetchAudioGuides(artifact.id);
      
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 10 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [artifact]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  async function setupAudioModal() {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers'
      });
    } catch (e: any) {
      console.error('Error setting audio mode:', e.message);
    }
  }

  async function fetchAudioGuides(artifactId: string) {
    setLoadingAudio(true);
    try {
      const [{ data: guides, error: guidesErr }, { data: trans, error: transErr }] = await Promise.all([
        supabase.from('audio_guides').select('id, artifact_id, audio_url, created_at').eq('artifact_id', artifactId),
        supabase.from('artifact_translations').select('id, language_code, name, description, audio_url').eq('artifact_id', artifactId),
      ]);
      if (guidesErr) throw guidesErr;
      if (transErr) throw transErr;
      setAudioGuides(guides || []);
      setTranslations(trans || []);
      if (trans && trans.length > 0) setSelectedLanguage(trans[0].language_code);
    } catch (e: any) {
      console.error('Error fetching audio guides:', e.message);
      setAudioGuides([]);
      setTranslations([]);
    } finally {
      setLoadingAudio(false);
    }
  }

  function getDescriptionByLanguage(lang: string): string {
    const t = translations.find(t => t.language_code === lang);
    return t?.description || artifact?.description || `This ${artifact?.category?.toLowerCase()} is part of the Sacred Heritage Collection.`;
  }

  async function playAudio(audioUrl: string) {
    try {
      await stopAudio();
      setPlayingAudioId(audioUrl);
      
      const player = createAudioPlayer({ uri: audioUrl }) as any;
      playerRef.current = player;

      const subscription = player.addListener('playbackStatusUpdate', (status: any) => {
        if (status.didJustFinish) handleAudioFinished();
      });
      playbackSubscriptionRef.current = subscription;
      player.play();
    } catch (e: any) {
      console.error('Error playing audio:', e.message);
      setPlayingAudioId(null);
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
      setPlayingAudioId(null);
    } catch (e: any) {
      console.error('Error stopping audio:', e.message);
    }
  }

  function handleAudioFinished() {
    setPlayingAudioId(null);
    playbackSubscriptionRef.current?.remove();
    playbackSubscriptionRef.current = null;
    playerRef.current?.remove?.();
    playerRef.current = null;
  }

  const handleClose = () => {
    stopAudio();
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setAudioGuides([]);
      setTranslations([]);
      setSelectedLanguage('en');
      onClose();
    });
  };

  if (!artifact) return null;

  const imgUrl = artifact.image_url ?? CATEGORY_IMAGES[artifact.category]
    ?? 'https://via.placeholder.com/600?text=Artifact';

  return (
    <Modal
      transparent
      animationType="none"
      visible={!!artifact}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={ams.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim, backgroundColor: 'rgba(26,22,18,0.75)' }]} />
        </TouchableOpacity>

        <Animated.View style={[
          ams.modal,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
          {/* Close button */}
          <TouchableOpacity style={ams.closeBtn} onPress={handleClose} activeOpacity={0.7}>
            <View style={ams.closeBtnCircle}>
              <Text style={ams.closeBtnX}>✕</Text>
            </View>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Image Section */}
            <View style={ams.imageSection}>
              <Image source={{ uri: imgUrl }} style={ams.image} resizeMode="cover" />
              <View style={ams.categoryPill}>
                <Text style={ams.categoryPillText}>{artifact.category}</Text>
              </View>
            </View>

            {/* Content Section */}
            <View style={ams.content}>
              <View style={ams.goldAccent} />
              <Text style={ams.name}>{artifact.name}</Text>
              <Text style={ams.period}>
                Circa {new Date(artifact.created_at).getFullYear()}
              </Text>

              <View style={ams.section}>
                <Text style={ams.sectionLabel}>About this artifact</Text>
                <Text style={ams.description}>
                  {getDescriptionByLanguage(selectedLanguage)}
                </Text>
              </View>

              {/* Audio Guide Section */}
              <View style={ams.audioGrid}>
                <View style={[ams.metaCard, ams.audioCard]}>
                  <View style={ams.audioHeader}>
                    <Ionicons name="volume-high-outline" size={20} color={C.gold} />
                    <Text style={ams.audioLabel}>Audio Guide</Text>
                  </View>
                  
                  {loadingAudio ? (
                    <View style={ams.audioLoading}>
                      <ActivityIndicator size="small" color={C.gold} />
                      <Text style={ams.audioLoadingText}>Loading…</Text>
                    </View>
                  ) : (() => {
                    // Get audio URL: prefer translation audio, fallback to generic audio_guide
                    const curTranslation = translations.find(t => t.language_code === selectedLanguage);
                    const audioUrl = curTranslation?.audio_url || audioGuides[0]?.audio_url || null;
                    return audioUrl ? (
                      <TouchableOpacity
                        style={ams.audioPlayButton}
                        onPress={() => playingAudioId === audioUrl ? stopAudio() : playAudio(audioUrl)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={playingAudioId === audioUrl ? 'pause' : 'play'} size={20} color={C.gold} />
                        <Text style={ams.audioPlayText}>{playingAudioId === audioUrl ? 'Pause' : 'Play'}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={ams.noAudio}>
                        <Ionicons name="volume-mute-outline" size={20} color={C.inkLight} />
                        <Text style={ams.noAudioText}>No audio</Text>
                      </View>
                    );
                  })()}
                </View>

                <View style={[ams.metaCard, ams.languageCard]}>
                  <Text style={ams.metaLabel}>Language</Text>
                  <FlatList
                    data={translations.length > 0 ? translations.map(t => t.language_code) : ['en']}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item}
                    contentContainerStyle={ams.languageList}
                    renderItem={({ item: lang }) => (
                      <TouchableOpacity
                        style={[ams.languageButton, selectedLanguage === lang && ams.languageButtonActive]}
                        onPress={() => { setSelectedLanguage(lang); stopAudio(); }}
                      >
                        <Text style={[ams.languageButtonText, selectedLanguage === lang && ams.languageButtonTextActive]}>
                          {lang.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>

              <TouchableOpacity style={ams.doneBtn} onPress={handleClose} activeOpacity={0.85}>
                <Text style={ams.doneBtnText}>Close</Text>
              </TouchableOpacity>
              {onNext && (
                <TouchableOpacity
                  onPress={() => { stopAudio(); onNext(); }}
                  activeOpacity={0.85}
                  style={[ams.doneBtn, { marginTop: 10, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.border }]}
                >
                  <Ionicons name="arrow-forward" size={16} color={C.gold} />
                  <Text style={[ams.doneBtnText, { color: C.gold }]}>Next Artifact</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function getAmsStyles(C: ReturnType<typeof buildC>) { return StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    maxHeight: SCREEN_HEIGHT * 0.8,
    backgroundColor: C.surface,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  closeBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(26,22,18,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnX: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imageSection: {
    width: '100%',
    height: 240,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryPill: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    backgroundColor: 'rgba(26,22,18,0.8)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 10,
    letterSpacing: 2,
    color: C.gold,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  content: {
    padding: 24,
  },
  goldAccent: {
    width: 40,
    height: 3,
    backgroundColor: C.gold,
    borderRadius: 2,
    marginBottom: 16,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  period: {
    fontSize: 13,
    color: C.inkLight,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: C.inkMid,
    lineHeight: 24,
  },
  audioGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metaCard: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  audioCard: {
    flex: 2,
  },
  languageCard: {
    flex: 1,
  },
  audioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  audioLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  audioLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioLoadingText: {
    fontSize: 13,
    color: C.inkMid,
    fontWeight: '500',
  },
  audioPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  audioPlayText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.gold,
  },
  noAudio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    opacity: 0.6,
  },
  noAudioText: {
    fontSize: 13,
    color: C.inkMid,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  languageList: {
    gap: 8,
  },
  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(201,168,76,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
  },
  languageButtonActive: {
    backgroundColor: C.goldSoft,
    borderColor: C.gold,
  },
  languageButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.inkMid,
    textAlign: 'center',
  },
  languageButtonTextActive: {
    color: C.ink,
  },
  doneBtn: {
    backgroundColor: C.ink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: C.ink,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
}

// ─── Main Collection Page Component ─────────────────────────────────────────────
export default function CollectionPage({ onBack }: { onBack: () => void }) {
  const { theme } = useAppTheme(); C = buildC(theme); ams = getAmsStyles(C); styles = getStyles(C);

  const [allArtifacts, setAllArtifacts]       = useState<Artifact[]>([]);
  const [scannedArtifactIds, setScannedArtifactIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [fetchError, setFetchError]           = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

  const allCategories = ['Sacred Vessels', 'Vestments', 'Altar Furnishings', 'Devotional Objects', 'Sacramentals'];

  const fetchData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [artifactsResult, storedRaw] = await Promise.all([
        supabase.from('artifacts').select('*').order('category', { ascending: true }),
        AsyncStorage.getItem('scannedArtifacts').catch(() => null),
      ]);

      if (artifactsResult.error) throw artifactsResult.error;
      setAllArtifacts(artifactsResult.data || []);

      if (storedRaw) {
        try { setScannedArtifactIds(JSON.parse(storedRaw).map((a: Artifact) => a.id)); } catch (_) {}
      }
    } catch (error: any) {
      console.error('CollectionPage fetch error:', error);
      setFetchError(error?.message ?? 'Failed to load artifacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredArtifacts = selectedCategory
    ? allArtifacts.filter(a => a.category === selectedCategory)
    : allArtifacts;

  const isScanned = (id: string) => scannedArtifactIds.includes(id);

  // Navigate to the next artifact in the filtered list
  const goToNextArtifact = () => {
    if (!selectedArtifact) return;
    const idx = filteredArtifacts.findIndex(a => a.id === selectedArtifact.id);
    const next = filteredArtifacts[idx + 1];
    if (next) setSelectedArtifact(next);
  };

  const hasNext = selectedArtifact
    ? filteredArtifacts.findIndex(a => a.id === selectedArtifact.id) < filteredArtifacts.length - 1
    : false;

  const renderLockedArtifact = (artifact: Artifact) => {
    const imgUrl = artifact.image_url ?? CATEGORY_IMAGES[artifact.category] ?? 'https://via.placeholder.com/100?text=Artifact';
    return (
      <View style={styles.artifactCardLocked}>
        <View style={styles.lockedImageWrapper}>
          <Image source={{ uri: imgUrl }} style={[styles.artifactImage, styles.grayscaleImage]} resizeMode="cover" />
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={24} color={C.surface} />
          </View>
        </View>
        <View style={styles.artifactInfoLocked}>
          <Text style={styles.artifactNameLocked} numberOfLines={2}>{artifact.name}</Text>
          <Text style={styles.artifactCategoryLocked}>{artifact.category}</Text>
          <Text style={styles.lockedText}>Scan to unlock</Text>
        </View>
      </View>
    );
  };

  const renderUnlockedArtifact = (artifact: Artifact) => {
    const imgUrl = artifact.image_url ?? CATEGORY_IMAGES[artifact.category] ?? 'https://via.placeholder.com/100?text=Artifact';
    return (
      <TouchableOpacity style={styles.artifactCardUnlocked} onPress={() => setSelectedArtifact(artifact)} activeOpacity={0.7}>
        <View style={styles.unlockedImageWrapper}>
          <Image source={{ uri: imgUrl }} style={styles.artifactImage} resizeMode="cover" />
        </View>
        <View style={styles.artifactInfoUnlocked}>
          <Text style={styles.artifactNameUnlocked} numberOfLines={2}>{artifact.name}</Text>
          <Text style={styles.artifactCategoryUnlocked}>{artifact.category}</Text>
          <View style={styles.viewDetailsRow}>
            <Text style={styles.viewDetailsText}>View details</Text>
            <Ionicons name="chevron-forward" size={16} color={C.gold} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      </SafeAreaView>
    );
  }

  if (fetchError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.eyebrow}>— Collection</Text>
            <Text style={styles.title}>My Artifacts</Text>
            <View style={styles.goldLine} />
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={C.inkLight} />
          <Text style={styles.emptyText}>{fetchError}</Text>
          <TouchableOpacity
            onPress={fetchData}
            activeOpacity={0.8}
            style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: C.ink, borderRadius: 50 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.eyebrow}>— Collection</Text>
          <Text style={styles.title}>My Artifacts</Text>
          <View style={styles.goldLine} />
        </View>
        <Text style={{ fontSize: 12, color: C.inkLight, marginLeft: 8 }}>
          {scannedArtifactIds.length}/{allArtifacts.length}
        </Text>
      </View>

      {/* Category Filter */}
      <View style={styles.categorySection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          <TouchableOpacity
            style={[styles.categoryPill, selectedCategory === null && styles.categoryPillActive]}
            onPress={() => setSelectedCategory(null)} activeOpacity={0.7}
          >
            <Text style={[styles.categoryPillText, selectedCategory === null && styles.categoryPillTextActive]}>All</Text>
          </TouchableOpacity>
          {allCategories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(cat)} activeOpacity={0.7}
            >
              <Text style={[styles.categoryPillText, selectedCategory === cat && styles.categoryPillTextActive]} numberOfLines={1}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {filteredArtifacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="library-outline" size={48} color={C.inkLight} />
          <Text style={styles.emptyText}>No artifacts in this category</Text>
        </View>
      ) : (
        <FlatList
          data={filteredArtifacts}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.artifactsList}
          renderItem={({ item }) => isScanned(item.id) ? renderUnlockedArtifact(item) : renderLockedArtifact(item)}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        />
      )}

      {/* Next button bar — same position as QRScanner photo fallback button */}
      {filteredArtifacts.some(a => isScanned(a.id)) && (
        <View style={{ paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border }}>
          <TouchableOpacity
            onPress={() => {
              const nextUnlocked = filteredArtifacts.find(a => isScanned(a.id));
              if (nextUnlocked) setSelectedArtifact(nextUnlocked);
            }}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
              borderWidth: 1.5, borderColor: C.border, borderRadius: 50, paddingVertical: 13,
              backgroundColor: C.surface,
            }}
          >
            <Ionicons name="arrow-forward-circle-outline" size={18} color={C.gold} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.gold }}>View Next Artifact</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Artifact Detail Modal */}
      <ArtifactModal
        artifact={selectedArtifact}
        onClose={() => setSelectedArtifact(null)}
        onNext={hasNext ? goToNextArtifact : undefined}
      />
    </SafeAreaView>
  );
}
