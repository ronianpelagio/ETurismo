import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../../context/ThemeContext';
import SettingsPageShell, { settingsPalette } from '../../../features/settings/components/SettingsPageShell';
import { PreferenceCard, SectionLabel, TogglePreference } from '../../../features/settings/components/PreferenceCard';

const STORAGE_KEY = 'notification_preferences_v1';
const DEFAULTS = { push: true, email: true, sms: false };

export default function Notifications({ navigation }: any) {
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
    <SettingsPageShell navigation={navigation} title="Notifications" eyebrow="STAY INFORMED"
      headline="Choose what reaches you"
      description="Control tour reminders and important ETurismo updates. Your choices are saved on this device."
      icon="notifications-outline">
      <SectionLabel C={C}>NOTIFICATION CHANNELS</SectionLabel>
      <PreferenceCard C={C}>
        <TogglePreference C={C} icon="phone-portrait-outline" title="Push notifications" description="Tour reminders and updates inside the app" value={preferences.push} onChange={value => update('push', value)} />
        <TogglePreference C={C} icon="mail-outline" title="Email notifications" description="Important account and museum updates" value={preferences.email} onChange={value => update('email', value)} />
        <TogglePreference C={C} icon="chatbubble-outline" title="SMS notifications" description="Urgent visit notices sent by text" value={preferences.sms} onChange={value => update('sms', value)} isLast />
      </PreferenceCard>
    </SettingsPageShell>
  );
}
