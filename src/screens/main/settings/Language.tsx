import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '../../../context/ThemeContext';
import { AppTheme } from '../../../constants/themes';
import { useLanguage, AppLanguage, LANGUAGE_META } from '../../../context/LanguageContext';
import SettingsPageShell from '../../../features/settings/components/SettingsPageShell';

function buildC(t: AppTheme) {
  return {
    bg: t.bg, surface: t.surface, ink: t.ink, inkMid: t.inkMid,
    inkLight: t.inkDim, gold: t.gold, goldSoft: t.goldSoft,
    goldGlow: t.goldGlow, borderGold: t.borderGold,
    border: t.border, error: t.crimson, success: t.teal,
  };
}

function getStyles(C: ReturnType<typeof buildC>) {
  return StyleSheet.create({
    section: { paddingTop: 0 },
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
    langIconWrap: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.goldSoft, justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: C.borderGold,
    },
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

const LANGUAGES: { code: AppLanguage }[] = [
  { code: 'en' },
  { code: 'fil' },
  { code: 'ja' },
  { code: 'es' },
  { code: 'ko' },
];

export default function Language({ navigation }: any) {
  const { theme } = useAppTheme();
  const C = buildC(theme);
  const styles = getStyles(C);
  const { language, setLanguage } = useLanguage();

  const handleSelect = async (code: AppLanguage) => {
    Haptics.selectionAsync();
    await setLanguage(code);
  };

  return (
    <SettingsPageShell navigation={navigation} title="Language" eyebrow="YOUR GUIDE"
      headline="Explore in your language" description="Choose the default language for artifact stories and available audio guides."
      icon="language-outline">
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
                accessibilityRole="radio"
                accessibilityState={{ checked: isActive }}
              >
                <View style={styles.langInfo}>
                  <View style={styles.langIconWrap}>
                    <Ionicons name="language-outline" size={20} color={isActive ? C.gold : C.inkMid} />
                  </View>
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
    </SettingsPageShell>
  );
}
