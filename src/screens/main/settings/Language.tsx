import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '../../../context/ThemeContext';
import { THEMES } from '../../../constants/themes';
import { useLanguage, AppLanguage, LANGUAGE_META } from '../../../context/LanguageContext';

function buildC(t: typeof THEMES.light) {
  return {
    bg: t.bg, surface: t.surface, ink: t.ink, inkMid: t.inkMid,
    inkLight: t.inkDim, gold: t.gold, goldSoft: t.goldSoft,
    goldGlow: t.goldGlow, borderGold: t.borderGold,
    border: t.border, error: t.crimson, success: t.teal,
  };
}
let C = buildC(THEMES.light);

function getStyles(C: ReturnType<typeof buildC>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 12,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      justifyContent: 'center', alignItems: 'center',
    },
    backTxt: { fontSize: 24, color: C.ink, lineHeight: 28, marginTop: -2 },
    pageTitle: { fontSize: 18, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
    titleDivider: {
      height: 3, backgroundColor: C.gold,
      marginHorizontal: 20, borderRadius: 2, marginBottom: 4,
    },

    section: { paddingHorizontal: 20, paddingTop: 24 },
    sectionLabel: { fontSize: 10, fontWeight: '800', color: C.gold, letterSpacing: 2.5, marginBottom: 10 },
    sectionHint: { fontSize: 12, color: C.inkLight, marginBottom: 14, lineHeight: 18 },

    card: {
      backgroundColor: C.surface, borderRadius: 16,
      borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    },
    row: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    rowActive: { backgroundColor: C.goldSoft },

    langInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    langFlag: { fontSize: 24 },
    langTextWrap: { gap: 1 },
    langName: { fontSize: 15, fontWeight: '600', color: C.ink },
    langNative: { fontSize: 12, color: C.inkLight },
    checkCircle: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: C.gold,
      justifyContent: 'center', alignItems: 'center',
    },
  });
}

let styles = getStyles(C);

const LANGUAGES: { code: AppLanguage }[] = [
  { code: 'en' },
  { code: 'fil' },
  { code: 'ja' },
  { code: 'es' },
  { code: 'ko' },
];

export default function Language({ navigation }: any) {
  const { theme } = useAppTheme(); C = buildC(theme); styles = getStyles(C);
  const { language, setLanguage } = useLanguage();

  const handleSelect = async (code: AppLanguage) => {
    Haptics.selectionAsync();
    await setLanguage(code);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Language</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.titleDivider} />

      {/* Language list */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SELECT LANGUAGE</Text>
        <Text style={styles.sectionHint}>
          Controls the default language for artifact descriptions and audio guides throughout the app.
        </Text>
        <View style={styles.card}>
          {LANGUAGES.map(({ code }, idx) => {
            const meta = LANGUAGE_META[code];
            const isActive = language === code;
            return (
              <TouchableOpacity
                key={code}
                style={[
                  styles.row,
                  idx < LANGUAGES.length - 1 && styles.rowBorder,
                  isActive && styles.rowActive,
                ]}
                onPress={() => handleSelect(code)}
                activeOpacity={0.7}
              >
                <View style={styles.langInfo}>
                  <Text style={styles.langFlag}>{meta.flag}</Text>
                  <View style={styles.langTextWrap}>
                    <Text style={styles.langName}>{meta.name}</Text>
                    {meta.nativeName !== meta.name && (
                      <Text style={styles.langNative}>{meta.nativeName}</Text>
                    )}
                  </View>
                </View>
                {isActive ? (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  </View>
                ) : (
                  <View
                    style={{
                      width: 28, height: 28, borderRadius: 14,
                      borderWidth: 1.5, borderColor: C.border,
                    }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
