import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ImageBackground, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../services/supabase';
import { useAppTheme } from '../../context/ThemeContext';
import { useAppContext } from '../../context/AppContext';
import { THEMES } from '../../constants/themes';

function buildC(t: typeof THEMES[keyof typeof THEMES]) {
  return {
    bg: t.bg, surface: t.surface, raised: t.raised, deep: t.deep,
    ink: t.ink, inkMid: t.inkMid, inkDim: t.inkDim,
    gold: t.gold, goldSoft: t.goldSoft, borderGold: t.borderGold,
    border: t.border, crimson: t.crimson,
  };
}

type RowProps = {
  icon: string;
  iconBg?: string;
  iconColor?: string;
  label: string;
  sublabel?: string;
  value?: string;
  badge?: string;
  onPress?: () => void;
  danger?: boolean;
  isLast?: boolean;
  C: ReturnType<typeof buildC>;
};

function Row({ icon, iconBg, iconColor, label, sublabel, value, badge, onPress, danger, isLast, C }: RowProps) {
  const ic = iconColor || (danger ? C.crimson : C.gold);
  const bg = iconBg || (danger ? 'rgba(231,76,60,0.1)' : C.goldSoft);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 11,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: C.border,
        gap: 12,
      }}
    >
      <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon as any} size={16} color={ic} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: danger ? C.crimson : C.ink, lineHeight: 18 }}>{label}</Text>
        {sublabel && <Text style={{ fontSize: 10.5, color: C.inkDim, marginTop: 1 }}>{sublabel}</Text>}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {value && <Text style={{ fontSize: 11, color: C.inkDim, fontWeight: '600' }}>{value}</Text>}
        {badge && (
          <View style={{ backgroundColor: C.gold, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
            <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#fff' }}>{badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={14} color={danger ? C.crimson : C.inkDim} />
      </View>
    </TouchableOpacity>
  );
}

function SectionCard({ title, icon, children, C }: { title: string; icon: string; children: React.ReactNode; C: ReturnType<typeof buildC> }) {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
      {/* Section header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon as any} size={11} color={C.gold} />
        </View>
        <Text style={{ fontSize: 8.5, fontWeight: '800', letterSpacing: 2, color: C.gold }}>{title}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
      </View>
      {/* Card */}
      <View style={{ backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

export default function Settings({ navigation }: any) {
  const { theme, themeId } = useAppTheme();
  const C = buildC(theme);
  const rootNavigation = useNavigation();

  const nav = (screen: string) => navigation?.navigate(screen);

  const THEME_LABELS: Record<string, string> = { light: 'Light', warm: 'Warm', sage: 'Sage', sepia: 'Sepia' };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          try {
            await supabase.auth.signOut();
            await new Promise(r => setTimeout(r, 100));
            let root = rootNavigation;
            while (root.getParent()) root = root.getParent();
            root.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'SignIn' }] }));
          } catch {
            rootNavigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'SignIn' }] }));
          }
        },
      },
    ]);
  };

  const s = StyleSheet.create({
    safe:       { flex: 1, backgroundColor: C.bg },
    hero:       { paddingBottom: 4, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: C.border },
    header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
    backBtn:    { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
    pageTitle:  { fontSize: 15, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
    heroContent:{ paddingHorizontal: 20, paddingTop: 2, paddingBottom: 16 },
    heroEyebrow:{ fontSize: 8.5, letterSpacing: 3, color: C.gold, fontWeight: '800', marginBottom: 4 },
    heroTitle:  { fontSize: 24, fontWeight: '900', color: C.ink, letterSpacing: -0.6, lineHeight: 29 },
    heroRule:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
    heroRuleLine: { flex: 1, height: 1, backgroundColor: C.gold, opacity: 0.25 },
    heroRuleDot:  { fontSize: 7, color: C.gold },
    logoutSection:{ paddingHorizontal: 16, marginTop: 20 },
    logoutBtn:  { flexDirection: 'row', backgroundColor: 'rgba(231,76,60,0.08)', borderRadius: 12, borderWidth: 1.3, borderColor: 'rgba(231,76,60,0.3)', height: 44, alignItems: 'center', justifyContent: 'center', gap: 7 },
    logoutTxt:  { fontSize: 13, fontWeight: '800', color: C.crimson, letterSpacing: 0.3 },
    version:    { textAlign: 'center', fontSize: 10, color: C.inkDim, letterSpacing: 1, paddingTop: 18, paddingBottom: 10 },
  });

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── Hero Header ── */}
        <ImageBackground
          source={require('../../assets/Signin.jpg')}
          style={s.hero}
          imageStyle={{ opacity: 0.1, resizeMode: 'cover' }}
        >
          <LinearGradient
            colors={['rgba(255,252,248,0.95)', 'rgba(255,252,248,0.85)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.header}>
            <TouchableOpacity
              onPress={() => navigation?.goBack()}
              style={s.backBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="chevron-back" size={18} color={C.ink} />
            </TouchableOpacity>
            <Text style={s.pageTitle}>Settings</Text>
            <View style={{ width: 34 }} />
          </View>
          <View style={s.heroContent}>
            <Text style={s.heroEyebrow}>PREFERENCES & CONFIGURATION</Text>
            <Text style={s.heroTitle}>Your Settings</Text>
            <View style={s.heroRule}>
              <View style={s.heroRuleLine} />
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.gold }} />
              <View style={s.heroRuleLine} />
            </View>
          </View>
        </ImageBackground>

        {/* ── ACCOUNT ── */}
        <SectionCard title="ACCOUNT" icon="person-outline" C={C}>
          <Row C={C} icon="person-outline" label="Personal Information" sublabel="Name, phone number" onPress={() => nav('PersonalInfo')} />
          <Row C={C} icon="shield-outline" label="Password & Security" sublabel="Change your password" onPress={() => nav('PasswordSecurity')} isLast />
        </SectionCard>

        {/* ── APPEARANCE ── */}
        <SectionCard title="APPEARANCE" icon="color-palette-outline" C={C}>
          <Row C={C} icon="color-palette-outline" label="Theme" sublabel="App colour scheme" value={THEME_LABELS[themeId] ?? 'Light'} onPress={() => nav('Theme')} isLast />
        </SectionCard>

        {/* ── PREFERENCES ── */}
        <SectionCard title="PREFERENCES" icon="options-outline" C={C}>
          <Row C={C} icon="notifications-outline" label="Push Notifications" value="On" onPress={() => nav('Notifications')} isLast />
        </SectionCard>

        {/* ── ACTIVITY ── */}
        <SectionCard title="ACTIVITY" icon="time-outline" C={C}>
          <Row C={C} icon="time-outline" label="Visit History" sublabel="Artifacts you've explored" onPress={() => nav('VisitHistory')} isLast />
        </SectionCard>

        {/* ── SHRINE INFO ── */}
        <SectionCard title="SHRINE INFO" icon="business-outline" C={C}>
          <Row C={C}
            icon="time-outline" iconBg="rgba(46,204,113,0.1)" iconColor="#27AE60"
            label="Hours & Admission" sublabel="Opening hours, free entry"
            onPress={() => nav('VisitInfo')}
          />
          <Row C={C} icon="help-circle-outline" label="Help & Support" onPress={() => nav('HelpSupport')} />
          <Row C={C} icon="document-text-outline" label="Terms & Conditions" onPress={() => nav('Terms')} />
          <Row C={C} icon="lock-closed-outline" label="Privacy Policy" onPress={() => nav('Privacy')} isLast />
        </SectionCard>

        {/* ── ABOUT ── */}
        <SectionCard title="ABOUT" icon="information-circle-outline" C={C}>
          <Row C={C} icon="information-circle-outline" label="App Version" value="2.0.0" onPress={() => {}} />
          <Row C={C} icon="star-outline" label="Sacred Heritage" value="© 2026" onPress={() => {}} isLast />
        </SectionCard>

        {/* ── Logout ── */}
        <View style={s.logoutSection}>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={C.crimson} />
            <Text style={s.logoutTxt}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.version}>Heritage Collection · v2.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
} 