import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, FadeIn, FadeOut, ZoomIn, SlideInDown,
} from 'react-native-reanimated';
import { Ionicons as Icon } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { finalizePendingProfile } from '../../features/auth/services/pendingProfile';

const C = {
  bg: '#F7F4EF',
  surface: '#FFFFFF',
  ink: '#1A1612',
  inkMid: '#6B6459',
  inkLight: '#A89F96',
  gold: '#C9A84C',
  border: '#EAE4DA',
  error: '#C0392B',
  success: '#27AE60',
  warning: '#E67E22',
};

const OTP_LENGTH    = 6;
const TIMER_SECONDS = 180; // 3 minutes — matches Supabase OTP expiry
const MAX_ATTEMPTS  = 5;

const BOX_SIZE = 48;

type Status =
  | 'idle'
  | 'verifying'
  | 'success'
  | 'expired'
  | 'invalid'        // wrong code — shake + red, clears after 1.5 s
  | 'locked'         // ≥ MAX_ATTEMPTS wrong codes — wait for expiry
  | 'profile_error';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(s: number) {
  const m   = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function otpTimestampKey(email: string) {
  return `otp_sent_at_${email.toLowerCase().trim()}`;
}

async function saveOtpTimestamp(email: string) {
  await AsyncStorage.setItem(otpTimestampKey(email), Date.now().toString());
}

async function clearOtpTimestamp(email: string) {
  await AsyncStorage.removeItem(otpTimestampKey(email));
}

async function getRemainingSeconds(email: string): Promise<number> {
  const raw = await AsyncStorage.getItem(otpTimestampKey(email));
  if (!raw) return TIMER_SECONDS;
  const sentAt    = parseInt(raw, 10);
  const elapsed   = Math.floor((Date.now() - sentAt) / 1000);
  const remaining = TIMER_SECONDS - elapsed;
  return remaining > 0 ? remaining : 0;
}

// ─── Single digit box ─────────────────────────────────────────────────────────
function OtpBox({ digit, focused, hasError, locked }: {
  digit: string; focused: boolean; hasError: boolean; locked: boolean;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (digit && !hasError && !locked) {
      scale.value = withSequence(withSpring(1.15), withSpring(1));
    }
  }, [digit]);

  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[
      styles.otpBox,
      focused  && !hasError && !locked && styles.otpBoxFocused,
      hasError && styles.otpBoxError,
      locked   && styles.otpBoxLocked,
      digit    && !hasError && !locked && styles.otpBoxFilled,
      aStyle,
    ]}>
      <Text style={[
        styles.otpDigit,
        hasError && { color: C.error },
        locked   && { color: C.inkLight },
      ]}>
        {digit ? digit : focused && !locked ? '|' : ''}
      </Text>
    </Animated.View>
  );
}

// ─── Success overlay ──────────────────────────────────────────────────────────
function SuccessScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
      <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.successCard}>
        <View style={styles.successIconWrap}>
          <Icon name="checkmark" size={48} color="#FFF" />
        </View>
        <Text style={styles.successTitle}>Account Verified!</Text>
        <Text style={styles.successSub}>Your account has been successfully verified.</Text>
        <TouchableOpacity style={styles.continueBtn} onPress={onContinue} activeOpacity={0.85}>
          <Text style={styles.continueBtnTxt}>Continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Expired overlay ──────────────────────────────────────────────────────────
