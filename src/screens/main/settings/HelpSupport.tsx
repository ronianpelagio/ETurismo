import React, { useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../context/ThemeContext';
import SettingsPageShell, { settingsPalette } from '../../../features/settings/components/SettingsPageShell';
import { SectionLabel } from '../../../features/settings/components/PreferenceCard';

const FAQS = [
  { question: 'How do I save artifacts?', answer: 'Open an artifact and tap the bookmark icon. You can find it again from your profile collection.' },
  { question: 'How do I mark favorites?', answer: 'Tap the heart icon on an artifact. Favorites stay separate from your general saved collection.' },
  { question: 'Can I listen in different languages?', answer: 'Yes. Available artifact guides can be played in English, Filipino, Japanese, Spanish, and Korean.' },
  { question: 'How do I scan a QR code?', answer: 'Tap the raised Scan button in the main navigation, allow camera access, and place the museum QR code inside the frame.' },
];

export default function HelpSupport({ navigation }: any) {
  const { theme } = useAppTheme();
  const C = settingsPalette(theme);
  const styles = createStyles(C);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <SettingsPageShell navigation={navigation} title="Help & Support" eyebrow="WE'RE HERE TO HELP"
      headline="Find an answer quickly" description="Browse common questions or contact the ETurismo team directly."
      icon="help-buoy-outline">
      <SectionLabel C={C}>POPULAR QUESTIONS</SectionLabel>
      <View style={styles.faqList}>
        {FAQS.map((faq, index) => {
          const open = openIndex === index;
          return (
            <TouchableOpacity key={faq.question} style={[styles.faq, open && styles.faqOpen]}
              onPress={() => setOpenIndex(open ? null : index)} activeOpacity={0.78}
              accessibilityRole="button" accessibilityState={{ expanded: open }}>
              <View style={styles.faqHeader}>
                <View style={styles.questionIcon}><Ionicons name="help" size={14} color={C.gold} /></View>
                <Text style={styles.question}>{faq.question}</Text>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color={C.inkDim} />
              </View>
              {open ? <Text style={styles.answer}>{faq.answer}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionLabel C={C}>CONTACT SUPPORT</SectionLabel>
      <TouchableOpacity style={styles.contactCard}
        onPress={() => Linking.openURL('mailto:support@etorismo.com?subject=ETurismo%20Support')}
        activeOpacity={0.78} accessibilityRole="link" accessibilityLabel="Email ETurismo support">
        <View style={styles.contactIcon}><Ionicons name="mail-outline" size={20} color={C.gold} /></View>
        <View style={styles.contactCopy}><Text style={styles.contactTitle}>Email support</Text><Text style={styles.contactText}>support@etorismo.com</Text></View>
        <Ionicons name="arrow-forward" size={18} color={C.gold} />
      </TouchableOpacity>
    </SettingsPageShell>
  );
}

function createStyles(C: ReturnType<typeof settingsPalette>) {
  return StyleSheet.create({
    faqList: { gap: 9, marginBottom: 22 },
    faq: { padding: 15, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
    faqOpen: { borderColor: C.borderGold, backgroundColor: C.raised },
    faqHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    questionIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: C.goldSoft },
    question: { flex: 1, color: C.ink, fontSize: 13.5, fontWeight: '700' },
    answer: { color: C.inkMid, fontSize: 12, lineHeight: 19, marginTop: 11, marginLeft: 38 },
    contactCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderRadius: 17, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
    contactIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.borderGold },
    contactCopy: { flex: 1 },
    contactTitle: { color: C.ink, fontSize: 13.5, fontWeight: '800' },
    contactText: { color: C.inkDim, fontSize: 11.5, marginTop: 2 },
  });
}
