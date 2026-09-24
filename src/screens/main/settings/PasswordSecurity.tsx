import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../../services/supabase';
import { useAppTheme } from '../../../context/ThemeContext';

// ─── Password input with show/hide toggle ─────────────────────────────────────
function PasswordInput({
  label,
  value,
  onChangeText,
  colors,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  colors: any;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 7 }}>
        {label}
      </Text>
      <View style={{ position: 'relative', justifyContent: 'center' }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={placeholder}
          placeholderTextColor={colors.dim}
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            paddingVertical: 15,
            paddingLeft: 15,
            paddingRight: 50, // room for the eye icon
            color: colors.ink,
            fontSize: 15,
          }}
        />
        <TouchableOpacity
          onPress={() => setShow(v => !v)}
          activeOpacity={0.7}
          style={{
            position: 'absolute',
            right: 14,
            padding: 4,
          }}
        >
          <Ionicons
            name={show ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={colors.dim}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function PasswordSecurity({ navigation }: any) {
  const { theme } = useAppTheme();
  const colors = {
    bg: theme.bg,
    surface: theme.surface,
    ink: theme.ink,
    muted: theme.inkMid,
    dim: theme.inkDim,
    gold: theme.gold,
    border: theme.border,
    deep: theme.deep,
  };

  const [current, setCurrent]   = useState('');
  const [next, setNext]         = useState('');
  const [confirm, setConfirm]   = useState('');
  const [emailLogin, setEmailLogin] = useState(true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const providers = data.user?.identities?.map(i => i.provider) ?? [];
      // If the only identity is google (no email provider) they have no password yet
      setEmailLogin(providers.length === 0 || providers.includes('email'));
    }).catch(() => {});
  }, []);

  const valid =
    next.length >= 8 &&
    next === confirm &&
    (!emailLogin || current.length > 0);

  async function savePassword() {
    if (!valid) {
      Alert.alert(
        'Check your inputs',
        emailLogin && !current
          ? 'Enter your current password.'
          : 'New password must be at least 8 characters and both fields must match.',
      );
      return;
    }

    setSaving(true);
    try {
      // ── Step 1: verify current password (email accounts only) ──────────────
      // We re-sign-in with the current password to confirm it is correct before
      // allowing the change. We do NOT rely on the returned session — we just
      // check for an error and discard the result.
      if (emailLogin) {
        const { data: userData } = await supabase.auth.getUser();
        const email = userData.user?.email;
        if (!email) throw new Error('Could not read your account email. Please sign out and try again.');

        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email,
          password: current,
        });
        if (verifyError) {
          // Give a clear message regardless of what Supabase returns
          throw new Error('Your current password is incorrect. Please try again.');
        }
      }

      // ── Step 2: update to the new password ────────────────────────────────
      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) throw updateError;

      // Clear fields on success
      setCurrent('');
      setNext('');
      setConfirm('');

      Alert.alert('Password updated ✓', 'Your password has been changed successfully.');
    } catch (err: any) {
      Alert.alert('Unable to update password', err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const buttonActive = valid && !saving;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
            <TouchableOpacity onPress={() => navigation?.goBack()} style={{ padding: 8 }}>
              <Ionicons name="arrow-back" size={22} color={colors.ink} />
            </TouchableOpacity>
            <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '800' }}>
              Password & Security
            </Text>
            <View style={{ width: 38 }} />
          </View>

          {/* Icon + title */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: colors.surface,
              borderWidth: 2, borderColor: colors.gold,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="shield-checkmark-outline" size={32} color={colors.gold} />
            </View>
            <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '800', marginTop: 14 }}>
              {emailLogin ? 'Change password' : 'Create password'}
            </Text>
            <Text style={{ color: colors.dim, marginTop: 5 }}>
              Keep your account secure.
            </Text>
          </View>

          {/* Form card */}
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: 18,
            borderWidth: 1, borderColor: colors.border,
            padding: 20,
          }}>
            {emailLogin ? (
              <PasswordInput
                label="Current password"
                value={current}
                onChangeText={setCurrent}
                colors={colors}
                placeholder="Enter your current password"
              />
            ) : (
              <View style={{ backgroundColor: colors.deep, borderRadius: 12, padding: 14, marginBottom: 18 }}>
                <Text style={{ color: colors.muted, lineHeight: 19 }}>
                  This Google account does not have a password yet. Create one below.
                </Text>
              </View>
            )}

            <PasswordInput
              label="New password"
              value={next}
              onChangeText={setNext}
              colors={colors}
              placeholder="At least 8 characters"
            />
            <PasswordInput
              label="Confirm new password"
              value={confirm}
              onChangeText={setConfirm}
              colors={colors}
              placeholder="Repeat your new password"
            />

            {/* Inline validation hints */}
            {next.length > 0 && next.length < 8 && (
              <Text style={{ color: theme.crimson, fontSize: 12, marginTop: -10, marginBottom: 10 }}>
                Password must be at least 8 characters.
              </Text>
            )}
            {confirm.length > 0 && next !== confirm && (
              <Text style={{ color: theme.crimson, fontSize: 12, marginTop: -10, marginBottom: 10 }}>
                Passwords do not match.
              </Text>
            )}
          </View>

          {/* Submit button */}
          <TouchableOpacity
            onPress={savePassword}
            disabled={!buttonActive}
            activeOpacity={0.85}
            style={{
              marginTop: 20,
              backgroundColor: buttonActive ? colors.gold : colors.deep,
              borderRadius: 14,
              padding: 17,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color={buttonActive ? '#fff' : colors.dim}
                />
                <Text style={{ color: buttonActive ? '#fff' : colors.dim, fontWeight: '800', fontSize: 15 }}>
                  {emailLogin ? 'Update password' : 'Create password'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
