import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../../context/ThemeContext';
import SettingsPageShell, { settingsPalette } from '../../../features/settings/components/SettingsPageShell';
import { PreferenceCard, SectionLabel, TogglePreference } from '../../../features/settings/components/PreferenceCard';

const STORAGE_KEY = 'email_preferences_v1';
const DEFAULTS = { updates: true, events: true, newsletter: false };

export default function EmailPrefs({ navigation }: any) {
  const { theme } = useAppTheme();
  const C = settingsPalette(theme);
  const [preferences, setPreferences] = useState(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => value && setPreferences({ ...DEFAULTS, ...JSON.parse(value) }))
      .catch(() => {});
  }, []);

  const update = (key: keyof typeof DEFAULTS, value: boolean) => {
    setPreferences(previous => {
      const next = { ...previous, [key]: value };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  return (
    <SettingsPageShell navigation={navigation} title="Email Preferences" eyebrow="YOUR INBOX"
      headline="Only the updates you want"
      description="Fine-tune ETurismo email without affecting security and account recovery messages."
      icon="mail-open-outline">
      <SectionLabel C={C}>EMAIL CONTENT</SectionLabel>
      <PreferenceCard C={C}>
        <TogglePreference C={C} icon="sparkles-outline" title="Product updates" description="New app features and improvements" value={preferences.updates} onChange={value => update('updates', value)} />
        <TogglePreference C={C} icon="calendar-outline" title="Events and exhibits" description="Upcoming tours, masses, and exhibitions" value={preferences.events} onChange={value => update('events', value)} />
        <TogglePreference C={C} icon="newspaper-outline" title="Heritage newsletter" description="Stories from the collection and community" value={preferences.newsletter} onChange={value => update('newsletter', value)} isLast />
      </PreferenceCard>
    </SettingsPageShell>
  );
}
