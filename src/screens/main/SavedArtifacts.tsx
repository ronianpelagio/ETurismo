import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Animated,
  ActivityIndicator,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import { STORAGE_KEYS, getStringArray } from '../../utils/storage';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '../../context/ThemeContext';
import { THEMES } from '../../constants/themes';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Design tokens ──────────────────────────────────────────────────────────────
function buildC(t: typeof THEMES.light) {
  return {
    bg: t.bg, surface: t.surface, ink: t.ink, inkMid: t.inkMid, inkLight: t.inkDim, gold: t.gold, goldSoft: t.goldSoft, border: t.border, error: t.crimson, success: t.teal,
  };
}
let C = buildC(THEMES.light);
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
  artifactsList: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
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
  artifactImage: {
    width: '100%',
    height: '100%',
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

  // Modal styles
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
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
    gap: 8,
    flexWrap: 'wrap',
  },
  languageCard: {
    flex: 1,
    minWidth: '45%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(201,168,76,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
  },
  languageCardActive: {
    backgroundColor: C.goldSoft,
    borderColor: C.gold,
  },
  languageText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.inkMid,
    textAlign: 'center',
  },
  languageTextActive: {
    color: C.ink,
  },
  doneBtn: {
    backgroundColor: C.ink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
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

let styles = getStyles(C);

type Artifact = {
  id: string;
  name: string;
  category: string;
  qr_code: string;
  scanned_artifacts: string[];
  qr_value: string;
  created_at: string;
  description?: string;
  description_en?: string;
  image_url?: string;
  audio_en?: string;
  audio_fil?: string;
  audio_ja?: string;
  audio_es?: string;
  audio_ko?: string;
};

const CATEGORY_IMAGES: Record<string, string> = {
  'Vestments':          'https://images.unsplash.com/photo-1582552938356-8b6b14c0e1ee?w=600',
  'Sacred Vessels':     'https://images.unsplash.com/photo-1602351447937-7457d2e0ffc3?w=600',
  'Liturgical Books':   'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
  'Devotional Objects': 'https://images.unsplash.com/photo-1566505237780-6bf6d4c1b84e?w=600',
  'Altar Furnishings':  'https://images.unsplash.com/photo-1601940462811-2c893df9477c?w=600',
  'Sacramentals':       'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=600',
  'Musical Instruments': 'https://images.unsplash.com/photo-1510915361-a1da77b45a6f?w=600',
  'Architectural and Decorative Elements': 'https://images.unsplash.com/photo-1595359910253-6c0e6b8a4440?w=600',
};

// ─── Artifact Detail Modal ─────────────────────────────────────────────────────
function ArtifactDetailModal({
  artifact, onClose,
}: { artifact: Artifact | null; onClose: () => void }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'fil' | 'ja' | 'es' | 'ko'>('en');
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (artifact) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [artifact, fadeAnim, scaleAnim]);

  async function playAudio(lang: string) {
    try {
      if (!artifact) return;
      const langKey = `audio_${lang}` as keyof Artifact;
      const audioUrl = artifact[langKey] as string | undefined;
      
      if (!audioUrl) return;

      await setAudioModeAsync({});
      
      if (playerRef.current) {
        await playerRef.current.release();
      }

      playerRef.current = await createAudioPlayer(audioUrl);
      await playerRef.current.play();
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  }

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  if (!artifact) return null;

  const imgUrl = artifact.image_url ?? CATEGORY_IMAGES[artifact.category] ?? 'https://via.placeholder.com/600?text=Artifact';

  return (
    <Modal visible={!!artifact} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={handleClose} />
        <Animated.View style={[styles.modal, { transform: [{ scale: scaleAnim }] }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
            <View style={styles.closeBtnCircle}>
              <Text style={styles.closeBtnX}>✕</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.imageSection}>
            <Image source={{ uri: imgUrl }} style={styles.image} />
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{artifact.category}</Text>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.goldAccent} />
            <Text style={styles.name}>{artifact.name}</Text>

            {artifact.description_en && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Description</Text>
                <Text style={styles.description}>{artifact.description_en}</Text>
              </View>
            )}

            {/* Audio Section */}
            {(artifact.audio_en || artifact.audio_fil || artifact.audio_ja || artifact.audio_es || artifact.audio_ko) && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Audio Guide</Text>
                <View style={styles.audioGrid}>
                  {artifact.audio_en && (
                    <TouchableOpacity 
                      style={[styles.languageCard, selectedLanguage === 'en' && styles.languageCardActive]}
                      onPress={() => { setSelectedLanguage('en'); playAudio('en'); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.languageText, selectedLanguage === 'en' && styles.languageTextActive]}>🇺🇸 English</Text>
                    </TouchableOpacity>
                  )}
                  {artifact.audio_fil && (
                    <TouchableOpacity 
                      style={[styles.languageCard, selectedLanguage === 'fil' && styles.languageCardActive]}
                      onPress={() => { setSelectedLanguage('fil'); playAudio('fil'); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.languageText, selectedLanguage === 'fil' && styles.languageTextActive]}>🇵🇭 Filipino</Text>
                    </TouchableOpacity>
                  )}
                  {artifact.audio_ja && (
                    <TouchableOpacity 
                      style={[styles.languageCard, selectedLanguage === 'ja' && styles.languageCardActive]}
                      onPress={() => { setSelectedLanguage('ja'); playAudio('ja'); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.languageText, selectedLanguage === 'ja' && styles.languageTextActive]}>🇯🇵 日本語</Text>
                    </TouchableOpacity>
                  )}
                  {artifact.audio_es && (
                    <TouchableOpacity 
                      style={[styles.languageCard, selectedLanguage === 'es' && styles.languageCardActive]}
                      onPress={() => { setSelectedLanguage('es'); playAudio('es'); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.languageText, selectedLanguage === 'es' && styles.languageTextActive]}>🇪🇸 Español</Text>
                    </TouchableOpacity>
                  )}
                  {artifact.audio_ko && (
                    <TouchableOpacity 
                      style={[styles.languageCard, selectedLanguage === 'ko' && styles.languageCardActive]}
                      onPress={() => { setSelectedLanguage('ko'); playAudio('ko'); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.languageText, selectedLanguage === 'ko' && styles.languageTextActive]}>🇰🇷 한국어</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.doneBtn} onPress={handleClose} activeOpacity={0.8}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Main Saved Artifacts Screen ─────────────────────────────────────────────────
export default function SavedArtifacts({ onBack }: { onBack: () => void }) {
  const { theme } = useAppTheme(); C = buildC(theme); styles = getStyles(C);
  const [allArtifacts, setAllArtifacts] = useState<Artifact[]>([]);
  const [savedArtifactIds, setSavedArtifactIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

  useEffect(() => {
    loadSavedArtifacts();
  }, []);

  async function loadSavedArtifacts() {
    setLoading(true);
    try {
      // Get saved artifact IDs from storage
      const saved = await getStringArray(STORAGE_KEYS.savedArtifacts);
      setSavedArtifactIds(saved);

      if (saved.length === 0) {
        setAllArtifacts([]);
        return;
      }

      // Fetch artifacts from Supabase
      const { data, error } = await supabase
        .from('artifacts')
        .select('*')
        .in('id', saved);

      if (error) {
        console.error('Error fetching saved artifacts:', error);
        return;
      }

      setAllArtifacts(data || []);
    } catch (error) {
      console.error('Error loading saved artifacts:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={28} color={C.ink} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.eyebrow}>My Collection</Text>
          <Text style={styles.title}>Saved Artifacts</Text>
          <View style={styles.goldLine} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      ) : allArtifacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bookmark-outline" size={48} color={C.inkLight} />
          <Text style={styles.emptyText}>No saved artifacts yet</Text>
        </View>
      ) : (
        <FlatList
          data={allArtifacts}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.artifactCardUnlocked}
              onPress={() => setSelectedArtifact(item)}
              activeOpacity={0.7}
            >
              <View style={styles.unlockedImageWrapper}>
                <Image source={{ uri: item.image_url || CATEGORY_IMAGES[item.category] }} style={styles.artifactImage} />
              </View>
              <View style={styles.artifactInfoUnlocked}>
                <View>
                  <Text style={styles.artifactNameUnlocked}>{item.name}</Text>
                  <Text style={styles.artifactCategoryUnlocked}>{item.category}</Text>
                </View>
                <View style={styles.viewDetailsRow}>
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={14} color={C.gold} />
                </View>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.artifactsList}
          scrollEnabled={true}
        />
      )}

      <ArtifactDetailModal artifact={selectedArtifact} onClose={() => setSelectedArtifact(null)} />
    </SafeAreaView>
  );
}