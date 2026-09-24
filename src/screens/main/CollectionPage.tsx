import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
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

  useEffect(()=>{ if(!artifact) return; setLanguage('en'); setTranslations([]); setLoading(true); (async()=>{
    try { await setAudioModeAsync({allowsRecording:false,playsInSilentMode:true,shouldPlayInBackground:false,interruptionMode:'duckOthers'}); const {data}=await supabase.from('artifact_translations').select('language_code,name,description,audio_url').eq('artifact_id',artifact.id); setTranslations(data||[]); const first=(data||[]).find((x:any)=>x.language_code==='en') || data?.[0]; if(first) setLanguage(first.language_code); } finally { setLoading(false); }
  })(); return()=>{ try{player.current?.pause?.();player.current?.remove?.();}catch{} player.current=null; }; },[artifact]);

  if(!artifact) return null;
  const tr=translations.find(t=>t.language_code===language);
  const description=tr?.description || artifact.description || 'No description available.';
  const audio=tr?.audio_url || null;
  const available=translations.filter(t=>t.description||t.audio_url);
  const stop=()=>{ try{player.current?.pause?.();player.current?.remove?.();}catch{} player.current=null; setPlaying(false); };
  const toggleAudio=()=>{ if(playing){stop();return;} if(!audio)return; stop(); const p=createAudioPlayer({uri:audio}) as any; player.current=p; setPlaying(true); p.addListener?.('playbackStatusUpdate',(s:any)=>{if(s.didJustFinish)stop();}); p.play(); };

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
  </Modal>;
}

function Card({item,scanned,favorite,onPress,onFavorite}:{item:Artifact;scanned:boolean;favorite:boolean;onPress:()=>void;onFavorite:()=>void}){
 return <TouchableOpacity style={[c.card,!scanned&&c.locked]} onPress={scanned?onPress:undefined} activeOpacity={scanned ? 0.82 : 1}>
  <View style={c.imageWrap}><Image source={{uri:item.image_url||FALLBACK}} style={[c.image,!scanned&&{opacity:.35}]}/>{!scanned&&<View style={c.lock}><Ionicons name="lock-closed" size={20} color="#fff"/></View>}{scanned&&<TouchableOpacity style={c.heart} onPress={onFavorite}><Ionicons name={favorite?'heart':'heart-outline'} size={18} color={favorite?'#E25A5A':'#fff'}/></TouchableOpacity>}</View>
  <View style={c.info}><Text style={c.category} numberOfLines={1}>{item.category}</Text><Text style={c.title} numberOfLines={2}>{item.name}</Text><View style={c.footer}><Text style={c.status}>{scanned?'Discovered':'Scan to unlock'}</Text>{scanned&&<Ionicons name="arrow-forward" size={14} color={GOLD}/>}</View></View>
 </TouchableOpacity>
}

