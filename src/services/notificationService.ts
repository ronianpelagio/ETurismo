/**
 * notificationService.ts
 *
 * Handles:
 *  - Requesting push-notification permission from the OS
 *  - Obtaining the Expo push token and persisting it to the `users` table
 *  - Reading / writing the per-user notification + email preference rows
 *  - A helper to schedule a local notification (used for tour reminders etc.)
 *
 * Expo Go compatibility:
 *  getExpoPushTokenAsync() is NOT supported in Expo Go — it requires a
 *  development build or production build. All push-token calls are wrapped
 *  in try/catch and return null gracefully so the rest of the app is
 *  unaffected when running in Expo Go.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// ─── Expo Go detection ────────────────────────────────────────────────────────
// Constants.appOwnership === 'expo' means we are inside Expo Go.
// Push tokens are unavailable there — skip gracefully.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

// ─── Foreground notification behaviour ───────────────────────────────────────
// Show a banner + play a sound even while the app is open.
// Safe to call in Expo Go (local notifications still work there).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
});

// ─── Types ────────────────────────────────────────────────────────────────────
export interface NotificationPrefs {
  push:  boolean;
  email: boolean;
  sms:   boolean;
}

export interface EmailPrefs {
  updates:    boolean;
  events:     boolean;
  newsletter: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  push:  true,
  email: true,
  sms:   false,
};

export const DEFAULT_EMAIL_PREFS: EmailPrefs = {
  updates:    true,
  events:     true,
  newsletter: false,
};

// ─── Push token registration ──────────────────────────────────────────────────
/**
 * Asks for permission and returns the Expo push token string,
 * or null if:
 *   - Running inside Expo Go (not supported there)
 *   - Running on a simulator / emulator
 *   - Permission was denied
 *   - Any other error (network, project ID mismatch, etc.)
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Expo Go does not support remote push tokens
  if (IS_EXPO_GO) return null;

  // Push notifications only work on physical devices
  if (!Device.isDevice) return null;

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:             'ETurismo',
      importance:       Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#C9A84C',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'd2f73ae5-fb9c-4126-aef3-2bc1ee39f35a', // app.json extra.eas.projectId
    });
    return tokenData.data;
  } catch (err) {
    // Silently fail — the app works fine without a push token
    console.warn('[notificationService] Could not get push token:', err);
    return null;
  }
}

/**
 * Registers the device push token and saves it to the `users` row.
 * Safe to call on every app launch — no-ops silently in Expo Go.
 */
export async function syncPushToken(userId: string): Promise<void> {
  if (IS_EXPO_GO) return; // skip entirely in Expo Go — no warning needed
  const token = await registerForPushNotificationsAsync();
  if (!token) return;

  await supabase
    .from('users')
    .update({ expo_push_token: token })
    .eq('id', userId);
}

// ─── Notification preferences ─────────────────────────────────────────────────
export async function getNotificationPrefs(userId: string): Promise<NotificationPrefs> {
  const { data } = await supabase
    .from('users')
    .select('notification_prefs')
    .eq('id', userId)
    .single();

  if (data?.notification_prefs) {
    return { ...DEFAULT_NOTIFICATION_PREFS, ...data.notification_prefs };
  }
  return DEFAULT_NOTIFICATION_PREFS;
}

export async function saveNotificationPrefs(
  userId: string,
  prefs: NotificationPrefs,
): Promise<void> {
  await supabase
    .from('users')
    .update({ notification_prefs: prefs })
    .eq('id', userId);
}

// ─── Email preferences ────────────────────────────────────────────────────────
export async function getEmailPrefs(userId: string): Promise<EmailPrefs> {
  const { data } = await supabase
    .from('users')
    .select('email_prefs')
    .eq('id', userId)
    .single();

  if (data?.email_prefs) {
    return { ...DEFAULT_EMAIL_PREFS, ...data.email_prefs };
  }
  return DEFAULT_EMAIL_PREFS;
}

export async function saveEmailPrefs(
  userId: string,
  prefs: EmailPrefs,
): Promise<void> {
  await supabase
    .from('users')
    .update({ email_prefs: prefs })
    .eq('id', userId);
}

// ─── Local notification helper ────────────────────────────────────────────────
export async function scheduleLocalNotification(
  title: string,
  body: string,
  delaySeconds = 0,
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: delaySeconds > 0
        ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds }
        : null,
    });
  } catch (err) {
    console.warn('[notificationService] scheduleLocalNotification failed:', err);
  }
}
