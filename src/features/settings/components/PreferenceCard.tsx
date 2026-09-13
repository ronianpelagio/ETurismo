import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SettingsPalette } from './SettingsPageShell';

export function SectionLabel({ children, C }: { children: string; C: SettingsPalette }) {
  return (
    <View style={styles.sectionLabelRow}>
      <Text style={[styles.sectionLabel, { color: C.gold }]}>{children}</Text>
      <View style={[styles.sectionLine, { backgroundColor: C.border }]} />
    </View>
  );
}

export function PreferenceCard({ children, C }: { children: React.ReactNode; C: SettingsPalette }) {
  return <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>{children}</View>;
}

export function TogglePreference({
  C,
  icon,
  title,
  description,
  value,
  onChange,
  isLast = false,
}: {
  C: SettingsPalette;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}
      onPress={() => onChange(!value)}
      activeOpacity={0.75}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      accessibilityHint={description}
    >
      <View style={[styles.icon, { backgroundColor: C.goldSoft, borderColor: C.borderGold }]}>
        <Ionicons name={icon} size={18} color={C.gold} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: C.ink }]}>{title}</Text>
        <Text style={[styles.description, { color: C.inkDim }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.deep, true: C.gold }}
        thumbColor={C.surface}
        pointerEvents="none"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2.1 },
  sectionLine: { height: 1, flex: 1 },
  card: { borderWidth: 1, borderRadius: 18, overflow: 'hidden', marginBottom: 20 },
  row: { minHeight: 76, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  description: { fontSize: 11, lineHeight: 16, marginTop: 2 },
});