export default function CollectionPage({onBack}:{onBack:()=>void}){
 const {theme}=useAppTheme();
 const [items,setItems]=useState<Artifact[]>([]),[scanned,setScanned]=useState<string[]>([]),[favorites,setFavorites]=useState<string[]>([]);
 const [category,setCategory]=useState<string|null>(null),[selected,setSelected]=useState<Artifact|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{const {data,error:e}=await supabase.from('artifacts').select('id,name,category,qr_code,qr_value,created_at,description,image_url,creator,date').order('name');if(e)throw e;setItems(data||[]);const raw=await AsyncStorage.getItem('scannedArtifacts');if(raw){try{const parsed=JSON.parse(raw);setScanned(parsed.map((x:any)=>typeof x==='string'?x:x.id).filter(Boolean));}catch{setScanned([])}}setFavorites(await getStringArray(STORAGE_KEYS.favoriteArtifacts));}catch(e:any){setError(e?.message||'Could not load collection.')}finally{setLoading(false)}},[]);
 useEffect(()=>{load()},[load]);
 const shown=useMemo(()=>category?items.filter(x=>x.category===category):items,[items,category]);
 const discovered=new Set(scanned);
 const discoveredCount=items.filter(x=>discovered.has(x.id)).length;
 const toggleFavorite=async(id:string)=>setFavorites(await toggleInStringArray(STORAGE_KEYS.favoriteArtifacts,id));
 if(loading)return <SafeAreaView style={[s.root,{backgroundColor:theme.bg}]}><View style={s.center}><ActivityIndicator size="large" color={GOLD}/><Text style={s.muted}>Loading your collection…</Text></View></SafeAreaView>;
 return <SafeAreaView style={[s.root,{backgroundColor:theme.bg}]} edges={['top']}><StatusBar style="dark"/>
  <View style={s.header}><TouchableOpacity style={s.back} onPress={onBack}><Ionicons name="chevron-back" size={23} color={INK}/></TouchableOpacity><View style={{flex:1}}><Text style={s.eyebrow}>YOUR JOURNEY</Text><Text style={s.heading}>Collection</Text></View><View style={s.counter}><Text style={s.counterBig}>{discoveredCount}</Text><Text style={s.counterSmall}>/{items.length}</Text></View></View>
  <View style={s.summary}><View style={{flex:1}}><Text style={s.summaryTitle}>Sacred discoveries</Text><Text style={s.summarySub}>{discoveredCount===items.length&&items.length>0?'Collection complete':`${Math.max(items.length-discoveredCount,0)} artifacts waiting to be discovered`}</Text></View><Ionicons name="sparkles-outline" size={24} color={GOLD}/></View>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{[null,...CATEGORIES].map(x=><TouchableOpacity key={x||'all'} onPress={()=>setCategory(x)} style={[s.filter,category===x&&s.filterOn]}><Text style={[s.filterText,category===x&&s.filterTextOn]}>{x||'All'}</Text></TouchableOpacity>)}</ScrollView>
  {error?<View style={s.center}><Ionicons name="cloud-offline-outline" size={48} color={GOLD}/><Text style={s.error}>{error}</Text><TouchableOpacity style={s.retry} onPress={load}><Text style={s.retryText}>Try again</Text></TouchableOpacity></View>:<FlatList data={shown} keyExtractor={x=>x.id} numColumns={2} columnWrapperStyle={s.row} contentContainerStyle={s.grid} showsVerticalScrollIndicator={false} ListEmptyComponent={<View style={s.empty}><Ionicons name="archive-outline" size={44} color="#AAA196"/><Text style={s.muted}>No artifacts in this category.</Text></View>} renderItem={({item})=><Card item={item} scanned={discovered.has(item.id)} favorite={favorites.includes(item.id)} onPress={()=>setSelected(item)} onFavorite={()=>toggleFavorite(item.id)}/>}/>} 
  <DetailModal artifact={selected} favorite={!!selected&&favorites.includes(selected.id)} onToggleFavorite={()=>selected&&toggleFavorite(selected.id)} onClose={()=>setSelected(null)}/>
 </SafeAreaView>
}