function ExpiredScreen({ onResend, onChangeEmail }: {
  onResend: () => void; onChangeEmail: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
      <Animated.View entering={SlideInDown.springify().damping(14)} style={styles.expiredCard}>
        <View style={styles.expiredIconWrap}>
          <Icon name="time-outline" size={44} color={C.gold} />
        </View>
        <Text style={styles.expiredTitle}>Code Expired</Text>
        <Text style={styles.expiredSub}>This code has expired for security reasons.</Text>
        <TouchableOpacity style={styles.continueBtn} onPress={onResend} activeOpacity={0.85}>
          <Text style={styles.continueBtnTxt}>Request New Code</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={onChangeEmail} activeOpacity={0.7}>
          <Text style={styles.ghostBtnTxt}>Change Email Address</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function VerifyOTP({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { email } = route.params as { email: string };

  const [code, setCode]           = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [status, setStatus]       = useState<Status>('idle');
  const [timeLeft, setTimeLeft]   = useState<number | null>(null);
  const [resending, setResending] = useState(false);
  const [profileError, setProfileError] = useState('');

  // ── Attempt tracking ──────────────────────────────────────────────────────
  // Counts wrong-code attempts this session (resets on resend).
  const [attempts, setAttempts] = useState(0);
  // How many remaining attempts to show the user (derived, not stored).
  const remainingAttempts = MAX_ATTEMPTS - attempts;

  const inputRef = useRef<TextInput>(null);
  const shakeX   = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── On mount: restore remaining time from AsyncStorage ────────────────────
  useEffect(() => {
    let cancelled = false;

    getRemainingSeconds(email).then(remaining => {
      if (cancelled) return;
      if (remaining <= 0) {
        setTimeLeft(0);
        setStatus('expired');
      } else {
        setTimeLeft(remaining);
      }
    });

    const focusTimer = setTimeout(() => inputRef.current?.focus(), 400);

    return () => {
      cancelled = true;
      clearTimeout(focusTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [email]);

  // ── Countdown tick ────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null || status === 'success' || status === 'profile_error') return;
    if (timeLeft <= 0) {
      // If locked due to attempts, the expired overlay takes over — also clears lock.
      setStatus(prev => (prev === 'success' ? prev : 'expired'));
      clearOtpTimestamp(email).catch(() => {});
      return;
    }
    timerRef.current = setTimeout(() => setTimeLeft(t => (t ?? 1) - 1), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, status]);

  // ── Shake animation ───────────────────────────────────────────────────────
  const shake = () => {
    shakeX.value = withSequence(
      withTiming(-12, { duration: 55 }), withTiming(12, { duration: 55 }),
      withTiming(-9,  { duration: 55 }), withTiming(9,  { duration: 55 }),
      withTiming(-6,  { duration: 55 }), withTiming(6,  { duration: 55 }),
      withTiming(0,   { duration: 55 }),
    );
  };

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  // ── Input ─────────────────────────────────────────────────────────────────
  const handleChangeText = (text: string) => {
    // Block input while locked, verifying, or in error flash
    if (status === 'locked' || status === 'verifying' || status === 'invalid') return;
    const cleaned = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(cleaned);
  };

  // ── Verify ────────────────────────────────────────────────────────────────
  const handleVerify = useCallback(async (codeToVerify: string) => {
    if (codeToVerify.length < OTP_LENGTH) return;
    if (status === 'locked') return;

    setStatus('verifying');
    inputRef.current?.blur();

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: codeToVerify,
      type: 'email',
    });

    if (!error) {
      // ── Success ────────────────────────────────────────────────────────
      await clearOtpTimestamp(email);
      try {
        if (!data.user) throw new Error('Verified user session was not returned.');
        await finalizePendingProfile(email, data.user.id);
        setStatus('success');
      } catch (setupError: any) {
        setProfileError(setupError?.message || 'Your profile could not be saved. Please try again.');
        setStatus('profile_error');
      }
    } else if (
      // Only treat as expired when Supabase explicitly says the token has
      // expired AND there is no "invalid" qualifier — a wrong code comes
      // back as "invalid" or "Token has expired or is invalid" which must
      // NOT pop the expired overlay (just shake + red boxes instead).
      error.message?.toLowerCase().includes('expired') &&
      !error.message?.toLowerCase().includes('invalid')
    ) {
      // ── OTP truly expired (server confirmed, timer ran out) ───────────
      setStatus('expired');
      await clearOtpTimestamp(email);
    } else {
      // ── Wrong code ────────────────────────────────────────────────────
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      shake();
      setCode('');

      if (newAttempts >= MAX_ATTEMPTS) {
        // Max attempts reached — lock the input until timer expires / resend
        setStatus('locked');
        // No auto-focus, no auto-reset — user must wait for resend
      } else {
        // Still have attempts left — flash red then let them try again
        setStatus('invalid');
        setTimeout(() => {
          setStatus('idle');
          inputRef.current?.focus();
        }, 1500);
      }
    }
  }, [email, attempts, status]);

  // Auto-verify once all 6 digits are entered
  useEffect(() => {
    if (code.length === OTP_LENGTH && status === 'idle') {
      handleVerify(code);
    }
  }, [code, handleVerify]);

  // ── Resend ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    setResending(true);
    setCode('');
    setStatus('idle');
    setAttempts(0); // reset the attempt counter for the fresh code
    try {
      await supabase.auth.resend({ type: 'signup', email });
      await saveOtpTimestamp(email);
      setTimeLeft(TIMER_SECONDS);
    } catch {
      setTimeLeft(TIMER_SECONDS);
    } finally {
      setResending(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  };

  // ── Derived UI values ─────────────────────────────────────────────────────
  const digits    = Array.from({ length: OTP_LENGTH }, (_, i) => code[i] ?? '');
  const hasError  = status === 'invalid';
  const isLocked  = status === 'locked';
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) =>
    a + '*'.repeat(b.length) + c
  );

  if (timeLeft === null) return null;

  // Resend available after 30 s have elapsed (unless locked — then always available)
  const resendDisabled = resending || (!isLocked && (timeLeft ?? 0) > TIMER_SECONDS - 30);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {status === 'success' && (
        <SuccessScreen onContinue={() => { supabase.auth.refreshSession().catch(() => {}); }} />
      )}
      {status === 'expired' && (
        <ExpiredScreen
          onResend={handleResend}
          onChangeEmail={() => navigation.navigate('SignUp')}
        />
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableOpacity
          style={[styles.back, { paddingTop: insets.top + 16 }]}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>

        <View style={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
          <Animated.View entering={ZoomIn.springify()} style={styles.iconWrap}>
            <Icon name="mail-outline" size={32} color={C.gold} />
          </Animated.View>

          <Text style={styles.heading}>Verify Your Account</Text>
          <Text style={styles.sub}>
            We've sent a 6-digit code to{'\n'}
            <Text style={styles.emailHighlight}>{maskedEmail}</Text>
          </Text>

          {/* OTP boxes */}
          <Pressable
            onPress={() => !isLocked && inputRef.current?.focus()}
            style={styles.boxesWrap}
          >
            <Animated.View style={[styles.boxRow, shakeStyle]}>
              {digits.map((digit, i) => (
                <OtpBox
                  key={i}
                  digit={digit}
                  focused={isFocused && code.length === i && !isLocked}
                  hasError={hasError}
                  locked={isLocked}
                />
              ))}
            </Animated.View>
          </Pressable>

          {/* Hidden real TextInput */}
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleChangeText}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            autoFocus={false}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            caretHidden
            editable={!isLocked}
            style={styles.hiddenInput}
          />

          {/* Attempt-based feedback messages */}
          {hasError && !isLocked && (
            <Animated.Text entering={FadeIn} exiting={FadeOut} style={styles.errorTxt}>
              Incorrect code.{' '}
              {remainingAttempts > 1
                ? `${remainingAttempts} attempts remaining.`
                : '1 attempt remaining — be careful!'}
            </Animated.Text>
          )}

          {isLocked && (
            <Animated.View entering={FadeIn} style={styles.lockedBanner}>
              <Icon name="lock-closed-outline" size={15} color={C.error} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.lockedTitle}>Too many incorrect attempts</Text>
                <Text style={styles.lockedSub}>
                  Please wait for this code to expire, then request a new one below.
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Timer */}
          <View style={styles.timerRow}>
            <Icon
              name="time-outline"
              size={14}
              color={timeLeft < 60 ? C.error : C.inkLight}
            />
            <Text style={[styles.timerTxt, timeLeft < 60 && { color: C.error }]}>
              {formatTime(timeLeft)}
            </Text>
          </View>

          {/* Verify button */}
          <TouchableOpacity
            style={[
              styles.verifyBtn,
              (status === 'verifying' || code.length < OTP_LENGTH || status === 'profile_error' || isLocked) &&
                styles.btnOff,
            ]}
            onPress={() => handleVerify(code)}
            disabled={status === 'verifying' || code.length < OTP_LENGTH || status === 'profile_error' || isLocked}
            activeOpacity={0.85}
          >
            {status === 'verifying'
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.verifyBtnTxt}>
                  {isLocked ? 'Input Locked' : 'Verify Code'}
                </Text>
            }
          </TouchableOpacity>

          {/* Profile error retry card */}
          {status === 'profile_error' && (
            <View style={styles.profileErrorCard}>
              <Icon name="cloud-offline-outline" size={18} color={C.error} />
              <View style={styles.profileErrorCopy}>
                <Text style={styles.profileErrorTitle}>Profile setup needs another try</Text>
                <Text style={styles.profileErrorText}>{profileError}</Text>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  setStatus('verifying');
                  const { data: sessionData } = await supabase.auth.getSession();
                  try {
                    if (!sessionData.session?.user) throw new Error('Your session expired. Please sign in again.');
                    await finalizePendingProfile(email, sessionData.session.user.id);
                    setStatus('success');
                    await supabase.auth.refreshSession();
                  } catch (retryError: any) {
                    setProfileError(retryError?.message || 'Profile setup failed.');
                    setStatus('profile_error');
                  }
                }}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Resend row */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>
              {isLocked ? 'Locked out? ' : "Didn't receive it? "}
            </Text>
            <TouchableOpacity onPress={handleResend} disabled={resendDisabled}>
              {resending
                ? <ActivityIndicator size="small" color={C.gold} />
                : <Text style={[styles.resendLink, resendDisabled && styles.resendDisabled]}>
                    {isLocked ? 'Resend New Code' : 'Resend Code'}
                  </Text>
              }
            </TouchableOpacity>
          </View>

          {/* Attempt dots — only shown while unlocked and at least 1 attempt used */}
          {!isLocked && attempts > 0 && (
            <Animated.View entering={FadeIn} style={styles.attemptDots}>
              {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i < attempts ? styles.dotUsed : styles.dotFree,
                  ]}
                />
              ))}
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  back: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },

  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#F5EDD8',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  heading: {
    fontSize: 26, fontWeight: '800', color: C.ink,
    marginBottom: 10, textAlign: 'center',
  },
  sub: {
    fontSize: 14, color: C.inkMid,
    textAlign: 'center', lineHeight: 22, marginBottom: 36,
  },
  emailHighlight: { color: C.gold, fontWeight: '700' },

  boxesWrap: { marginBottom: 16 },
  boxRow: { flexDirection: 'row', gap: 10 },
  otpBox: {
    width: BOX_SIZE, height: BOX_SIZE + 8, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  otpBoxFocused: { borderColor: C.gold, backgroundColor: '#FFFDF6' },
  otpBoxFilled:  { borderColor: C.ink },
  otpBoxError:   { borderColor: C.error, backgroundColor: '#FDF0EE' },
  otpBoxLocked:  { borderColor: '#D0C9C0', backgroundColor: '#F2EFE9', opacity: 0.7 },
  otpDigit: { fontSize: 22, fontWeight: '800', color: C.ink },

  hiddenInput: {
    position: 'absolute', width: 1, height: 1,
    opacity: 0.01, bottom: 0, left: 0,
  },

  errorTxt: {
    color: C.error, fontSize: 13,
    marginBottom: 10, textAlign: 'center',
  },

  lockedBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 9,
    width: '100%', marginBottom: 12,
    backgroundColor: '#FDF0EE',
    borderWidth: 1, borderColor: '#F5C6C0',
    borderRadius: 12, padding: 13,
  },
  lockedTitle: {
    color: C.error, fontSize: 13, fontWeight: '800', marginBottom: 3,
  },
  lockedSub: {
    color: C.inkMid, fontSize: 12, lineHeight: 17,
  },

  timerRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5, marginBottom: 28,
  },
  timerTxt: { fontSize: 13, color: C.inkLight, fontWeight: '600' },

  verifyBtn: {
    width: '100%', backgroundColor: C.ink,
    paddingVertical: 17, borderRadius: 14, alignItems: 'center',
    shadowColor: C.ink, shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4,
  },
  btnOff: { opacity: 0.45 },
  verifyBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  profileErrorCard: {
    width: '100%', marginTop: 14, padding: 13, borderRadius: 12,
    backgroundColor: '#FDF0EE', flexDirection: 'row', alignItems: 'center', gap: 9,
  },
  profileErrorCopy: { flex: 1 },
  profileErrorTitle: { color: C.error, fontSize: 12, fontWeight: '800' },
  profileErrorText: { color: C.inkMid, fontSize: 10.5, lineHeight: 15, marginTop: 2 },
  retryButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: C.error },
  retryButtonText: { color: '#FFF', fontSize: 11, fontWeight: '800' },

  resendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  resendLabel: { color: C.inkMid, fontSize: 14 },
  resendLink: { color: C.gold, fontWeight: '700', fontSize: 14 },
  resendDisabled: { color: C.inkLight },

  // Attempt indicator dots
  attemptDots: {
    flexDirection: 'row', gap: 7, marginTop: 14, alignItems: 'center',
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
  },
  dotFree: { backgroundColor: C.border },
  dotUsed: { backgroundColor: C.error },

  overlay: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: 'rgba(26,22,18,0.55)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 99, padding: 28,
  },
  successCard: {
    backgroundColor: C.surface, borderRadius: 24,
    padding: 36, alignItems: 'center', width: '100%',
  },
  successIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: C.success,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  successTitle: { fontSize: 24, fontWeight: '800', color: C.ink, marginBottom: 10 },
  successSub: {
    fontSize: 14, color: C.inkMid,
    textAlign: 'center', marginBottom: 32, lineHeight: 20,
  },

  expiredCard: {
    backgroundColor: C.surface, borderRadius: 24,
    padding: 36, alignItems: 'center', width: '100%',
  },
  expiredIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#FEF9EC',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  expiredTitle: { fontSize: 24, fontWeight: '800', color: C.ink, marginBottom: 10 },
  expiredSub: {
    fontSize: 14, color: C.inkMid,
    textAlign: 'center', marginBottom: 28, lineHeight: 20,
  },

  continueBtn: {
    width: '100%', backgroundColor: C.ink,
    paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginBottom: 12,
  },
  continueBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  ghostBtn: { paddingVertical: 12 },
  ghostBtnTxt: { color: C.inkMid, fontSize: 14, fontWeight: '600' },
});
