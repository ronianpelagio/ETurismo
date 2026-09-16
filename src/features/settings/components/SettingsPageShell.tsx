import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../context/ThemeContext';
import { AppTheme } from '../../../constants/themes';

export type SettingsPalette = {
  bg: string;
  surface: string;
  raised: string;
  deep: string;
  ink: string;
  inkMid: string;
  inkDim: string;
  gold: string;
  goldSoft: string;
  border: string;
  borderGold: string;
  crimson: string;
  teal: string;
};

export function settingsPalette(theme: AppTheme): SettingsPalette {
  return {
    bg: theme.bg,
    surface: theme.surface,
    raised: theme.raised,
    deep: theme.deep,
    ink: theme.ink,
    inkMid: theme.inkMid,
    inkDim: theme.inkDim,
    gold: theme.gold,
    goldSoft: theme.goldSoft,
    border: theme.border,
    borderGold: theme.borderGold,
    crimson: theme.crimson,
    teal: theme.teal,
  };
}

type Props = {
  navigation?: { goBack: () => void };
  title: string;
  eyebrow: string;
  headline: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
  scroll?: boolean;
};

export default function SettingsPageShell({
  navigation,
  title,
  eyebrow,
  headline,
  description,
  icon,
  children,
  contentStyle,
  scroll = true,
}: Props) {
  const { theme } = useAppTheme();
  const C = settingsPalette(theme);
  const styles = createStyles(C);

  const content = (
    <View style={[styles.content, contentStyle]}>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name={icon} size={22} color={C.gold} />
        </View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.headline}>{headline}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.backButton}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={`Back from ${title}`}
        >
          <Ionicons name="arrow-back" size={20} color={C.ink} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerAccent} />
        </View>
        <View style={styles.headerSpacer} />
      </View>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {content}
        </ScrollView>
      ) : content}
    </SafeAreaView>
  );
}

function createStyles(C: SettingsPalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: C.ink,
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    headerTitleWrap: { alignItems: 'center' },
    headerTitle: { color: C.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
    headerAccent: { width: 22, height: 2, borderRadius: 2, backgroundColor: C.gold, marginTop: 5 },
    headerSpacer: { width: 42 },
    scrollContent: { paddingBottom: 44 },
    content: { paddingHorizontal: 20 },
    heroCard: {
      marginTop: 8,
      marginBottom: 22,
      padding: 20,
      borderRadius: 22,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      shadowColor: C.ink,
      shadowOpacity: 0.05,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 7 },
      elevation: 2,
    },
    heroIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: C.goldSoft,
      borderWidth: 1,
      borderColor: C.borderGold,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    eyebrow: { color: C.gold, fontSize: 9, fontWeight: '900', letterSpacing: 2.1, marginBottom: 7 },
    headline: { color: C.ink, fontSize: 27, lineHeight: 32, fontWeight: '900', letterSpacing: -0.8 },
    description: { color: C.inkMid, fontSize: 12.5, lineHeight: 19, marginTop: 8, maxWidth: 420 },
  });
}
