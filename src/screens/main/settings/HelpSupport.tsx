import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useAppTheme } from '../../../context/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { THEMES } from '../../../constants/themes';
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

  scrollContent: { paddingBottom: 40 },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: C.gold, letterSpacing: 2.5, marginBottom: 12 },

  faqCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  faqBorder: {
    borderWidth: 1,
    borderColor: C.border,
  },
  faqQuestion: { fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 8 },
  faqAnswer: { fontSize: 13, color: C.inkMid, lineHeight: 20 },

  contactSection: { paddingHorizontal: 20, paddingTop: 24 },
  contactCard: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: { fontSize: 14, fontWeight: '500', color: C.ink, flex: 1 },
});
}

let styles = getStyles(C);

const FAQS = [
  { question: 'How do I save artifacts?', answer: 'Tap the bookmark icon on any artifact to save it to your collection.' },
  { question: 'How do I mark favorites?', answer: 'Tap the heart icon to mark artifacts as your favorites.' },
  { question: 'Can I listen to audio in multiple languages?', answer: 'Yes, each artifact has audio guides in English, Filipino, Japanese, Spanish, and Korean.' },
  { question: 'How do I scan QR codes?', answer: 'Use the QR Scanner from the main menu to scan artifact QR codes.' },
];

export default function HelpSupport({ navigation }: any) {
  const { theme } = useAppTheme(); C = buildC(theme); styles = getStyles(C);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.titleDivider} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FREQUENTLY ASKED QUESTIONS</Text>
          {FAQS.map((faq, idx) => (
            <View key={idx} style={[styles.faqCard, idx < FAQS.length - 1 && styles.faqBorder]}>
              <Text style={styles.faqQuestion}>❓ {faq.question}</Text>
              <Text style={styles.faqAnswer}>{faq.answer}</Text>
            </View>
          ))}
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.sectionLabel}>CONTACT US</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactRow}>
              <Ionicons name="mail" size={20} color={C.gold} />
              <Text style={styles.contactText}>support@etorismo.com</Text>
            </View>
            <View style={styles.contactRow}>
              <Ionicons name="call" size={20} color={C.gold} />
              <Text style={styles.contactText}>+1 (555) 123-4567</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}