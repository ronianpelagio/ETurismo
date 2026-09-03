import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Animated, Keyboard,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../../services/supabase';
import { useAppTheme } from '../../../context/ThemeContext';
import { useAppContext } from '../../../context/AppContext';
import { THEMES } from '../../../constants/themes';

function buildC(t: typeof THEMES.light) {
  return {
    bg: t.bg, surface: t.surface, raised: t.raised, deep: t.deep,
    ink: t.ink, inkMid: t.inkMid, inkDim: t.inkDim,
    gold: t.gold, goldSoft: t.goldSoft, borderGold: t.borderGold,
    border: t.border, crimson: t.crimson, teal: t.teal,
  };
}

type UserData = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
};

function Field({
  label, value, onChangeText, placeholder, keyboardType, returnKeyType,
  onSubmitEditing, inputRef, editable = true, helperText, C, fontScale,
}: {
  label: string; value: string; onChangeText?: (t: string) => void;
  placeholder?: string; keyboardType?: any; returnKeyType?: any;
  onSubmitEditing?: () => void; inputRef?: any;
  editable?: boolean; helperText?: string;
  C: ReturnType<typeof buildC>; fontScale: number;
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = !editable ? C.border : focused ? C.gold : C.border;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: C.gold, marginBottom: 7 }}>
        {label}
      </Text>
      <View style={{
        backgroundColor: editable ? C.bg : C.deep,
        borderRadius: 14, borderWidth: 1.5,
        borderColor,
        paddingHorizontal: 14, paddingVertical: 13,
        flexDirection: 'row', alignItems: 'center', gap: 8,
      }}>
        {editable ? (
          <TextInput
            ref={inputRef}
            style={{ flex: 1, fontSize: 15 * fontScale, color: C.ink, padding: 0 }}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={C.inkDim}
            keyboardType={keyboardType}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCorrect={false}
            autoCapitalize={keyboardType === 'phone-pad' || keyboardType === 'email-address' ? 'none' : 'words'}
          />
        ) : (
          <Text style={{ flex: 1, fontSize: 15 * fontScale, color: C.inkDim }}>{value}</Text>
        )}
        {!editable && <Ionicons name="lock-closed-outline" size={14} color={C.inkDim} />}
      </View>
      {helperText && (
        <Text style={{ fontSize: 10, color: C.inkDim, marginTop: 5, fontStyle: 'italic', paddingHorizontal: 2 }}>
          {helperText}
        </Text>
      )}
    </View>
  );
}

