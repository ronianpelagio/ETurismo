import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Image, Alert, ActivityIndicator, Animated, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../services/supabase';
import { useAppTheme } from '../../context/ThemeContext';
import { useAppContext } from '../../context/AppContext';
import { THEMES } from '../../constants/themes';
import { STORAGE_KEYS, getStringArray } from '../../utils/storage';

function buildC(t: typeof THEMES.light) {
  return {
    bg: t.bg, surface: t.surface, raised: t.raised, deep: t.deep,
    ink: t.ink, inkMid: t.inkMid, inkDim: t.inkDim,
    gold: t.gold, goldBright: t.goldBright, goldSoft: t.goldSoft, borderGold: t.borderGold,
    border: t.border, crimson: t.crimson, teal: t.teal,
  };
}

type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  profile_picture: string | null;
};

export default function Profile({ navigation, setNavbarVisible }: any) {
  const { theme } = useAppTheme();
  const C = buildC(theme);
  const { fontScale } = useAppContext();

  const [user, setUser]           = useState<UserProfile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // Editable fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [editing, setEditing]     = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<'idle'|'saving'|'saved'|'error'>('idle');

  // Avatar upload
  const [avatarUri, setAvatarUri]   = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const editBorderAnim = useRef(new Animated.Value(0)).current;

  // Always hide navbar on settings tab
  useEffect(() => { setNavbarVisible?.(false); }, []);
  useFocusEffect(useCallback(() => {
    setNavbarVisible?.(false);
    fetchCounts();
  }, []));

  useEffect(() => { fetchUser(); }, []);

  async function fetchUser() {
    setLoading(true);
    try {
      const { data: { user: auth } } = await supabase.auth.getUser();
      if (!auth) return;
      const { data } = await supabase.from('users').select('*').eq('id', auth.id).single();
      if (data) {
        setUser(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setPhone(data.phone || '');
        setAvatarUri(data.profile_picture || null);
      }
    } catch {}
    finally { setLoading(false); }
  }

  async function fetchCounts() {
    try {
      const saved = await getStringArray(STORAGE_KEYS.savedArtifacts);
      setSavedCount(saved.length);
    } catch {}
  }

  function startEditing() {
    setEditing(true);
    Animated.timing(editBorderAnim, { toValue: 1, duration: 250, useNativeDriver: false }).start();
  }

  function cancelEditing() {
    // Reset to original values
    setFirstName(user?.first_name || '');
    setLastName(user?.last_name || '');
    setPhone(user?.phone || '');
    setEditing(false);
    Keyboard.dismiss();
    Animated.timing(editBorderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required', 'First name and last name cannot be empty.');
      return;
    }
    setSaveFeedback('saving');
    Keyboard.dismiss();
    try {
      const { data: { user: auth } } = await supabase.auth.getUser();
      if (!auth) throw new Error('Not authenticated');
      const { error } = await supabase.from('users').update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      }).eq('id', auth.id);
      if (error) throw error;
      setUser(prev => prev ? { ...prev, first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() } : prev);
      setSaveFeedback('saved');
      setEditing(false);
      Animated.sequence([
        Animated.timing(feedbackAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(feedbackAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setSaveFeedback('idle'));
      Animated.timing(editBorderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    } catch (e: any) {
      setSaveFeedback('error');
      Alert.alert('Error', e.message || 'Failed to save changes.');
      setSaveFeedback('idle');
    }
  }

  async function handlePickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;
    const uri = result.assets[0].uri;
    setUploadingAvatar(true);
    try {
      // Upload to Supabase Storage (avatars bucket)
      const { data: { user: auth } } = await supabase.auth.getUser();
      if (!auth) throw new Error('Not authenticated');

      const fileName = `avatar_${auth.id}_${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append('file', { uri, name: fileName, type: 'image/jpeg' } as any);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, formData as any, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      await supabase.from('users').update({ profile_picture: publicUrl }).eq('id', auth.id);
      setAvatarUri(publicUrl);
      setUser(prev => prev ? { ...prev, profile_picture: publicUrl } : prev);
    } catch {
      // If storage upload fails, use local URI as preview
      setAvatarUri(uri);
    } finally {
      setUploadingAvatar(false);
    }
  }

  const activeInputBorder = editBorderAnim.interpolate({ inputRange: [0, 1], outputRange: [C.border, C.gold] });

  const initials = user
    ? `${(user.first_name[0] || '').toUpperCase()}${(user.last_name[0] || '').toUpperCase()}`
    : '?';

  // ── Styles ──────────────────────────────────────────────────────────────────
  const s = StyleSheet.create({
    safe:        { flex: 1, backgroundColor: C.bg },
    center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
    scroll:      { paddingBottom: 60 },

    // Hero
    hero:        { paddingBottom: 32, overflow: 'hidden', position: 'relative' },
    heroOrb1:    { position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(199,168,75,0.09)' },
    heroOrb2:    { position: 'absolute', bottom: -30, left: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(199,168,75,0.06)' },
    heroInner:   { alignItems: 'center', paddingTop: 28, paddingHorizontal: 24, paddingBottom: 4 },
    heroGoldLine:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(199,168,75,0.25)' },

    // Avatar
    avatarWrap:  { position: 'relative', marginBottom: 18 },
    avatarRing:  { width: 110, height: 110, borderRadius: 55, padding: 3, alignItems: 'center', justifyContent: 'center' },
    avatarInner: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#2C2720', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    avatarImg:   { width: '100%', height: '100%' },
    avatarInitials: { fontSize: 38, fontWeight: '800', color: C.gold },
    avatarEditBtn: {
      position: 'absolute', bottom: 0, right: 0,
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center',
      borderWidth: 2.5, borderColor: '#1E1B17',
    },
    avatarUploadOverlay: {
      ...StyleSheet.absoluteFillObject as any, borderRadius: 52,
      backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
    },

    // Name display vs edit
    heroBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(199,168,75,0.12)', borderWidth: 1, borderColor: 'rgba(199,168,75,0.25)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 },
    heroBadgeDot:{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.gold },
    heroBadgeTxt:{ fontSize: 9, fontWeight: '700', letterSpacing: 2, color: C.gold },
    heroName:    { fontSize: 32, fontWeight: '900', color: '#FFFCF8', letterSpacing: -0.5, lineHeight: 36, textAlign: 'center' },
    heroSub:     { fontSize: 12, color: 'rgba(255,252,248,0.45)', marginTop: 4 },
    editHeroBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    editHeroBtnTxt: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },

    // Settings shortcut
    settingsBtn: { position: 'absolute', top: 16, right: 20, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },

    // Stats
    statsRow:    { flexDirection: 'row', marginHorizontal: 20, marginTop: -1, backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden', elevation: 3, shadowColor: C.ink, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    statCell:    { flex: 1, alignItems: 'center', paddingVertical: 18, gap: 4 },
    statDivider: { width: 1, backgroundColor: C.border, marginVertical: 14 },
    statIconBox: { width: 32, height: 32, borderRadius: 9, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    statNum:     { fontSize: 24, fontWeight: '900', color: C.ink },
    statLbl:     { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: C.inkDim },

    // Edit form
    editCard:    { marginHorizontal: 20, marginTop: 24, backgroundColor: C.surface, borderRadius: 20, borderWidth: 1.5, borderColor: C.gold, padding: 20, gap: 4 },
    editHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    editTitle:   { fontSize: 13, fontWeight: '800', color: C.gold, letterSpacing: 1.5 },
    editActions: { flexDirection: 'row', gap: 8 },
    cancelBtn:   { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50, backgroundColor: C.deep, borderWidth: 1, borderColor: C.border },
    cancelBtnTxt:{ fontSize: 12, fontWeight: '600', color: C.inkMid },
    saveBtn:     { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50, backgroundColor: C.gold },
    saveBtnTxt:  { fontSize: 12, fontWeight: '800', color: '#fff' },
    fieldRow:    { marginBottom: 14 },
    fieldLabel:  { fontSize: 10, fontWeight: '800', color: C.gold, letterSpacing: 1.5, marginBottom: 6 },
    fieldInput:  { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.ink },
    fieldDisabled: { backgroundColor: C.deep, borderColor: C.border },
    fieldDisabledTxt: { fontSize: 14, color: C.inkDim },
    fieldHelper: { fontSize: 10, color: C.inkDim, marginTop: 4, fontStyle: 'italic' },

    // Section
    section:     { paddingHorizontal: 20, paddingTop: 24 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: C.gold },
    sectionLbl:  { fontSize: 9, fontWeight: '800', letterSpacing: 2.5, color: C.gold },
    sectionLine: { flex: 1, height: 1, backgroundColor: C.border },

    // Menu card
    menuCard:    { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    menuItem:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, gap: 14 },
    menuBorder:  { borderBottomWidth: 1, borderBottomColor: C.border },
    menuIconBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.borderGold, alignItems: 'center', justifyContent: 'center' },
    menuTextCol: { flex: 1 },
    menuTitle:   { fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 1 },
    menuSub:     { fontSize: 11, color: C.inkDim },
    menuBadge:   { backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
    menuBadgeTxt:{ fontSize: 11, fontWeight: '700', color: '#fff' },

    // Feedback toast
    feedbackToast: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 99, paddingTop: 14 },
    feedbackPill:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.teal, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 50, elevation: 8 },
    feedbackTxt:   { fontSize: 13, fontWeight: '700', color: '#fff' },

    version:     { textAlign: 'center', fontSize: 10, color: C.inkDim, marginTop: 28, letterSpacing: 0.5 },
  });

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      {/* ── Save feedback toast ── */}
      <Animated.View style={[s.feedbackToast, { opacity: feedbackAnim }]} pointerEvents="none">
        <View style={s.feedbackPill}>
          <Ionicons name="checkmark-circle" size={16} color="#fff" />
          <Text style={s.feedbackTxt}>Profile updated!</Text>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ══════════════════════════════
            HERO
        ══════════════════════════════ */}
        <View style={s.hero}>
          <LinearGradient
            colors={['#1E1B17', '#2C2720', '#3A3228']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={s.heroOrb1} />
          <View style={s.heroOrb2} />
          <View style={s.heroGoldLine} />

          <View style={s.heroInner}>
            {/* Avatar with edit button */}
            <View style={s.avatarWrap}>
              <LinearGradient
                colors={[C.gold, C.goldBright, '#B8922E']}
                style={s.avatarRing}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <View style={s.avatarInner}>
                  {avatarUri
                    ? <Image source={{ uri: avatarUri }} style={s.avatarImg} />
                    : <Text style={s.avatarInitials}>{initials}</Text>
                  }
                  {uploadingAvatar && (
                    <View style={s.avatarUploadOverlay}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                </View>
              </LinearGradient>
              <TouchableOpacity
                style={s.avatarEditBtn}
                onPress={handlePickAvatar}
                activeOpacity={0.8}
                disabled={uploadingAvatar}
              >
                <Ionicons name="camera" size={15} color="#1A1510" />
              </TouchableOpacity>
            </View>

            {/* Member badge */}
            <View style={s.heroBadge}>
              <View style={s.heroBadgeDot} />
              <Text style={s.heroBadgeTxt}>SACRED HERITAGE MEMBER</Text>
            </View>

            {/* Name (live-reflects edits) */}
            <Text style={[s.heroName, { fontSize: 30 * fontScale }]}>
              {firstName || user?.first_name} {lastName || user?.last_name}
            </Text>
            <Text style={s.heroSub}>{user?.email}</Text>

            {/* Edit profile inline button */}
            {!editing && (
              <TouchableOpacity style={s.editHeroBtn} onPress={startEditing} activeOpacity={0.8}>
                <Ionicons name="pencil-outline" size={13} color="rgba(255,255,255,0.75)" />
                <Text style={s.editHeroBtnTxt}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Settings shortcut */}
          <TouchableOpacity
            style={s.settingsBtn}
            onPress={() => navigation?.navigate?.('SettingsRoot')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════
            STATS STRIP
        ══════════════════════════════ */}
        <View style={s.statsRow}>
          <View style={s.statCell}>
            <View style={s.statIconBox}>
              <Ionicons name="bookmark-outline" size={16} color={C.gold} />
            </View>
            <Text style={s.statNum}>{savedCount}</Text>
            <Text style={s.statLbl}>SAVED</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCell}>
            <View style={s.statIconBox}>
              <Ionicons name="library-outline" size={16} color={C.gold} />
            </View>
            <Text style={s.statNum}>∞</Text>
            <Text style={s.statLbl}>COLLECTION</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCell}>
            <View style={s.statIconBox}>
              <Ionicons name="time-outline" size={16} color={C.gold} />
            </View>
            <Text style={s.statNum}>
              <Ionicons name="footsteps-outline" size={18} color={C.gold} />
            </Text>
            <Text style={s.statLbl}>HISTORY</Text>
          </View>
        </View>

        {/* ══════════════════════════════
            INLINE EDIT FORM
        ══════════════════════════════ */}
        {editing && (
          <View style={s.editCard}>
            <View style={s.editHeader}>
              <Text style={s.editTitle}>EDIT PROFILE</Text>
              <View style={s.editActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={cancelEditing} activeOpacity={0.8}>
                  <Text style={s.cancelBtnTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, saveFeedback === 'saving' && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={saveFeedback === 'saving'}
                  activeOpacity={0.85}
                >
                  {saveFeedback === 'saving'
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.saveBtnTxt}>Save</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>

            {/* First name */}
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>FIRST NAME</Text>
              <TextInput
                style={[s.fieldInput, { borderColor: C.gold }]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={C.inkDim}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* Last name */}
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>LAST NAME</Text>
              <TextInput
                style={[s.fieldInput, { borderColor: C.gold }]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={C.inkDim}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            {/* Phone */}
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>PHONE NUMBER</Text>
              <TextInput
                style={[s.fieldInput, { borderColor: C.borderGold }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. +63 912 345 6789"
                placeholderTextColor={C.inkDim}
                keyboardType="phone-pad"
                returnKeyType="done"
              />
            </View>

            {/* Email (read-only) */}
            <View style={s.fieldRow}>
              <Text style={s.fieldLabel}>EMAIL</Text>
              <View style={[s.fieldInput, s.fieldDisabled]}>
                <Text style={s.fieldDisabledTxt}>{user?.email}</Text>
              </View>
              <Text style={s.fieldHelper}>Email address cannot be changed here.</Text>
            </View>
          </View>
        )}

        {/* ══════════════════════════════
            MY COLLECTION
        ══════════════════════════════ */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <View style={s.sectionDot} />
            <Text style={s.sectionLbl}>MY COLLECTION</Text>
            <View style={s.sectionLine} />
          </View>
          <View style={s.menuCard}>
            <MenuRow
              icon="bookmark" label="Saved Artifacts"
              sub={savedCount > 0 ? `${savedCount} artifact${savedCount !== 1 ? 's' : ''} bookmarked` : 'Nothing saved yet'}
              badge={savedCount || undefined}
              onPress={() => navigation?.navigate?.('SavedArtifacts')}
              C={C}
            />
            <MenuRow
              icon="library" label="Full Collection"
              sub="Browse all artifacts"
              onPress={() => navigation?.navigate?.('CollectionPage')}
              C={C} isLast
            />
          </View>
        </View>

        {/* ══════════════════════════════
            ACCOUNT
        ══════════════════════════════ */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <View style={s.sectionDot} />
            <Text style={s.sectionLbl}>ACCOUNT</Text>
            <View style={s.sectionLine} />
          </View>
          <View style={s.menuCard}>
            <MenuRow
              icon="time-outline" label="Visit History"
              sub="Artifacts you've explored"
              onPress={() => navigation?.navigate?.('VisitHistory')}
              C={C}
            />
            <MenuRow
              icon="settings-outline" label="Settings & Preferences"
              sub="Theme, language, notifications"
              onPress={() => navigation?.navigate?.('SettingsRoot')}
              C={C} isLast
            />
          </View>
        </View>

        <Text style={s.version}>Version 2.0.0 · Sacred Heritage</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Reusable menu row ──────────────────────────────────────────────────────────
function MenuRow({ icon, label, sub, badge, onPress, isLast = false, C }: {
  icon: string; label: string; sub?: string;
  badge?: number; onPress: () => void; isLast?: boolean; C: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  const s = {
    menuItem:    { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 16, paddingVertical: 15, gap: 14, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: C.border } as any,
    menuIconBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.borderGold, alignItems: 'center' as const, justifyContent: 'center' as const },
    menuBadge:   { backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: 'center' as const },
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity style={s.menuItem} onPress={press} activeOpacity={1}>
        <View style={s.menuIconBox}>
          <Ionicons name={icon as any} size={19} color={C.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 1 }}>{label}</Text>
          {sub && <Text style={{ fontSize: 11, color: C.inkDim }}>{sub}</Text>}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {!!badge && <View style={s.menuBadge}><Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{badge}</Text></View>}
          <Ionicons name="chevron-forward" size={15} color={C.goldBright} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
