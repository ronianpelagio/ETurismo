import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../context/ThemeContext';
import { THEMES } from '../constants/themes';
import { supabase } from '../services/supabase';
import type { Artifact } from '../features/artifacts/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Theme helpers ────────────────────────────────────────────────────────────
function buildC(t: typeof THEMES[keyof typeof THEMES]) {
  return {
    bg: t.bg,
    surface: t.surface,
    ink: t.ink,
    inkMid: t.inkMid,
    inkLight: t.inkDim,
    gold: t.gold,
    goldSoft: t.goldSoft,
    goldGlow: t.goldGlow,
    border: t.border,
    borderGold: t.borderGold,
    success: t.teal,
    error: t.crimson,
  };
}

type C = ReturnType<typeof buildC>;

function makeStyles(C: C) {
  return StyleSheet.create({
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: C.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 24,
      paddingBottom: 36,
      paddingTop: 20,
      shadowColor: C.ink,
      shadowOpacity: 0.28,
      shadowOffset: { width: 0, height: -6 },
      shadowRadius: 22,
      elevation: 26,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.border,
      marginBottom: 24,
    },
    header: { marginBottom: 6 },
    eyebrow: {
      fontSize: 10,
      letterSpacing: 3,
      fontWeight: '700',
      color: C.gold,
      marginBottom: 6,
    },
    title: {
      fontSize: 24,
      fontWeight: '900',
      color: C.ink,
      letterSpacing: -0.6,
      lineHeight: 30,
    },
    artifactName: {
      fontSize: 14,
      color: C.inkMid,
      marginTop: 4,
      marginBottom: 12,
    },
    goldLine: {
      width: 36,
      height: 3,
      backgroundColor: C.gold,
      borderRadius: 2,
      marginTop: 10,
      marginBottom: 20,
    },

    // ── Community aggregate ──
    aggregateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: C.goldSoft,
      borderWidth: 1,
      borderColor: C.borderGold,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 20,
    },
    aggregateText: {
      fontSize: 13,
      fontWeight: '700',
      color: C.ink,
    },
    aggregateSub: {
      fontSize: 12,
      color: C.inkMid,
      flex: 1,
    },

    // ── Stars ──
    starsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      marginBottom: 12,
    },
    starBtn: { padding: 4 },
    ratingLabel: {
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '700',
      color: C.inkMid,
      marginBottom: 20,
      minHeight: 18,
    },

    // ── Input ──
    inputLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      color: C.inkLight,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    textInput: {
      backgroundColor: C.bg,
      borderWidth: 1.5,
      borderColor: C.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 14,
      color: C.ink,
      minHeight: 80,
      textAlignVertical: 'top',
      marginBottom: 20,
    },
    textInputFocused: { borderColor: C.gold },

    // ── Buttons ──
    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: C.ink,
      borderRadius: 50,
      paddingVertical: 16,
      marginBottom: 12,
      shadowColor: C.ink,
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 5,
    },
    submitBtnDisabled: { opacity: 0.45 },
    submitBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 0.3,
    },
    skipBtn: { alignItems: 'center', paddingVertical: 10 },
    skipBtnText: { fontSize: 14, color: C.inkMid, fontWeight: '600' },

    // ── Error ──
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(200,50,50,0.08)',
      borderWidth: 1,
      borderColor: C.error,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    errorText: { flex: 1, fontSize: 13, color: C.error, lineHeight: 18 },

    // ── Success ──
    successWrap: {
      alignItems: 'center',
      paddingVertical: 12,
      gap: 12,
    },
    successCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: C.goldSoft,
      borderWidth: 1.5,
      borderColor: C.borderGold,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    successTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: C.ink,
      letterSpacing: -0.5,
    },
    successSub: {
      fontSize: 14,
      color: C.inkMid,
      textAlign: 'center',
      lineHeight: 22,
    },
    successStarsRow: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
    },
  });
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor — Not what I expected',
  2: 'Fair — Could be better',
  3: 'Good — Enjoyed it',
  4: 'Great — Very informative',
  5: 'Excellent — Truly remarkable!',
};

interface ArtifactRatingModalProps {
  visible: boolean;
  artifact: Artifact | null;
  onDone: () => void;
}

