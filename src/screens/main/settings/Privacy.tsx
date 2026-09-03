import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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

  scrollContent: { paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40 },
  content: {
    fontSize: 14,
    color: C.ink,
    lineHeight: 22,
    fontFamily: 'System',
  },
});
}

let styles = getStyles(C);

const PRIVACY_CONTENT = `PRIVACY POLICY

Last Updated: May 2026

1. INTRODUCTION
eTorismo ("we", "our", or "us") operates the eTorismo application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our service and the choices you have associated with that data.

2. INFORMATION COLLECTION AND USE
We collect several different types of information for various purposes to provide and improve our Service to you.

Types of Data Collected:
- Personal Data: name, email address, phone number, etc.
- Usage Data: browser type, IP address, pages visited, etc.
- Device Data: device model, operating system, unique device identifiers, etc.

3. USE OF DATA
eTorismo uses the collected data for various purposes:
- To provide and maintain our Service
- To notify you about changes to our Service
- To allow you to participate in interactive features
- To provide customer care and support
- To gather analysis or valuable information to improve our Service
- To monitor the usage of our Service
- To detect, prevent and address technical and security issues

4. SECURITY OF DATA
The security of your data is important to us, but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.

5. CONTACT US
If you have any questions about this Privacy Policy, please contact us at:
Email: privacy@etorismo.com`;

export default function Privacy({ navigation }: any) {
  const { theme } = useAppTheme(); C = buildC(theme); styles = getStyles(C);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.titleDivider} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.content}>{PRIVACY_CONTENT}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}