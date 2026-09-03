import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import { useAppTheme } from '../../context/ThemeContext';
import { THEMES } from '../../constants/themes';
import { saveTourFeedback, TourFeedback, VisitType } from '../../utils/storage';
import { supabase } from '../../services/supabase';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Theme helpers ────────────────────────────────────────────────────────────
function buildC(t: typeof THEMES.light) {
  return {
    bg: t.bg,
    surface: t.surface,
    ink: t.ink,
    inkMid: t.inkMid,
    inkLight: t.inkDim,
    gold: t.gold,
    goldWarm: t.goldBright,
    goldSoft: t.goldSoft,
    goldGlow: t.goldGlow,
    border: t.border,
    borderGold: t.borderGold,
    success: t.teal,
    error: t.crimson,
  };
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const VISIT_TYPES: { key: VisitType; label: string; icon: string }[] = [
  { key: 'solo',   label: 'Solo',    icon: 'person-outline' },
  { key: 'couple', label: 'Couple',  icon: 'heart-outline' },
  { key: 'family', label: 'Family',  icon: 'home-outline' },
  { key: 'group',  label: 'Group',   icon: 'people-outline' },
  { key: 'school', label: 'School',  icon: 'school-outline' },
];

const HEARD_FROM_OPTIONS: { key: string; label: string; icon: string }[] = [
  { key: 'social_media', label: 'Social Media',  icon: 'logo-instagram' },
  { key: 'friend',       label: 'Friend / Family', icon: 'chatbubble-outline' },
  { key: 'flyer',        label: 'Flyer / Poster', icon: 'newspaper-outline' },
  { key: 'hotel',        label: 'Hotel / Tourism', icon: 'bed-outline' },
  { key: 'search',       label: 'Online Search',  icon: 'search-outline' },
  { key: 'other',        label: 'Other',          icon: 'ellipsis-horizontal-outline' },
];

// ─── Star Rating ──────────────────────────────────────────────────────────────
function StarRating({
  value,
  onChange,
  C,
}: {
  value: number;
  onChange: (v: number) => void;
  C: ReturnType<typeof buildC>;
}) {
  const scales = [1, 2, 3, 4, 5].map(() => useRef(new Animated.Value(1)).current);

  const tap = (star: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(star);
    Animated.sequence([
      Animated.timing(scales[star - 1], { toValue: 1.35, duration: 100, useNativeDriver: true }),
      Animated.spring(scales[star - 1], { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
  };

  const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  return (
    <View style={{ alignItems: 'center', gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity key={star} onPress={() => tap(star)} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ scale: scales[star - 1] }] }}>
              <Ionicons
                name={star <= value ? 'star' : 'star-outline'}
                size={38}
                color={star <= value ? C.gold : C.border}
              />
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>
      {value > 0 && (
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.gold, letterSpacing: 1 }}>
          {LABELS[value].toUpperCase()}
        </Text>
      )}
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, label, C }: { icon: string; label: string; C: ReturnType<typeof buildC> }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 }}>
      <Ionicons name={icon as any} size={14} color={C.gold} />
      <Text style={{ fontSize: 9.5, fontWeight: '800', color: C.gold, letterSpacing: 3 }}>{label}</Text>
    </View>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessView({ onClose, C }: { onClose: () => void; C: ReturnType<typeof buildC> }) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }),
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, opacity }}>
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        {/* Badge */}
        <View
          style={{
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: C.goldSoft,
            borderWidth: 2, borderColor: C.borderGold,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 28,
            shadowColor: C.gold, shadowOpacity: 0.2, shadowRadius: 20, elevation: 6,
          }}
        >
          <Ionicons name="checkmark-circle" size={52} color={C.gold} />
        </View>

        <Text style={{ fontSize: 9, fontWeight: '800', color: C.gold, letterSpacing: 3.5, marginBottom: 10 }}>
          TOUR COMPLETE
        </Text>
        <Text style={{ fontSize: 28, fontWeight: '900', color: C.ink, letterSpacing: -0.6, textAlign: 'center', lineHeight: 34 }}>
          Thank You for{'\n'}Your Feedback!
        </Text>

        <View style={{ width: 44, height: 3, backgroundColor: C.gold, borderRadius: 2, marginTop: 18, marginBottom: 20 }} />

        <Text style={{ fontSize: 14, color: C.inkMid, textAlign: 'center', lineHeight: 22, maxWidth: 280 }}>
          Your insights help us preserve and improve the Sacred Heritage experience for future visitors.
        </Text>

        {/* Decorative row */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 28, marginBottom: 40 }}>
          {['✦', '◈', '✦'].map((sym, i) => (
            <Text key={i} style={{ fontSize: 12, color: C.borderGold, letterSpacing: 2 }}>{sym}</Text>
          ))}
        </View>

        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.85}
          style={{
            backgroundColor: C.ink,
            paddingHorizontal: 52, paddingVertical: 16,
            borderRadius: 50,
            shadowColor: C.ink, shadowOpacity: 0.15,
            shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4,
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 }}>
            Continue Exploring
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  totalArtifacts: number;
  userId?: string;
  onClose: () => void;
}