export default function ArtifactRatingModal({
  visible,
  artifact,
  onDone,
}: ArtifactRatingModalProps) {
  const { theme } = useAppTheme();
  const C = buildC(theme);
  const styles = makeStyles(C);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const [rating, setRating]             = useState(0);
  const [comment, setComment]           = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  // true when this user already submitted a rating for this artifact before
  const [hasExistingRating, setHasExistingRating] = useState(false);

  // Community aggregate for this artifact
  const [avgRating, setAvgRating]   = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState(0);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      setRating(0);
      setComment('');
      setSubmitted(false);
      setError(null);
      setAvgRating(null);
      setRatingCount(0);
      setHasExistingRating(false);

      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      // Load existing rating + aggregate after open
      if (artifact) {
        loadExistingRating(artifact.id);
        loadAggregate(artifact.id);
      }
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 320, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Load the current user's existing rating for this artifact (if any)
  async function loadExistingRating(artifactId: string) {
    setLoadingExisting(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data } = await supabase
        .from('artifact_ratings')
        .select('rating, comment')
        .eq('artifact_id', artifactId)
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (data) {
        setRating(data.rating);
        setComment(data.comment ?? '');
        setHasExistingRating(true);
      }
    } catch (_) {
      // Non-fatal — just start fresh
    } finally {
      setLoadingExisting(false);
    }
  }

  // Load community average + count for this artifact
  async function loadAggregate(artifactId: string) {
    try {
      const { data } = await supabase
        .from('artifact_rating_summary')
        .select('avg_rating, rating_count')
        .eq('artifact_id', artifactId)
        .maybeSingle();

      if (data) {
        setAvgRating(data.avg_rating != null ? Number(data.avg_rating) : null);
        setRatingCount(data.rating_count ?? 0);
      }
    } catch (_) {
      // View not created yet or no data — silently ignore
    }
  }

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 320, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onDone());
  };

  const handleStarPress = (star: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRating(star);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!rating) {
      setError('Please tap a star to rate this artifact.');
      return;
    }
    if (!artifact) return;

    setSubmitting(true);
    setError(null);

    try {
      // Always get the live authenticated user — never rely on a passed prop
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser();

      if (authErr || !authUser) {
        setError('Your session could not be verified. Please sign in again.');
        return;
      }

      const { error: dbErr } = await supabase
        .from('artifact_ratings')
        .upsert(
          {
            user_id:     authUser.id,
            artifact_id: artifact.id,
            rating,
            comment:     comment.trim() || null,
          },
          { onConflict: 'user_id,artifact_id' },
        );

      if (dbErr) throw dbErr;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);

      // Refresh aggregate after successful submit
      await loadAggregate(artifact.id);

      // Auto-close after 1.8 s
      setTimeout(() => dismiss(), 1800);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e.message ?? 'Unable to submit your rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!artifact) return null;

  const hasAggregate = avgRating !== null && ratingCount > 0;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,8,6,0.6)', opacity: fadeAnim }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={dismiss} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />

          {submitted ? (
            /* ── Success ── */
            <View style={styles.successWrap}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={30} color={C.gold} />
              </View>
              <Text style={styles.successTitle}>Thank you!</Text>
              <Text style={styles.successSub}>
                Your rating for{'\n'}
                <Text style={{ fontWeight: '800', color: C.ink }}>{artifact.name}</Text>
                {'\n'}{hasExistingRating ? 'has been updated.' : 'has been saved.'}
              </Text>
              <View style={styles.successStarsRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <Ionicons
                    key={s}
                    name={rating >= s ? 'star' : 'star-outline'}
                    size={22}
                    color={rating >= s ? C.gold : C.border}
                  />
                ))}
              </View>
              {hasAggregate && (
                <Text style={{ fontSize: 13, color: C.inkMid, marginTop: 4 }}>
                  Community average: ★ {avgRating!.toFixed(1)} ({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})
                </Text>
              )}
            </View>
          ) : (
            <>
              {/* ── Header ── */}
              <View style={styles.header}>
                <Text style={styles.eyebrow}>ARTIFACT RATING</Text>
                <Text style={styles.title}>
                  {hasExistingRating ? 'Update your rating' : 'How was this artifact?'}
                </Text>
                <Text style={styles.artifactName}>{artifact.name}</Text>
                {hasExistingRating && (
                  <Text style={{ fontSize: 12, color: C.inkLight, marginTop: 2 }}>
                    You already rated this — tap a star to change it.
                  </Text>
                )}
              </View>
              <View style={styles.goldLine} />

              {/* ── Community aggregate ── */}
              {hasAggregate && (
                <View style={styles.aggregateRow}>
                  <Ionicons name="star" size={16} color={C.gold} />
                  <Text style={styles.aggregateText}>{avgRating!.toFixed(1)}</Text>
                  <Text style={styles.aggregateSub}>
                    from {ratingCount} {ratingCount === 1 ? 'visitor' : 'visitors'}
                  </Text>
                </View>
              )}

              {/* ── Stars ── */}
              {loadingExisting ? (
                <ActivityIndicator size="small" color={C.gold} style={{ marginBottom: 20 }} />
              ) : (
                <>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <TouchableOpacity
                        key={star}
                        style={styles.starBtn}
                        onPress={() => handleStarPress(star)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
                        accessibilityState={{ selected: rating >= star }}
                      >
                        <Ionicons
                          name={rating >= star ? 'star' : 'star-outline'}
                          size={40}
                          color={rating >= star ? C.gold : C.border}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.ratingLabel}>
                    {rating > 0 ? RATING_LABELS[rating] : 'Tap a star to rate'}
                  </Text>
                </>
              )}

              {/* ── Comment ── */}
              <Text style={styles.inputLabel}>Your impression (optional)</Text>
              <TextInput
                style={[styles.textInput, inputFocused && styles.textInputFocused]}
                placeholder="Share a short impression…"
                placeholderTextColor={C.inkLight}
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={300}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
              />

              {/* ── Error ── */}
              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={18} color={C.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* ── Submit ── */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Submit artifact rating"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.submitBtnText}>
                      {hasExistingRating ? 'Update Rating' : 'Submit Rating'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* ── Skip ── */}
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={dismiss}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Skip rating"
              >
                <Text style={styles.skipBtnText}>Skip for now</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
