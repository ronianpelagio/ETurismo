import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Animated,
  Keyboard, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../../services/supabase';
import { useAppTheme } from '../../../context/ThemeContext';
import { THEMES } from '../../../constants/themes';

function buildC(t: typeof THEMES.light) {
  return {
    bg: t.bg, surface: t.surface, raised: t.raised, deep: t.deep,
    ink: t.ink, inkMid: t.inkMid, inkDim: t.inkDim,
    gold: t.gold, goldSoft: t.goldSoft, goldBright: t.goldBright,
    borderGold: t.borderGold, border: t.border,
    crimson: t.crimson, teal: t.teal,
  };
}

// ─── Password strength meter ──────────────────────────────────────────────────
function getStrength(p: string): { score: number; label: string; color: string } {
  if (!p) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (p.length >= 8)  score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (score <= 1) return { score, label: 'Weak',   color: '#E74C3C' };
  if (score <= 3) return { score, label: 'Fair',   color: '#F39C12' };
  if (score === 4) return { score, label: 'Good',  color: '#27AE60' };
  return              { score, label: 'Strong', color: '#1ABC9C' };
}

// ─── Password input field ─────────────────────────────────────────────────────
function PasswordField({
  label, icon, value, onChangeText, placeholder,
  inputRef, returnKeyType, onSubmitEditing, C,
}: {
  label: string; icon: string; value: string;
  onChangeText: (t: string) => void; placeholder: string;
  inputRef?: any; returnKeyType?: any; onSubmitEditing?: () => void;
  C: ReturnType<typeof buildC>;
}) {
  const [show, setShow] = useState(false);
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
        backgroundColor: C.surface, borderRadius: 14, borderWidth: 1.5,
        borderColor: focused ? C.gold : C.border,
        paddingHorizontal: 14, gap: 10,
        shadowColor: focused ? C.gold : 'transparent',
        shadowOpacity: 0.12, shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6, elevation: focused ? 2 : 0,
      }}>
        <Ionicons name={icon as any} size={17} color={focused ? C.gold : C.inkDim} />
        <TextInput
          ref={inputRef}
          style={{ flex: 1, paddingVertical: 14, fontSize: 14.5, color: C.ink }}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.inkDim}
          secureTextEntry={!show}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={() => setShow(v => !v)} activeOpacity={0.7} style={{ padding: 4 }}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.inkDim} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PasswordSecurity({ navigation }: any) {
  const { theme } = useAppTheme();
  const C = buildC(theme);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]                 = useState(false);

  const newRef     = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const [feedbackType, setFeedbackType] = useState<'saved' | 'error'>('saved');

  const strength = getStrength(newPassword);

  // match check
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSave  = currentPassword.length > 0 && newPassword.length >= 6 && !mismatch;

  function showFeedback(type: 'saved' | 'error') {
    setFeedbackType(type);
    feedbackAnim.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(feedbackAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }

  async function handleChangePassword() {
    if (!canSave) return;
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }
    setLoading(true);
    Keyboard.dismiss();
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showFeedback('saved');
    } catch (e: any) {
      showFeedback('error');
      Alert.alert('Error', e.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* ── Toast ── */}
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
            {feedbackType === 'saved' ? 'Password updated!' : 'Update failed'}
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
              Password & Security
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Icon + title strip */}
          <View style={{ alignItems: 'center', paddingBottom: 4 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: C.goldSoft,
              borderWidth: 2, borderColor: C.borderGold,
              justifyContent: 'center', alignItems: 'center',
              shadowColor: C.gold, shadowOpacity: 0.2,
              shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4,
            }}>
              <Ionicons name="shield-checkmark-outline" size={32} color={C.gold} />
            </View>
            <Text style={{
              marginTop: 14, fontSize: 20, fontWeight: '800',
              color: C.ink, letterSpacing: -0.5,
            }}>
              Update Password
            </Text>
            <Text style={{ fontSize: 12, color: C.inkDim, marginTop: 4, textAlign: 'center', paddingHorizontal: 40, lineHeight: 18 }}>
              Choose a strong password to keep your account secure
            </Text>

            {/* Gold rule */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 40 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: C.gold, opacity: 0.25 }} />
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.gold }} />
              <View style={{ flex: 1, height: 1, backgroundColor: C.gold, opacity: 0.25 }} />
            </View>
          </View>
        </LinearGradient>

        {/* ── Form card ── */}
        <View style={{
          marginHorizontal: 20, marginTop: 8,
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
              <Ionicons name="lock-closed-outline" size={14} color={C.gold} />
            </View>
            <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2.5, color: C.gold }}>
              CHANGE PASSWORD
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          </View>

          <PasswordField
            C={C} label="Current Password" icon="lock-closed-outline"
            value={currentPassword} onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            returnKeyType="next" onSubmitEditing={() => newRef.current?.focus()}
          />

          <PasswordField
            C={C} label="New Password" icon="key-outline"
            value={newPassword} onChangeText={setNewPassword}
            placeholder="Enter new password"
            inputRef={newRef} returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />

          {/* Strength meter */}
          {newPassword.length > 0 && (
            <View style={{ marginTop: -10, marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <View
                    key={i}
                    style={{
                      flex: 1, height: 3, borderRadius: 2,
                      backgroundColor: i <= strength.score ? strength.color : C.border,
                    }}
                  />
                ))}
              </View>
              <Text style={{ fontSize: 11, color: strength.color, fontWeight: '700' }}>
                {strength.label} password
                {strength.score < 3 ? ' — add uppercase, numbers, or symbols' : ''}
              </Text>
            </View>
          )}

          <PasswordField
            C={C} label="Confirm New Password" icon="checkmark-circle-outline"
            value={confirmPassword} onChangeText={setConfirmPassword}
            placeholder="Re-enter new password"
            inputRef={confirmRef} returnKeyType="done"
            onSubmitEditing={handleChangePassword}
          />

          {/* Mismatch error */}
          {mismatch && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 7,
              backgroundColor: '#FFF1EF', borderWidth: 1, borderColor: '#F5C6C2',
              borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginTop: -8, marginBottom: 8,
            }}>
              <Ionicons name="alert-circle-outline" size={15} color={C.crimson} />
              <Text style={{ fontSize: 12, color: C.crimson, fontWeight: '600' }}>
                Passwords do not match
              </Text>
            </View>
          )}
        </View>

        {/* ── Save button ── */}
        <TouchableOpacity
          style={{
            marginHorizontal: 20, marginTop: 20,
            height: 54, borderRadius: 16,
            backgroundColor: canSave ? C.gold : C.deep,
            borderWidth: canSave ? 0 : 1, borderColor: C.border,
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 8,
            shadowColor: canSave ? C.gold : 'transparent',
            shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 },
            shadowRadius: 10, elevation: canSave ? 4 : 0,
          }}
          onPress={handleChangePassword}
          disabled={!canSave || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="shield-checkmark-outline" size={19} color={canSave ? '#fff' : C.inkDim} />
          }
          <Text style={{
            fontSize: 14, fontWeight: '800', letterSpacing: 0.4,
            color: canSave ? '#fff' : C.inkDim,
          }}>
            {loading ? 'Updating…' : 'Update Password'}
          </Text>
        </TouchableOpacity>

        {/* ── Tips card ── */}
        <View style={{
          marginHorizontal: 20, marginTop: 20,
          backgroundColor: C.surface, borderRadius: 16,
          borderWidth: 1, borderColor: C.border, padding: 18,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Ionicons name="bulb-outline" size={15} color={C.gold} />
            <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 2, color: C.gold }}>
              SECURITY TIPS
            </Text>
          </View>
          {[
            { icon: 'checkmark-circle-outline', text: 'Use at least 8 characters' },
            { icon: 'checkmark-circle-outline', text: 'Mix uppercase, numbers & symbols' },
            { icon: 'checkmark-circle-outline', text: 'Avoid names, dates, or common words' },
            { icon: 'checkmark-circle-outline', text: 'Never reuse passwords across apps' },
          ].map((tip, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: i < 3 ? 10 : 0 }}>
              <Ionicons name={tip.icon as any} size={14} color={C.teal} />
              <Text style={{ fontSize: 12.5, color: C.inkMid, lineHeight: 18 }}>{tip.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
