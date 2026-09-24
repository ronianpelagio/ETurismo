import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../../context/ThemeContext';
import SettingsPageShell, { settingsPalette } from '../../../features/settings/components/SettingsPageShell';
import { PreferenceCard, SectionLabel, TogglePreference } from '../../../features/settings/components/PreferenceCard';
import {
  DEFAULT_NOTIFICATION_PREFS,
  NotificationPrefs,
  getNotificationPrefs,
  saveNotificationPrefs,
  registerForPushNotificationsAsync,
  syncPushToken,
} from '../../../services/notificationService';
import { supabase } from '../../../services/supabase';

import Constants from 'expo-constants';
const IS_EXPO_GO = Constants.appOwnership === 'expo';

// ─── Local cache key — used as the initial value before Supabase responds
const LOCAL_KEY = 'notification_preferences_v1';

export default function Notifications({ navigation }: any) {
  const { theme } = useAppTheme();
  const C = settingsPalette(theme);

  const [prefs, setPrefs]     = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [userId, setUserId]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // ── Load: local cache first, then Supabase ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Paint from local cache immediately so there's no blank state
      try {
        const cached = await AsyncStorage.getItem(LOCAL_KEY);
        if (cached && !cancelled) {
          setPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(cached) });
        }
      } catch {}

      // 2. Fetch the real value from Supabase
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid || cancelled) return;
        setUserId(uid);

        const remote = await getNotificationPrefs(uid);
        if (!cancelled) {
          setPrefs(remote);
          // Keep local cache in sync
          AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(remote)).catch(() => {});
        }
      } catch {
        // Network error — local cache is already shown, nothing to do
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Toggle a preference ────────────────────────────────────────────────────
  const update = async (key: keyof NotificationPrefs, value: boolean) => {
    // If turning push ON, ask the OS for permission first
    if (key === 'push' && value) {
      if (IS_EXPO_GO) {
        Alert.alert(
          'Development Build Required',
          'Push notifications are not supported in Expo Go. Build a development build to enable them.',
        );
        return;
      }
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        Alert.alert(
          'Permission Required',
          'Push notifications are blocked. Please enable them in your device Settings for ETurismo.',
        );
        return; // don't toggle on if permission was denied
      }
      // Store the token in Supabase while we're here
      if (userId) {
        syncPushToken(userId).catch(() => {});
      }
    }

    const next: NotificationPrefs = { ...prefs, [key]: value };
    setPrefs(next);

    // Persist locally immediately
    AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(next)).catch(() => {});

    // Persist to Supabase
    if (userId) {
      setSaving(true);
      saveNotificationPrefs(userId, next)
        .catch(() => {
          // Silently fail — local state is already updated
        })
        .finally(() => setSaving(false));
    }
  };

  return (
    <SettingsPageShell
      navigation={navigation}
      title="Notifications"
      eyebrow="STAY INFORMED"
      headline="Choose what reaches you"
      description="Control tour reminders and important ETurismo updates."
      icon="notifications-outline"
    >
      <SectionLabel C={C}>NOTIFICATION CHANNELS</SectionLabel>
      <PreferenceCard C={C}>
        <TogglePreference
          C={C}
          icon="phone-portrait-outline"
          title="Push notifications"
          description="Tour reminders and live updates sent to your device"
          value={prefs.push}
          onChange={v => update('push', v)}
          disabled={loading || saving}
        />
        <TogglePreference
          C={C}
          icon="mail-outline"
          title="Email notifications"
          description="Important account and museum updates by email"
          value={prefs.email}
          onChange={v => update('email', v)}
          disabled={loading || saving}
        />
        <TogglePreference
          C={C}
          icon="chatbubble-outline"
          title="SMS notifications"
          description="Urgent visit notices sent by text message"
          value={prefs.sms}
          onChange={v => update('sms', v)}
          disabled={loading || saving}
          isLast
        />
      </PreferenceCard>
    </SettingsPageShell>
  );
}