export default function PersonalInfo({ navigation }: any) {
  const { theme } = useAppTheme();
  const C = buildC(theme);
  const { fontScale } = useAppContext();

  const [user, setUser]       = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');

  const lastNameRef = useRef<TextInput>(null);
  const phoneRef    = useRef<TextInput>(null);

  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const [feedbackType, setFeedbackType] = useState<'saved'|'error'>('saved');

  useEffect(() => { fetchUser(); }, []);

  // Track dirty state
  useEffect(() => {
    if (!user) return;
    const changed =
      firstName.trim() !== user.first_name ||
      lastName.trim()  !== user.last_name  ||
      (phone.trim() || '') !== (user.phone?.trim() || '');
    setDirty(changed);
  }, [firstName, lastName, phone, user]);

  async function fetchUser() {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single();
      if (data) {
        setUser(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setPhone(data.phone || '');
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }

  function showFeedback(type: 'saved'|'error') {
    setFeedbackType(type);
    feedbackAnim.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(feedbackAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required fields', 'First name and last name cannot be empty.');
      return;
    }
    setSaving(true);
    Keyboard.dismiss();
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');
      const { error } = await supabase.from('users').update({
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        phone:      phone.trim() || null,
      }).eq('id', authUser.id);
      if (error) throw error;
      setUser(prev => prev ? { ...prev, first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() } : prev);
      setDirty(false);
      showFeedback('saved');
    } catch (e: any) {
      showFeedback('error');
      Alert.alert('Save failed', e.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const s = StyleSheet.create({
    safe:       { flex: 1, backgroundColor: C.bg },
    center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
    backBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
    pageTitle:  { fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
    heroContent:{ paddingHorizontal: 24, paddingTop: 4, paddingBottom: 24 },
    heroEyebrow:{ fontSize: 9, letterSpacing: 4, color: C.gold, fontWeight: '700', marginBottom: 8 },
    heroTitle:  { fontSize: 30, fontWeight: '900', color: C.ink, letterSpacing: -1, lineHeight: 34 },
    card:       { marginHorizontal: 20, marginTop: 20, backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 20 },
    cardTitle:  { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: C.gold, marginBottom: 18 },
    saveBtn:    { marginHorizontal: 20, marginTop: 20, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    saveBtnTxt: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
    feedback:   { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 99, paddingTop: 16 },
    feedbackPill:{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 50, elevation: 8 },
    feedbackTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  });

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}><ActivityIndicator size="large" color={C.gold} /></View>
      </SafeAreaView>
    );
  }

  const feedbackBg = feedbackType === 'saved' ? C.teal : C.crimson;
  const feedbackIcon = feedbackType === 'saved' ? 'checkmark-circle' : 'close-circle';
  const feedbackMsg  = feedbackType === 'saved' ? 'Changes saved!' : 'Failed to save';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* Feedback toast */}
      <Animated.View style={[s.feedback, { opacity: feedbackAnim }]} pointerEvents="none">
        <View style={[s.feedbackPill, { backgroundColor: feedbackBg }]}>
          <Ionicons name={feedbackIcon as any} size={16} color="#fff" />
          <Text style={s.feedbackTxt}>{feedbackMsg}</Text>
        </View>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 50 }}>

        {/* ── Hero header ── */}
        <ImageBackground
          source={require('../../../assets/Signin.jpg')}
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
            <Text style={s.pageTitle}>Personal Info</Text>
            {/* Inline save button in header when dirty */}
            {dirty && !saving ? (
              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.8}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, backgroundColor: C.gold }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 55 }} />
            )}
          </View>
          <View style={s.heroContent}>
            <Text style={s.heroEyebrow}>YOUR ACCOUNT</Text>
            <Text style={[s.heroTitle, { fontSize: 30 * fontScale }]}>Personal{'\n'}Information</Text>
          </View>
        </ImageBackground>

        {/* ── Form card ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>PROFILE DETAILS</Text>

          <Field
            C={C} fontScale={fontScale}
            label="FIRST NAME"
            value={firstName}
            onChangeText={t => setFirstName(t)}
            placeholder="Enter first name"
            returnKeyType="next"
            onSubmitEditing={() => lastNameRef.current?.focus()}
          />
          <Field
            C={C} fontScale={fontScale}
            label="LAST NAME"
            value={lastName}
            onChangeText={t => setLastName(t)}
            placeholder="Enter last name"
            returnKeyType="next"
            inputRef={lastNameRef}
            onSubmitEditing={() => phoneRef.current?.focus()}
          />
          <Field
            C={C} fontScale={fontScale}
            label="PHONE NUMBER"
            value={phone}
            onChangeText={t => setPhone(t)}
            placeholder="+63 912 345 6789"
            keyboardType="phone-pad"
            returnKeyType="done"
            inputRef={phoneRef}
            onSubmitEditing={handleSave}
          />
          <Field
            C={C} fontScale={fontScale}
            label="EMAIL ADDRESS"
            value={user?.email || ''}
            editable={false}
            helperText="Email address cannot be changed here. Contact support to update your email."
          />
        </View>

        {/* ── Save button ── */}
        <TouchableOpacity
          style={[s.saveBtn, {
            backgroundColor: dirty ? C.gold : C.deep,
            borderWidth: dirty ? 0 : 1,
            borderColor: C.border,
          }]}
          onPress={handleSave}
          disabled={!dirty || saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="checkmark-outline" size={18} color={dirty ? '#fff' : C.inkDim} />
          }
          <Text style={[s.saveBtnTxt, { color: dirty ? '#fff' : C.inkDim }]}>
            {saving ? 'Saving…' : dirty ? 'Save Changes' : 'No changes'}
          </Text>
        </TouchableOpacity>

        {/* ── Danger zone hint ── */}
        <View style={{ marginHorizontal: 20, marginTop: 24, flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: C.deep, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border }}>
          <Ionicons name="information-circle-outline" size={18} color={C.inkDim} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 12, color: C.inkDim, lineHeight: 18 }}>
            To change your email address or delete your account, please contact Sacred Heritage support.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
