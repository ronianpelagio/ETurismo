import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  withSequence, FadeIn, FadeOut, ZoomIn, SlideInDown,
} from 'react-native-reanimated';
import { Ionicons as Icon } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';

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
};

const OTP_LENGTH = 6;
const TIMER_SECONDS = 300;
const BOX_SIZE = 48;

type Status = 'idle' | 'verifying' | 'success' | 'expired' | 'invalid';

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

// ─── Single digit box ─────────────────────────────────────────────────────────
function OtpBox({
  digit, focused, hasError,
}: {
  digit: string; focused: boolean; hasError: boolean;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (digit) scale.value = withSequence(withSpring(1.15), withSpring(1));
  }, [digit]);

  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[
      styles.otpBox,
      focused  && styles.otpBoxFocused,
      hasError && styles.otpBoxError,
      digit    && styles.otpBoxFilled,
      aStyle,
    ]}>
      <Text style={[styles.otpDigit, hasError && { color: C.error }]}>
        {digit ? digit : focused ? '|' : ''}
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
function ExpiredScreen({
  onResend, onChangeEmail,
}: {
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
  const { email } = route.params as { email: string };

  const [code, setCode]           = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [status, setStatus]       = useState<Status>('idle');
  const [timeLeft, setTimeLeft]   = useState(TIMER_SECONDS);
  const [resending, setResending] = useState(false);

  // ONE real TextInput drives all six visual boxes
  const inputRef = useRef<TextInput>(null);
  const shakeX   = useSharedValue(0);

  // Auto-focus on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) { setStatus('expired'); return; }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft]);

  const shake = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 60 }), withTiming(10, { duration: 60 }),
      withTiming(-8,  { duration: 60 }), withTiming(8,  { duration: 60 }),
      withTiming(0,   { duration: 60 }),
    );
  };

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const handleChangeText = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(cleaned);
    if (status === 'invalid') setStatus('idle');
  };

  const handleVerify = useCallback(async (codeToVerify: string) => {
    if (codeToVerify.length < OTP_LENGTH) return;

    setStatus('verifying');
    inputRef.current?.blur();

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: codeToVerify,
      type: 'email',
    });

    if (!error) {
      setStatus('success');
    } else if (
      error.message?.toLowerCase().includes('expired') ||
      error.message?.toLowerCase().includes('otp')
    ) {
      setStatus('expired');
    } else {
      setStatus('invalid');
      shake();
      setCode('');
      setTimeout(() => {
        setStatus('idle');
        inputRef.current?.focus();
      }, 1500);
    }
  }, [email]);

  // Auto-verify once all 6 digits are entered
  useEffect(() => {
    if (code.length === OTP_LENGTH && status === 'idle') {
      handleVerify(code);
    }
  }, [code]);

  const handleResend = async () => {
    setResending(true);
    setCode('');
    setStatus('idle');
    setTimeLeft(TIMER_SECONDS);
    try {
      await supabase.auth.resend({ type: 'email', email });
    } catch {
      // silently fail
    } finally {
      setResending(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  };

  // Spread the single `code` string across 6 visual boxes
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => code[i] ?? '');
  const hasError    = status === 'invalid';
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) =>
    a + '*'.repeat(b.length) + c
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {status === 'success' && (
        <SuccessScreen onContinue={() => navigation.replace('SignIn')} />
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
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>

        <View style={styles.content}>
          <Animated.View entering={ZoomIn.springify()} style={styles.iconWrap}>
            <Icon name="mail-outline" size={32} color={C.gold} />
          </Animated.View>

          <Text style={styles.heading}>Verify Your Account</Text>
          <Text style={styles.sub}>
            We've sent a 6-digit code to{'\n'}
            <Text style={styles.emailHighlight}>{maskedEmail}</Text>
          </Text>

          {/* Tap anywhere on the boxes row to (re-)focus the input */}
          <Pressable onPress={() => inputRef.current?.focus()} style={styles.boxesWrap}>
            <Animated.View style={[styles.boxRow, shakeStyle]}>
              {digits.map((digit, i) => (
                <OtpBox
                  key={i}
                  digit={digit}
                  focused={isFocused && code.length === i}
                  hasError={hasError}
                />
              ))}
            </Animated.View>
          </Pressable>

          {/*
            ── The real TextInput ──────────────────────────────────────────
            Positioned off-screen so it never visually appears, but remains
            accessible to the OS keyboard.
            IMPORTANT: opacity:0 on Android prevents the keyboard from
            showing — we use opacity:0.01 instead (invisible but tappable).
          */}
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
            style={styles.hiddenInput}
          />

          {hasError && (
            <Animated.Text entering={FadeIn} exiting={FadeOut} style={styles.errorTxt}>
              Incorrect code. Please try again.
            </Animated.Text>
          )}

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

          <TouchableOpacity
            style={[
              styles.verifyBtn,
              (status === 'verifying' || code.length < OTP_LENGTH) && styles.btnOff,
            ]}
            onPress={() => handleVerify(code)}
            disabled={status === 'verifying' || code.length < OTP_LENGTH}
            activeOpacity={0.85}
          >
            {status === 'verifying'
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.verifyBtnTxt}>Verify Code</Text>
            }
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't receive it? </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resending || timeLeft > TIMER_SECONDS - 30}
            >
              {resending
                ? <ActivityIndicator size="small" color={C.gold} />
                : <Text style={[
                    styles.resendLink,
                    timeLeft > TIMER_SECONDS - 30 && styles.resendDisabled,
                  ]}>
                    Resend Code
                  </Text>
              }
            </TouchableOpacity>
          </View>
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

  // Boxes
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
  otpDigit: { fontSize: 22, fontWeight: '800', color: C.ink },

  // opacity:0 blocks keyboard on Android — use 0.01 (invisible but functional)
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.01,
    bottom: 0,
    left: 0,
  },

  errorTxt: { color: C.error, fontSize: 13, marginBottom: 12 },

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

  resendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  resendLabel: { color: C.inkMid, fontSize: 14 },
  resendLink: { color: C.gold, fontWeight: '700', fontSize: 14 },
  resendDisabled: { color: C.inkLight },

  // Overlays
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
