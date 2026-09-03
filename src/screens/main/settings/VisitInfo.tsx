import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '../../../context/ThemeContext';
import { useAppContext } from '../../../context/AppContext';
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

// ─── Data ────────────────────────────────────────────────────────────────────────

const HOURS = [
  { day: 'Monday',    open: '8:00 AM', close: '5:00 PM', isToday: new Date().getDay() === 1 },
  { day: 'Tuesday',   open: '8:00 AM', close: '5:00 PM', isToday: new Date().getDay() === 2 },
  { day: 'Wednesday', open: '8:00 AM', close: '5:00 PM', isToday: new Date().getDay() === 3 },
  { day: 'Thursday',  open: '8:00 AM', close: '5:00 PM', isToday: new Date().getDay() === 4 },
  { day: 'Friday',    open: '8:00 AM', close: '5:00 PM', isToday: new Date().getDay() === 5 },
  { day: 'Saturday',  open: '8:00 AM', close: '5:00 PM', isToday: new Date().getDay() === 6 },
  { day: 'Sunday',    open: '8:00 AM', close: '5:00 PM', isToday: new Date().getDay() === 0 },
];

const ADMISSION = [
  { label: 'General Admission',   fee: 'Free',   icon: 'people-outline' },
  { label: 'Students',            fee: 'Free',   icon: 'school-outline' },
  { label: 'Senior Citizens',     fee: 'Free',   icon: 'heart-outline' },
  { label: 'Persons with Disability', fee: 'Free', icon: 'accessibility-outline' },
];

type Rule = { icon: string; title: string; body: string; color: string };

