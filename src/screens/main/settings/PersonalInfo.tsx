import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Animated,
  Keyboard, Image, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../../services/supabase';
import { useAppTheme } from '../../../context/ThemeContext';
import { THEMES } from '../../../constants/themes';

function buildC(t: typeof THEMES[keyof typeof THEMES]) {
  return {
    bg: t.bg, surface: t.surface, raised: t.raised, deep: t.deep,
    ink: t.ink, inkMid: t.inkMid, inkDim: t.inkDim,
    gold: t.gold, goldSoft: t.goldSoft, goldBright: t.goldBright,
    borderGold: t.borderGold, border: t.border,
    crimson: t.crimson, teal: t.teal,
  };
}

type UserData = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  profile_picture?: string;
  gender?: string;
  age?: number;
  Address?: string;
};

// ─── Field component ─────────────────────────────────────────────────────────
function Field({
  label, icon, value, onChangeText, placeholder,
  keyboardType, returnKeyType, onSubmitEditing,
  inputRef, editable = true, helperText, C,
}: {
  label: string; icon: string; value: string;
  onChangeText?: (t: string) => void; placeholder?: string;
  keyboardType?: any; returnKeyType?: any; onSubmitEditing?: () => void;
  inputRef?: any; editable?: boolean; helperText?: string;
  C: ReturnType<typeof buildC>;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{
        fontSize: 10, fontWeight: '800', letterSpacing: 2,
        color: C.gold, marginBottom: 8, textTransform: 'uppercase',
      }}>
        {label}
      </Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: editable ? C.surface : C.deep,
        borderRadius: 14, borderWidth: 1.5,
        borderColor: !editable ? C.border : focused ? C.gold : C.border,
        paddingHorizontal: 14, gap: 10,
        shadowColor: focused ? C.gold : 'transparent',
        shadowOpacity: 0.12, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
        elevation: focused ? 2 : 0,
      }}>
        <Ionicons
          name={icon as any}
          size={17}
          color={focused ? C.gold : editable ? C.inkDim : C.inkDim}
        />
        {editable ? (
          <TextInput
            ref={inputRef}
            style={{ flex: 1, paddingVertical: 14, fontSize: 14.5, color: C.ink }}
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
            autoCapitalize={
              keyboardType === 'phone-pad' || keyboardType === 'email-address'
                ? 'none' : 'words'
            }
          />
        ) : (
          <Text style={{ flex: 1, paddingVertical: 14, fontSize: 14.5, color: C.inkDim }}>
            {value}
          </Text>
        )}
        {!editable && (
          <Ionicons name="lock-closed-outline" size={14} color={C.inkDim} />
        )}
      </View>
      {helperText && (
        <Text style={{ fontSize: 10.5, color: C.inkDim, marginTop: 6, paddingHorizontal: 2, lineHeight: 15 }}>
          {helperText}
        </Text>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PersonalInfo({ navigation }: any) {
  const { theme } = useAppTheme();
  const C = buildC(theme);

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
  const [feedbackType, setFeedbackType] = useState<'saved' | 'error'>('saved');

  useEffect(() => { fetchUser(); }, []);

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
    } catch {
      Alert.alert('Error', 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }

  function showFeedback(type: 'saved' | 'error') {
    setFeedbackType(type);
    feedbackAnim.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(feedbackAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required', 'First and last name cannot be empty.');
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
      setUser(prev => prev
        ? { ...prev, first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() }
        : prev);
      setDirty(false);
      showFeedback('saved');
    } catch (e: any) {
      showFeedback('error');
      Alert.alert('Save failed', e.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      </SafeAreaView>
    );
  }

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* ── Toast feedback ── */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 99,
          alignItems: 'center', paddingTop: 16,
          opacity: feedbackAnim,
          transform: [{ translateY: feedbackAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
        }}
      >
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingHorizontal: 20, paddingVertical: 11, borderRadius: 50,
          backgroundColor: feedbackType === 'saved' ? C.teal : C.crimson,
          shadowColor: '#000', shadowOpacity: 0.18,
          shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 8,
        }}>
          <Ionicons
            name={feedbackType === 'saved' ? 'checkmark-circle' : 'close-circle'}
            size={16} color="#fff"
          />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>
            {feedbackType === 'saved' ? 'Changes saved!' : 'Failed to save'}
          </Text>
        </View>
      </Animated.View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 60 }}
        >
        {/* ── Hero banner ── */}
        <LinearGradient
          colors={[C.goldSoft, C.bg]}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={{ paddingBottom: 28 }}
        >
          {/* Header row */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
          }}>
            <TouchableOpacity
              onPress={() => navigation?.goBack()}
              activeOpacity={0.7}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
                justifyContent: 'center', alignItems: 'center',
              }}
            >
              <Ionicons name="arrow-back" size={20} color={C.ink} />
            </TouchableOpacity>

            <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3 }}>
              Personal Info
            </Text>

            {dirty && !saving ? (
              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.8}
                style={{
                  paddingHorizontal: 16, paddingVertical: 9,
                  borderRadius: 50, backgroundColor: C.gold,
                  shadowColor: C.gold, shadowOpacity: 0.3,
                  shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 4,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 55 }} />
            )}
          </View>

          {/* Avatar + name strip */}
          <View style={{ alignItems: 'center', paddingBottom: 4 }}>
            {user?.profile_picture ? (
              <Image
                source={{ uri: user.profile_picture }}
                style={{
                  width: 84, height: 84, borderRadius: 42,
                  borderWidth: 3, borderColor: C.gold,
                }}
              />
            ) : (
              <View style={{
                width: 84, height: 84, borderRadius: 42,
                backgroundColor: C.gold,
                borderWidth: 3, borderColor: C.goldBright,
                justifyContent: 'center', alignItems: 'center',
                shadowColor: C.gold, shadowOpacity: 0.35,
                shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6,
              }}>
                <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff' }}>{initials}</Text>
              </View>
            )}

            <Text style={{
              marginTop: 12, fontSize: 20, fontWeight: '800',
              color: C.ink, letterSpacing: -0.5,
            }}>
              {firstName} {lastName}
            </Text>
            <Text style={{ fontSize: 12, color: C.inkDim, marginTop: 3 }}>
              {user?.email}
            </Text>

            {/* Gold rule */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingHorizontal: 40 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: C.gold, opacity: 0.25 }} />
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.gold }} />
              <View style={{ flex: 1, height: 1, backgroundColor: C.gold, opacity: 0.25 }} />
            </View>
          </View>
        </LinearGradient>

        {/* ── Read-only info chips (gender / age / address) ── */}
        {(user?.gender || user?.age || user?.Address) && (
          <View style={{
            flexDirection: 'row', flexWrap: 'wrap', gap: 8,
            paddingHorizontal: 20, marginTop: -10, marginBottom: 6,
          }}>
            {user?.gender && (
              <View style={chipStyle(C)}>
                <Ionicons name="person-outline" size={12} color={C.gold} />
                <Text style={{ fontSize: 11, color: C.inkMid, fontWeight: '600' }}>{user.gender}</Text>
              </View>
            )}
            {user?.age && (
              <View style={chipStyle(C)}>
                <Ionicons name="calendar-outline" size={12} color={C.gold} />
                <Text style={{ fontSize: 11, color: C.inkMid, fontWeight: '600' }}>{user.age} yrs</Text>
              </View>
            )}
            {user?.Address && (
              <View style={chipStyle(C)}>
                <Ionicons name="location-outline" size={12} color={C.gold} />
                <Text style={{ fontSize: 11, color: C.inkMid, fontWeight: '600' }} numberOfLines={1}>
                  {user.Address}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Form card ── */}
        <View style={{
          marginHorizontal: 20, marginTop: 16,
          backgroundColor: C.surface, borderRadius: 20,
          borderWidth: 1, borderColor: C.border, padding: 20,
          shadowColor: C.ink, shadowOpacity: 0.06,
          shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 3,
        }}>
          {/* Card header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <View style={{
              width: 28, height: 28, borderRadius: 8,
              backgroundColor: C.goldSoft, justifyContent: 'center', alignItems: 'center',
            }}>
              <Ionicons name="create-outline" size={14} color={C.gold} />
            </View>
            <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2.5, color: C.gold }}>
              EDIT PROFILE
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          </View>

          <Field C={C} label="First Name" icon="person-outline"
            value={firstName} onChangeText={setFirstName}
            placeholder="Enter first name"
            returnKeyType="next"
            onSubmitEditing={() => lastNameRef.current?.focus()}
          />
          <Field C={C} label="Last Name" icon="person-outline"
            value={lastName} onChangeText={setLastName}
            placeholder="Enter last name"
            returnKeyType="next" inputRef={lastNameRef}
            onSubmitEditing={() => phoneRef.current?.focus()}
          />
          <Field C={C} label="Phone Number" icon="call-outline"
            value={phone} onChangeText={setPhone}
            placeholder="+63 912 345 6789"
            keyboardType="phone-pad" returnKeyType="done"
            inputRef={phoneRef} onSubmitEditing={handleSave}
          />
          <Field C={C} label="Email Address" icon="mail-outline"
            value={user?.email || ''} editable={false}
            helperText="Contact support to update your email address."
          />
        </View>

        {/* ── Save button ── */}
        <TouchableOpacity
          style={{
            marginHorizontal: 20, marginTop: 20,
            height: 54, borderRadius: 16,
            backgroundColor: dirty ? C.gold : C.deep,
            borderWidth: dirty ? 0 : 1, borderColor: C.border,
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 8,
            shadowColor: dirty ? C.gold : 'transparent',
            shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 },
            shadowRadius: 10, elevation: dirty ? 4 : 0,
          }}
          onPress={handleSave}
          disabled={!dirty || saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="checkmark-circle-outline" size={19} color={dirty ? '#fff' : C.inkDim} />
          }
          <Text style={{
            fontSize: 14, fontWeight: '800', letterSpacing: 0.4,
            color: dirty ? '#fff' : C.inkDim,
          }}>
            {saving ? 'Saving…' : dirty ? 'Save Changes' : 'No changes'}
          </Text>
        </TouchableOpacity>

        {/* ── Info note ── */}
        <View style={{
          marginHorizontal: 20, marginTop: 20,
          flexDirection: 'row', gap: 10, alignItems: 'flex-start',
          backgroundColor: C.deep, borderRadius: 14, padding: 14,
          borderWidth: 1, borderColor: C.border,
        }}>
          <Ionicons name="information-circle-outline" size={17} color={C.inkDim} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 12, color: C.inkDim, lineHeight: 18 }}>
            To change your email or delete your account, please contact Sacred Heritage support.
          </Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function chipStyle(C: ReturnType<typeof buildC>) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  };
}
