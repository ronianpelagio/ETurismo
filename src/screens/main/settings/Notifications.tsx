import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../../../context/ThemeContext';
import { THEMES } from '../../../constants/themes';
import { StatusBar } from 'expo-status-bar';
function buildC(t: typeof THEMES.light) {
  return { bg: t.bg, surface: t.surface, ink: t.ink, inkMid: t.inkMid, inkLight: t.inkDim, gold: t.gold, goldSoft: t.goldSoft, border: t.border, error: t.crimson, success: t.teal, raised: t.raised };
}
let C = buildC(THEMES.light);
function getStyles(C: ReturnType<typeof buildC>) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backTxt: { fontSize: 24, color: C.ink, lineHeight: 28, marginTop: -2 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  titleDivider: { height: 3, backgroundColor: C.gold, marginHorizontal: 20, borderRadius: 2, marginBottom: 4 },

  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: C.gold, letterSpacing: 2.5, marginBottom: 10 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rowLabel: { fontSize: 15, fontWeight: '500', color: C.ink, marginBottom: 4 },
  rowDesc: { fontSize: 12, color: C.inkMid },
});
}

let styles = getStyles(C);

export default function Notifications({ navigation }: any) {
  const { theme } = useAppTheme(); C = buildC(theme); styles = getStyles(C);
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    sms: false,
    newsletter: true,
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.titleDivider} />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>NOTIFICATION SETTINGS</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Push Notifications</Text>
              <Text style={styles.rowDesc}>App notifications</Text>
            </View>
            <Switch
              value={notifications.push}
              onValueChange={(val) => setNotifications({ ...notifications, push: val })}
              trackColor={{ false: C.border, true: C.gold }}
              thumbColor={C.surface}
            />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <View>
              <Text style={styles.rowLabel}>Email Notifications</Text>
              <Text style={styles.rowDesc}>Email updates</Text>
            </View>
            <Switch
              value={notifications.email}
              onValueChange={(val) => setNotifications({ ...notifications, email: val })}
              trackColor={{ false: C.border, true: C.gold }}
              thumbColor={C.surface}
            />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <View>
              <Text style={styles.rowLabel}>SMS Notifications</Text>
              <Text style={styles.rowDesc}>Text messages</Text>
            </View>
            <Switch
              value={notifications.sms}
              onValueChange={(val) => setNotifications({ ...notifications, sms: val })}
              trackColor={{ false: C.border, true: C.gold }}
              thumbColor={C.surface}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}