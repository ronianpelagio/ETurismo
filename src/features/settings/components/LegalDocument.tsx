import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../context/ThemeContext';
import SettingsPageShell, { settingsPalette } from './SettingsPageShell';

export type LegalSection = { title: string; body: string };

export default function LegalDocument({
  navigation,
  title,
  eyebrow,
  headline,
  updated,
  icon,
  sections,
}: {
  navigation?: { goBack: () => void };
  title: string;
  eyebrow: string;
  headline: string;
  updated: string;
  icon: keyof typeof Ionicons.glyphMap;
  sections: LegalSection[];
}) {
  const { theme } = useAppTheme();
  const C = settingsPalette(theme);
  const styles = createStyles(C);

  return (
    <SettingsPageShell navigation={navigation} title={title} eyebrow={eyebrow}
      headline={headline} description={`Last updated ${updated}`} icon={icon}>
      <View style={styles.notice}>
        <Ionicons name="information-circle-outline" size={18} color={C.gold} />
        <Text style={styles.noticeText}>Plain-language information about using ETurismo and how your data is handled.</Text>
      </View>
      {sections.map((section, index) => (
        <View key={section.title} style={styles.section}>
          <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
          <View style={styles.sectionCopy}>
            <Text style={styles.title}>{section.title}</Text>
            <Text style={styles.body}>{section.body}</Text>
          </View>
        </View>
      ))}
    </SettingsPageShell>
  );
}

function createStyles(C: ReturnType<typeof settingsPalette>) {
  return StyleSheet.create({
    notice: { flexDirection: 'row', gap: 9, padding: 14, borderRadius: 14, backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.borderGold, marginBottom: 14 },
    noticeText: { flex: 1, color: C.inkMid, fontSize: 11.5, lineHeight: 17 },
    section: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 17, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, marginBottom: 11 },
    number: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: C.deep },
    numberText: { color: C.gold, fontSize: 11, fontWeight: '900' },
    sectionCopy: { flex: 1 },
    title: { color: C.ink, fontSize: 13.5, fontWeight: '800', marginBottom: 7 },
    body: { color: C.inkMid, fontSize: 12.5, lineHeight: 20 },
  });
}