const s=StyleSheet.create({root:{flex:1},header:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:12,gap:10},back:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:'#F0ECE5'},eyebrow:{fontSize:9,fontWeight:'800',letterSpacing:2.2,color:GOLD},heading:{fontSize:28,fontWeight:'900',color:INK,letterSpacing:-.7},counter:{flexDirection:'row',alignItems:'baseline',paddingHorizontal:12,paddingVertical:8,borderRadius:18,backgroundColor:'#F0E8D8'},counterBig:{fontSize:17,fontWeight:'900',color:INK},counterSmall:{fontSize:12,color:'#7A7167'},summary:{marginHorizontal:16,marginBottom:12,padding:16,borderRadius:18,backgroundColor:INK,flexDirection:'row',alignItems:'center'},summaryTitle:{fontSize:15,fontWeight:'800',color:'#fff'},summarySub:{fontSize:12,color:'#C9C0B4',marginTop:3},filters:{paddingHorizontal:16,paddingBottom:12,gap:8},filter:{paddingHorizontal:14,paddingVertical:8,borderRadius:18,borderWidth:1,borderColor:'#DED7CC',backgroundColor:'#fff'},filterOn:{backgroundColor:INK,borderColor:INK},filterText:{fontSize:12,fontWeight:'700',color:'#71695F'},filterTextOn:{color:'#fff'},grid:{paddingHorizontal:14,paddingBottom:100,gap:GAP},row:{gap:GAP,marginBottom:GAP},center:{flex:1,alignItems:'center',justifyContent:'center',padding:30},muted:{marginTop:10,fontSize:13,color:'#81786E',textAlign:'center'},error:{marginTop:12,color:'#81786E',textAlign:'center'},retry:{marginTop:16,backgroundColor:INK,paddingHorizontal:22,paddingVertical:12,borderRadius:22},retryText:{color:'#fff',fontWeight:'700'},empty:{width:W-28,alignItems:'center',paddingTop:80}});
const c=StyleSheet.create({card:{width:CARD_W,borderRadius:18,overflow:'hidden',backgroundColor:'#fff',borderWidth:1,borderColor:'#E8E1D7',elevation:2,shadowColor:'#000',shadowOpacity:.06,shadowRadius:8,shadowOffset:{width:0,height:3}},locked:{backgroundColor:'#F1EEE9'},imageWrap:{height:CARD_W*.88,backgroundColor:'#DDD5C9'},image:{width:'100%',height:'100%'},lock:{position:'absolute',alignSelf:'center',top:'38%',width:42,height:42,borderRadius:21,backgroundColor:'rgba(25,22,17,.72)',alignItems:'center',justifyContent:'center'},heart:{position:'absolute',right:8,top:8,width:34,height:34,borderRadius:17,backgroundColor:'rgba(25,22,17,.68)',alignItems:'center',justifyContent:'center'},info:{padding:12,minHeight:105},category:{fontSize:9,fontWeight:'800',letterSpacing:.6,color:GOLD,textTransform:'uppercase'},title:{fontSize:14,fontWeight:'800',color:INK,lineHeight:19,marginTop:4},footer:{marginTop:'auto',paddingTop:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},status:{fontSize:10,fontWeight:'700',color:'#8C8277'}});
const d=StyleSheet.create({root:{flex:1,backgroundColor:CREAM},scroll:{paddingBottom:30},hero:{height:330,backgroundColor:INK},heroImage:{width:'100%',height:'100%'},scrim:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.18)'},roundBtn:{position:'absolute',top:14,width:42,height:42,borderRadius:21,backgroundColor:'rgba(20,17,13,.7)',alignItems:'center',justifyContent:'center'},category:{position:'absolute',left:18,bottom:18,paddingHorizontal:12,paddingVertical:7,borderRadius:16,backgroundColor:'rgba(20,17,13,.78)'},categoryText:{fontSize:10,fontWeight:'800',color:'#E6C477',letterSpacing:.7},content:{padding:20},name:{fontSize:30,fontWeight:'900',color:INK,letterSpacing:-.8,lineHeight:35},place:{fontSize:12,color:'#8A8177',marginTop:5},langRow:{gap:8,paddingVertical:18},langChip:{paddingHorizontal:13,paddingVertical:8,borderRadius:18,borderWidth:1,borderColor:'#DED6CA',backgroundColor:'#fff'},langChipOn:{backgroundColor:INK,borderColor:INK},langText:{fontSize:11,fontWeight:'700',color:'#71685E'},langTextOn:{color:'#fff'},section:{fontSize:10,fontWeight:'900',letterSpacing:2,color:GOLD,marginTop:4,marginBottom:9},desc:{fontSize:15,lineHeight:25,color:'#5E574F'},metaCard:{marginTop:22,borderRadius:18,backgroundColor:'#fff',paddingHorizontal:16,borderWidth:1,borderColor:'#E8E0D5'},metaItem:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14},metaDivider:{height:1,backgroundColor:'#EEE8DF'},metaLabel:{fontSize:10,color:'#9A9186',fontWeight:'700'},metaValue:{fontSize:13,color:INK,fontWeight:'700',marginTop:2},audioCard:{marginTop:18,flexDirection:'row',alignItems:'center',gap:12,padding:14,borderRadius:18,backgroundColor:'#fff',borderWidth:1,borderColor:'#E8E0D5'},play:{width:48,height:48,borderRadius:24,backgroundColor:INK,alignItems:'center',justifyContent:'center'},audioTitle:{fontSize:14,fontWeight:'800',color:INK},audioSub:{fontSize:11,color:'#8E857B',marginTop:2},done:{marginTop:22,backgroundColor:INK,borderRadius:24,paddingVertical:15,alignItems:'center'},doneText:{color:'#fff',fontWeight:'800',fontSize:14}});