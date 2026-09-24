import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../../context/ThemeContext';
import SettingsPageShell, { settingsPalette } from '../../../features/settings/components/SettingsPageShell';
import { PreferenceCard, SectionLabel, TogglePreference } from '../../../features/settings/components/PreferenceCard';
import {
  DEFAULT_EMAIL_PREFS,
  EmailPrefs as EmailPrefsType,
  getEmailPrefs,
  saveEmailPrefs,
} from '../../../services/notificationService';
import { supabase } from '../../../services/supabase';

const LOCAL_KEY = 'email_preferences_v1';

export default function EmailPrefs({ navigation }: any) {
  const { theme } = useAppTheme();
  const C = settingsPalette(theme);

  const [prefs, setPrefs]     = useState<EmailPrefsType>(DEFAULT_EMAIL_PREFS);
  const [userId, setUserId]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // ── Load: local cache first, then Supabase ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Paint from local cache immediately
      try {
        const cached = await AsyncStorage.getItem(LOCAL_KEY);
        if (cached && !cancelled) {
          setPrefs({ ...DEFAULT_EMAIL_PREFS, ...JSON.parse(cached) });
        }
      } catch {}

      // 2. Fetch the real value from Supabase
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid || cancelled) return;
        setUserId(uid);

        const remote = await getEmailPrefs(uid);
        if (!cancelled) {
          setPrefs(remote);
          AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(remote)).catch(() => {});
        }
      } catch {
        // Network error — local cache is already shown
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Toggle a preference ────────────────────────────────────────────────────
  const update = (key: keyof EmailPrefsType, value: boolean) => {
    const next: EmailPrefsType = { ...prefs, [key]: value };
    setPrefs(next);

    // Persist locally immediately
    AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(next)).catch(() => {});

    // Persist to Supabase
    if (userId) {
      setSaving(true);
      saveEmailPrefs(userId, next)
        .catch(() => {})
        .finally(() => setSaving(false));
    }
  };

  return (
    <SettingsPageShell
      navigation={navigation}
      title="Email Preferences"
      eyebrow="YOUR INBOX"
      headline="Only the updates you want"
      description="Fine-tune ETurismo emails. Security and account recovery messages are always sent."
      icon="mail-open-outline"
    >
      <SectionLabel C={C}>EMAIL CONTENT</SectionLabel>
      <PreferenceCard C={C}>
        <TogglePreference
          C={C}
          icon="sparkles-outline"
          title="Product updates"
          description="New app features and improvements"
          value={prefs.updates}
          onChange={v => update('updates', v)}
          disabled={loading || saving}
        />
        <TogglePreference
          C={C}
          icon="calendar-outline"
          title="Events and exhibits"
          description="Upcoming tours, masses, and exhibitions"
          value={prefs.events}
          onChange={v => update('events', v)}
          disabled={loading || saving}
        />
        <TogglePreference
          C={C}
          icon="newspaper-outline"
          title="Heritage newsletter"
          description="Stories from the collection and community"
          value={prefs.newsletter}
          onChange={v => update('newsletter', v)}
          disabled={loading || saving}
          isLast
        />
      </PreferenceCard>
    </SettingsPageShell>
  );
}