const RULES: Rule[] = [
  {
    icon: 'restaurant-outline',
    title: 'No Food or Drinks',
    body: 'Eating and drinking are strictly prohibited inside the shrine and exhibition areas to preserve the artifacts and maintain the sanctity of the space.',
    color: '#E74C3C',
  },
  {
    icon: 'volume-mute-outline',
    title: 'Observe Silence',
    body: 'Please speak softly and keep noise to a minimum. This is a place of worship and quiet reflection — silence honours those who come to pray.',
    color: '#C9A84C',
  },
  {
    icon: 'walk-outline',
    title: 'Walk, Do Not Run',
    body: 'Running in the hallways and galleries is not permitted. Please walk at all times to ensure the safety of fellow visitors and the protection of displayed artifacts.',
    color: '#2980B9',
  },
  {
    icon: 'phone-portrait-outline',
    title: 'Photography Etiquette',
    body: 'Photography for personal use is permitted. Flash photography and tripods are not allowed near artifacts. Please be mindful of other visitors.',
    color: '#8E44AD',
  },
  {
    icon: 'hand-left-outline',
    title: 'Do Not Touch the Artifacts',
    body: 'Please refrain from touching display items and artifacts unless explicitly permitted. Oils from skin can cause irreversible damage to centuries-old materials.',
    color: '#E67E22',
  },
  {
    icon: 'shirt-outline',
    title: 'Dress Respectfully',
    body: 'As a place of worship, visitors are encouraged to dress modestly. Revealing clothing is discouraged out of respect for the shrine and its community.',
    color: '#27AE60',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────────

export default function VisitInfo({ navigation }: any) {
  const { theme } = useAppTheme();
  const C = buildC(theme);
  const { fontScale } = useAppContext();

  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const isOpenNow = currentHour >= 8 && currentHour < 17;
  const todayIndex = now.getDay(); // 0 = Sunday

  const s = StyleSheet.create({
    safe:       { flex: 1, backgroundColor: C.bg },
    header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
    backBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
    pageTitle:  { fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
    heroContent: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 28 },
    heroEyebrow: { fontSize: 9, letterSpacing: 4, color: C.gold, fontWeight: '700', marginBottom: 8 },
    heroTitle:   { fontWeight: '900', color: C.ink, letterSpacing: -1.2, lineHeight: 40 },
    statusPill:  { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, marginTop: 14 },
    statusDot:   { width: 7, height: 7, borderRadius: 4 },
    statusText:  { fontSize: 12, fontWeight: '700' },

    section:         { paddingHorizontal: 20, marginTop: 28 },
    sectionHead:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionIcon:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    sectionTitle:    { fontSize: 11, fontWeight: '800', letterSpacing: 2, color: C.gold },
    sectionLine:     { flex: 1, height: 1, backgroundColor: C.border },

    // Hours
    hoursCard:       { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
    hoursRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
    hoursRowLast:    { borderBottomWidth: 0 },
    hoursRowToday:   { backgroundColor: C.goldSoft },
    hoursDayText:    { fontSize: 14, fontWeight: '500', color: C.inkMid },
    hoursDayToday:   { fontWeight: '800', color: C.ink },
    hoursTimeText:   { fontSize: 13, fontWeight: '600', color: C.inkMid },
    hoursTimeToday:  { color: C.gold, fontWeight: '800' },
    todayBadge:      { fontSize: 9, fontWeight: '800', color: C.gold, backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.borderGold, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50, letterSpacing: 1 },

    // Admission
    admissionGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    admissionCard:   { flex: 1, minWidth: '45%', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, alignItems: 'center', gap: 8 },
    admissionIcon:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.borderGold },
    admissionLabel:  { fontSize: 11, fontWeight: '600', color: C.inkMid, textAlign: 'center', lineHeight: 15 },
    admissionFee:    { fontSize: 18, fontWeight: '900', color: C.gold, letterSpacing: -0.5 },

    // Rules
    ruleCard:        { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 10, flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    ruleIconBox:     { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    ruleTitle:       { fontWeight: '800', color: C.ink, marginBottom: 4 },
    ruleBody:        { color: C.inkMid, lineHeight: 20 },

    // Notice banner
    noticeBanner:    { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.borderGold, borderRadius: 16, padding: 16, marginHorizontal: 20, marginTop: 28 },
    noticeText:      { flex: 1, fontSize: 12, color: C.inkMid, lineHeight: 18 },

    footer:          { alignItems: 'center', paddingTop: 28, paddingBottom: 16, paddingHorizontal: 20 },
    footerText:      { fontSize: 11, color: C.inkDim, textAlign: 'center', lineHeight: 17 },
  });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>

        {/* ── Hero Header ── */}
        <ImageBackground
          source={require('../../../assets/Signin.jpg')}
          style={{ paddingBottom: 8 }}
          imageStyle={{ opacity: 0.12, resizeMode: 'cover' }}
        >
          <LinearGradient
            colors={['rgba(255,252,248,0.95)', 'rgba(255,252,248,0.85)']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={C.ink} />
            </TouchableOpacity>
            <Text style={s.pageTitle}>Visit Info</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={s.heroContent}>
            <Text style={s.heroEyebrow}>PLAN YOUR VISIT</Text>
            <Text style={[s.heroTitle, { fontSize: 34 * fontScale }]}>
              Hours &{'\n'}Admission
            </Text>
            {/* Live open/closed pill */}
            <View style={[s.statusPill, {
              backgroundColor: isOpenNow ? 'rgba(46,204,113,0.12)' : 'rgba(231,76,60,0.1)',
              borderWidth: 1,
              borderColor: isOpenNow ? 'rgba(46,204,113,0.3)' : 'rgba(231,76,60,0.25)',
            }]}>
              <View style={[s.statusDot, { backgroundColor: isOpenNow ? C.teal : C.crimson }]} />
              <Text style={[s.statusText, { color: isOpenNow ? C.teal : C.crimson }]}>
                {isOpenNow ? 'Open Now · Closes at 5:00 PM' : 'Closed · Opens at 8:00 AM'}
              </Text>
            </View>
          </View>
        </ImageBackground>

        {/* ══════════════════════════════════════════════════
            OPENING HOURS
        ══════════════════════════════════════════════════ */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <View style={[s.sectionIcon, { backgroundColor: C.goldSoft }]}>
              <Ionicons name="time-outline" size={18} color={C.gold} />
            </View>
            <Text style={s.sectionTitle}>OPENING HOURS</Text>
            <View style={s.sectionLine} />
          </View>

          <View style={s.hoursCard}>
            {HOURS.map((row, idx) => (
              <View
                key={row.day}
                style={[
                  s.hoursRow,
                  idx === HOURS.length - 1 && s.hoursRowLast,
                  row.isToday && s.hoursRowToday,
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={[s.hoursDayText, row.isToday && s.hoursDayToday, { fontSize: 14 * fontScale }]}>
                    {row.day}
                  </Text>
                  {row.isToday && <Text style={s.todayBadge}>TODAY</Text>}
                </View>
                <Text style={[s.hoursTimeText, row.isToday && s.hoursTimeToday, { fontSize: 13 * fontScale }]}>
                  {row.open} – {row.close}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════
            ADMISSION FEES
        ══════════════════════════════════════════════════ */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <View style={[s.sectionIcon, { backgroundColor: 'rgba(46,204,113,0.1)' }]}>
              <Ionicons name="ticket-outline" size={18} color={C.teal} />
            </View>
            <Text style={s.sectionTitle}>ADMISSION</Text>
            <View style={s.sectionLine} />
          </View>

          <View style={s.admissionGrid}>
            {ADMISSION.map(item => (
              <View key={item.label} style={s.admissionCard}>
                <View style={s.admissionIcon}>
                  <Ionicons name={item.icon as any} size={20} color={C.gold} />
                </View>
                <Text style={[s.admissionLabel, { fontSize: 11 * fontScale }]}>{item.label}</Text>
                <Text style={[s.admissionFee, { fontSize: 18 * fontScale }]}>{item.fee}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════
            VISITOR RULES
        ══════════════════════════════════════════════════ */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <View style={[s.sectionIcon, { backgroundColor: 'rgba(231,76,60,0.08)' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={C.crimson} />
            </View>
            <Text style={s.sectionTitle}>VISITOR GUIDELINES</Text>
            <View style={s.sectionLine} />
          </View>

          {RULES.map(rule => (
            <View key={rule.title} style={s.ruleCard}>
              <View style={[s.ruleIconBox, { backgroundColor: `${rule.color}18` }]}>
                <Ionicons name={rule.icon as any} size={20} color={rule.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.ruleTitle, { fontSize: 14 * fontScale }]}>{rule.title}</Text>
                <Text style={[s.ruleBody, { fontSize: 12 * fontScale }]}>{rule.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Notice banner ── */}
        <View style={s.noticeBanner}>
          <Ionicons name="information-circle-outline" size={20} color={C.gold} style={{ marginTop: 1 }} />
          <Text style={[s.noticeText, { fontSize: 12 * fontScale }]}>
            Hours and guidelines are subject to change during feast days, special liturgical celebrations, and Holy Week. Please check with shrine staff for updates.
          </Text>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            National Shrine of Our Lady of Sorrows{'\n'}
            Tayabas, Quezon Province, Philippines
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