export default function PostTourFeedback({ visible, totalArtifacts, userId, onClose }: Props) {
  const { theme } = useAppTheme();
  const C = buildC(theme);

  // Form state
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [rating, setRating] = useState(0);
  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [heardFrom, setHeardFrom] = useState<string[]>([]);
  const [highlights, setHighlights] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setStep('form');
      setRating(0);
      setVisitType(null);
      setHeardFrom([]);
      setHighlights('');
      setSuggestions('');
      setWouldRecommend(null);
      setError(null);

      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 350, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const toggleHeardFrom = (key: string) => {
    Haptics.selectionAsync();
    setHeardFrom(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const canSubmit = rating > 0 && visitType !== null && wouldRecommend !== null;

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError('Please fill in all required fields (★ rating, visit type, and recommendation).');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setError(null);
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const feedback: TourFeedback = {
      id:              uuidv4(),
      userId:          userId,
      overallRating:   rating,
      visitType:       visitType!,
      heardFrom,
      highlights:      highlights.trim(),
      suggestions:     suggestions.trim(),
      wouldRecommend:  wouldRecommend!,
      submittedAt:     Date.now(),
    };

    try {
      // 1. Persist locally first (always succeeds even offline)
      await saveTourFeedback(feedback);

      // 2. Send to Supabase (best-effort — don't block on failure)
      await supabase.from('tour_feedback').insert({
        id:               feedback.id,
        user_id:          feedback.userId ?? null,
        overall_rating:   feedback.overallRating,
        visit_type:       feedback.visitType,
        heard_from:       feedback.heardFrom,
        highlights:       feedback.highlights || null,
        suggestions:      feedback.suggestions || null,
        would_recommend:  feedback.wouldRecommend,
        total_artifacts:  totalArtifacts,
        submitted_at:     new Date(feedback.submittedAt).toISOString(),
      });
    } catch (_) {
      // Ignore Supabase errors — local save already succeeded
    } finally {
      setSubmitting(false);
    }

    setStep('success');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,8,6,0.80)', opacity: fadeAnim }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={dismiss} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles(C).sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {step === 'success' ? (
          <SuccessView onClose={dismiss} C={C} />
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* Drag Handle */}
            <View style={styles(C).handle} />

            {/* Close */}
            <TouchableOpacity style={styles(C).closeBtn} onPress={dismiss} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={C.inkMid} />
            </TouchableOpacity>

            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{ paddingBottom: 48 }}
            >
              {/* ── Hero Header ── */}
              <View style={styles(C).heroSection}>
                <View style={styles(C).trophyCircle}>
                  <Text style={{ fontSize: 36 }}>🏛️</Text>
                </View>
                <Text style={styles(C).eyebrow}>✦ TOUR COMPLETE</Text>
                <Text style={styles(C).heroTitle}>You've Explored All{'\n'}{totalArtifacts} Artifacts!</Text>
                <View style={styles(C).goldDivider} />
                <Text style={styles(C).heroSub}>
                  Share your experience to help us preserve this sacred heritage for future generations.
                </Text>
              </View>

              <View style={styles(C).formBody}>
                {/* ── Overall Rating ── */}
                <View style={styles(C).section}>
                  <SectionHeader icon="star-outline" label="OVERALL EXPERIENCE" C={C} />
                  <StarRating value={rating} onChange={setRating} C={C} />
                </View>

                {/* ── Visit Type ── */}
                <View style={styles(C).section}>
                  <SectionHeader icon="people-outline" label="HOW DID YOU VISIT?" C={C} />
                  <View style={styles(C).chipGrid}>
                    {VISIT_TYPES.map(vt => {
                      const active = visitType === vt.key;
                      return (
                        <TouchableOpacity
                          key={vt.key}
                          onPress={() => { setVisitType(vt.key); Haptics.selectionAsync(); }}
                          activeOpacity={0.75}
                          style={[styles(C).chip, active && styles(C).chipActive]}
                        >
                          <Ionicons name={vt.icon as any} size={16} color={active ? C.gold : C.inkMid} />
                          <Text style={[styles(C).chipLabel, active && styles(C).chipLabelActive]}>
                            {vt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* ── How Did You Hear ── */}
                <View style={styles(C).section}>
                  <SectionHeader icon="megaphone-outline" label="HOW DID YOU HEAR ABOUT US?" C={C} />
                  <View style={styles(C).chipGrid}>
                    {HEARD_FROM_OPTIONS.map(opt => {
                      const active = heardFrom.includes(opt.key);
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          onPress={() => toggleHeardFrom(opt.key)}
                          activeOpacity={0.75}
                          style={[styles(C).chip, active && styles(C).chipActive]}
                        >
                          <Ionicons name={opt.icon as any} size={16} color={active ? C.gold : C.inkMid} />
                          <Text style={[styles(C).chipLabel, active && styles(C).chipLabelActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* ── Highlights ── */}
                <View style={styles(C).section}>
                  <SectionHeader icon="sparkles-outline" label="WHAT DID YOU ENJOY MOST?" C={C} />
                  <TextInput
                    style={styles(C).textArea}
                    value={highlights}
                    onChangeText={setHighlights}
                    placeholder="Tell us about your favourite artifact or moment…"
                    placeholderTextColor={C.inkLight}
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  <Text style={styles(C).charCount}>{highlights.length}/500</Text>
                </View>

                {/* ── Suggestions ── */}
                <View style={styles(C).section}>
                  <SectionHeader icon="bulb-outline" label="ANY SUGGESTIONS?" C={C} />
                  <TextInput
                    style={styles(C).textArea}
                    value={suggestions}
                    onChangeText={setSuggestions}
                    placeholder="How can we improve your experience?"
                    placeholderTextColor={C.inkLight}
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  <Text style={styles(C).charCount}>{suggestions.length}/500</Text>
                </View>

                {/* ── Would Recommend ── */}
                <View style={styles(C).section}>
                  <SectionHeader icon="share-social-outline" label="WOULD YOU RECOMMEND THIS TOUR?" C={C} />
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {[
                      { value: true,  label: 'Yes, definitely!', icon: 'thumbs-up' },
                      { value: false, label: 'Not really',       icon: 'thumbs-down' },
                    ].map(opt => {
                      const active = wouldRecommend === opt.value;
                      return (
                        <TouchableOpacity
                          key={String(opt.value)}
                          onPress={() => { setWouldRecommend(opt.value); Haptics.selectionAsync(); }}
                          activeOpacity={0.75}
                          style={[styles(C).recommendBtn, active && styles(C).recommendBtnActive, { flex: 1 }]}
                        >
                          <Ionicons
                            name={opt.icon as any}
                            size={20}
                            color={active ? C.gold : C.inkMid}
                          />
                          <Text style={[styles(C).recommendLabel, active && styles(C).recommendLabelActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* ── Validation Error ── */}
                {error && (
                  <View style={styles(C).errorBox}>
                    <Ionicons name="alert-circle-outline" size={18} color={C.error} />
                    <Text style={styles(C).errorText}>{error}</Text>
                  </View>
                )}

                {/* ── Submit ── */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.85}
                  style={[styles(C).submitBtn, (!canSubmit || submitting) && styles(C).submitBtnDisabled]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={18} color="#FFF" />
                      <Text style={styles(C).submitBtnText}>Submit Feedback</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Skip */}
                <TouchableOpacity onPress={dismiss} activeOpacity={0.6} style={{ alignItems: 'center', marginTop: 14 }}>
                  <Text style={{ fontSize: 13, color: C.inkLight, textDecorationLine: 'underline' }}>
                    Skip for now
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function styles(C: ReturnType<typeof buildC>) {
  return StyleSheet.create({
    sheet: {
      position: 'absolute',
      left: 0, right: 0, bottom: 0,
      height: SCREEN_HEIGHT * 0.94,
      backgroundColor: C.bg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      overflow: 'hidden',
      borderTopWidth: 1,
      borderColor: C.borderGold,
      shadowColor: C.ink,
      shadowOpacity: 0.28,
      shadowOffset: { width: 0, height: -8 },
      shadowRadius: 24,
      elevation: 28,
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: C.border,
      alignSelf: 'center',
      marginTop: 12, marginBottom: 6,
    },
    closeBtn: {
      position: 'absolute', top: 14, right: 16, zIndex: 10,
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: C.goldGlow,
      borderWidth: 1, borderColor: C.border,
      justifyContent: 'center', alignItems: 'center',
    },

    // Hero
    heroSection: {
      alignItems: 'center',
      paddingTop: 24,
      paddingHorizontal: 28,
      paddingBottom: 28,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    trophyCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: C.goldSoft,
      borderWidth: 1.5, borderColor: C.borderGold,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 16,
      shadowColor: C.gold, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
    },
    eyebrow: {
      fontSize: 9.5, fontWeight: '800', color: C.gold,
      letterSpacing: 3.5, marginBottom: 8,
    },
    heroTitle: {
      fontSize: 26, fontWeight: '900', color: C.ink,
      letterSpacing: -0.6, textAlign: 'center', lineHeight: 33,
    },
    goldDivider: {
      width: 44, height: 3, borderRadius: 2,
      backgroundColor: C.gold, marginTop: 16, marginBottom: 14,
    },
    heroSub: {
      fontSize: 13.5, color: C.inkMid,
      textAlign: 'center', lineHeight: 21,
    },

    // Form
    formBody: { paddingHorizontal: 22, paddingTop: 24 },
    section: { marginBottom: 28 },

    // Chips
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, paddingVertical: 9,
      borderRadius: 50,
      backgroundColor: C.goldSoft,
      borderWidth: 1.5, borderColor: C.borderGold,
    },
    chipActive: {
      backgroundColor: C.goldGlow,
      borderColor: C.gold,
    },
    chipLabel: { fontSize: 12, fontWeight: '700', color: C.inkMid },
    chipLabelActive: { color: C.gold },

    // Textarea
    textArea: {
      backgroundColor: C.surface,
      borderWidth: 1.5, borderColor: C.border,
      borderRadius: 16,
      padding: 14,
      fontSize: 14, color: C.ink,
      lineHeight: 22,
      minHeight: 90,
    },
    charCount: {
      fontSize: 10, color: C.inkLight,
      textAlign: 'right', marginTop: 4,
    },

    // Recommend
    recommendBtn: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: C.goldSoft,
      borderWidth: 1.5, borderColor: C.borderGold,
    },
    recommendBtnActive: {
      backgroundColor: C.goldGlow,
      borderColor: C.gold,
    },
    recommendLabel: { fontSize: 13, fontWeight: '700', color: C.inkMid },
    recommendLabelActive: { color: C.gold },

    // Error
    errorBox: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      backgroundColor: '#FFF5F5',
      borderWidth: 1, borderColor: '#FFCDD2',
      borderRadius: 12, padding: 14, marginBottom: 16,
    },
    errorText: { flex: 1, fontSize: 13, color: C.error, lineHeight: 19 },

    // Submit
    submitBtn: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 10,
      backgroundColor: C.ink,
      paddingVertical: 17, borderRadius: 50,
      shadowColor: C.ink, shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4,
    },
    submitBtnDisabled: { opacity: 0.45 },
    submitBtnText: {
      color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.3,
    },
  });
}
