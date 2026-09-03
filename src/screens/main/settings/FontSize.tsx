import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '../../../context/ThemeContext';
import { useAppContext, FontSizeLevel, FONT_SCALE } from '../../../context/AppContext';
import { THEMES } from '../../../constants/themes';

function buildC(t: typeof THEMES.light) {
  return {
    bg: t.bg, surface: t.surface, raised: t.raised,
    ink: t.ink, inkMid: t.inkMid, inkDim: t.inkDim,
    gold: t.gold, goldSoft: t.goldSoft, borderGold: t.borderGold,
    border: t.border, crimson: t.crimson,
  };
}

const OPTIONS: { level: FontSizeLevel; label: string; subtitle: string; icon: string }[] = [
  { level: 'small',  label: 'Small',  subtitle: 'Compact — more content visible', icon: 'text-outline' },
  { level: 'medium', label: 'Medium', subtitle: 'Default — balanced readability',  icon: 'text' },
  { level: 'large',  label: 'Large',  subtitle: 'Accessible — easier to read',     icon: 'expand-outline' },
];

export default function FontSizeScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const C = buildC(theme);
  const { fontSizeLevel, setFontSizeLevel } = useAppContext();
  const [selected, setSelected] = useState<FontSizeLevel>(fontSizeLevel);
  const [saving, setSaving] = useState(false);

  const apply = async () => {
    setSaving(true);
    await setFontSizeLevel(selected);
    setSaving(false);
    navigation?.goBack();
  };

  const PREVIEW_BASE = 15;

  const s = StyleSheet.create({
    safe:        { flex: 1, backgroundColor: C.bg },
    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
    backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
    pageTitle:   { fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
    heroContent: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 28 },
    eyebrow:     { fontSize: 9, letterSpacing: 4, color: C.gold, fontWeight: '700', marginBottom: 8 },
    heroTitle:   { fontSize: 34, fontWeight: '900', color: C.ink, letterSpacing: -1.2, lineHeight: 38 },
    body:        { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
    card:        { borderRadius: 18, borderWidth: 1.5, overflow: 'hidden', marginBottom: 4 },
    cardInner:   { padding: 18, gap: 10 },
    cardTop:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconBox:     { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    labelBlock:  { flex: 1 },
    label:       { fontSize: 16, fontWeight: '700' },
    subtitle:    { fontSize: 12, marginTop: 2 },
    checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    previewBox:  { borderRadius: 12, padding: 14, borderWidth: 1 },
    previewText: { lineHeight: 22 },
    applyBtn:    { marginHorizontal: 20, marginTop: 28, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    applyTxt:    { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
    note:        { textAlign: 'center', fontSize: 11, color: C.inkDim, marginTop: 12, paddingHorizontal: 20, lineHeight: 16 },
  });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Header ── */}
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
            <Text style={s.pageTitle}>Text Size</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={s.heroContent}>
            <Text style={s.eyebrow}>ACCESSIBILITY</Text>
            <Text style={s.heroTitle}>Choose Text{'\n'}Size</Text>
          </View>
        </ImageBackground>

        {/* ── Options ── */}
        <View style={s.body}>
          {OPTIONS.map(opt => {
            const isActive = selected === opt.level;
            const scale = FONT_SCALE[opt.level];
            return (
              <TouchableOpacity
                key={opt.level}
                style={[s.card, {
                  borderColor: isActive ? C.gold : C.border,
                  backgroundColor: isActive ? C.goldSoft : C.surface,
                }]}
                onPress={() => setSelected(opt.level)}
                activeOpacity={0.8}
              >
                <View style={s.cardInner}>
                  {/* Top row */}
                  <View style={s.cardTop}>
                    <View style={[s.iconBox, { backgroundColor: isActive ? C.gold : C.border }]}>
                      <Ionicons name={opt.icon as any} size={22} color={isActive ? '#fff' : C.inkMid} />
                    </View>
                    <View style={s.labelBlock}>
                      <Text style={[s.label, { color: C.ink, fontSize: 16 * scale }]}>{opt.label}</Text>
                      <Text style={[s.subtitle, { color: C.inkDim }]}>{opt.subtitle}</Text>
                    </View>
                    <View style={[s.checkCircle, { borderColor: isActive ? C.gold : C.border, backgroundColor: isActive ? C.gold : 'transparent' }]}>
                      {isActive && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                  </View>

                  {/* Preview text */}
                  <View style={[s.previewBox, { backgroundColor: C.bg, borderColor: C.border }]}>
                    <Text style={[s.previewText, { fontSize: PREVIEW_BASE * scale, color: C.inkMid }]}>
                      "The gilded monstrance dates to the 18th century, crafted by local silversmiths as a centrepiece for Corpus Christi processions."
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Apply button ── */}
        <TouchableOpacity
          style={[s.applyBtn, { backgroundColor: selected !== fontSizeLevel ? C.gold : C.border }]}
          onPress={apply}
          disabled={saving || selected === fontSizeLevel}
          activeOpacity={0.85}
        >
          <Text style={[s.applyTxt, { color: selected !== fontSizeLevel ? '#fff' : C.inkDim }]}>
            {saving ? 'Applying…' : selected === fontSizeLevel ? 'Already applied' : 'Apply Text Size'}
          </Text>
        </TouchableOpacity>

        <Text style={s.note}>
          Text size affects artifact descriptions and labels throughout the app.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
