/**
 * notificationService.ts
 *
 * Handles:
 *  - Requesting push-notification permission from the OS
 *  - Obtaining the Expo push token
 *  - Persisting the Expo push token to the `users` table
 *  - Reading/writing notification preferences
 *  - Reading/writing email preferences
 *  - Scheduling local notifications
 *
 * Notes:
 *  - Remote push notifications require a development or production build.
 *  - Remote push notifications require a physical device.
 *  - Android push notifications use Firebase Cloud Messaging (FCM).
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Expo Go detection
// ─────────────────────────────────────────────────────────────────────────────

const IS_EXPO_GO = Constants.appOwnership === 'expo';

// ─────────────────────────────────────────────────────────────────────────────
// Permission primer
// ─────────────────────────────────────────────────────────────────────────────

const PRIMER_SHOWN_KEY = 'notif_primer_shown_v1';

/**
 * Returns true when the app's custom notification primer
 * has already been shown on this device.
 *
 * IMPORTANT:
 * This does NOT represent the Android/iOS notification permission.
 */
export async function hasShownNotifPrimer(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(PRIMER_SHOWN_KEY);

    return value === 'true';
  } catch (error) {
    console.warn(
      '[notificationService] Could not read notification primer state:',
      error,
    );

    return false;
  }
}

/**
 * Records that the app's custom notification primer has been shown.
 */
export async function markNotifPrimerShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(PRIMER_SHOWN_KEY, 'true');
  } catch (error) {
    console.warn(
      '[notificationService] Could not save notification primer state:',
      error,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Foreground notification behavior
// ─────────────────────────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationPrefs {
  push: boolean;
  email: boolean;
  sms: boolean;
}

export interface EmailPrefs {
  updates: boolean;
  events: boolean;
  newsletter: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  push: true,
  email: true,
  sms: false,
};

export const DEFAULT_EMAIL_PREFS: EmailPrefs = {
  updates: true,
  events: true,
  newsletter: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Expo / EAS project ID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gets the EAS project ID from the Expo application configuration.
 *
 * app.json:
 *
 * "extra": {
 *   "eas": {
 *     "projectId": "..."
 *   }
 * }
 */
function getEasProjectId(): string | null {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId || typeof projectId !== 'string') {
    return null;
  }

  return projectId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification permission
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Requests notification permission when possible.
 *
 * Returns:
 *  true  -> permission granted
 *  false -> permission denied / blocked
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    // Android requires a notification channel.
    //
    // Creating the channel before requesting permission is important
    // for Android notification behavior.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'ETurismo',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C9A84C',
      });
    }

    const currentPermission =
      await Notifications.getPermissionsAsync();

    console.log(
      '[notificationService] Current notification permission:',
      currentPermission.status,
    );

    // Already allowed
    if (currentPermission.status === 'granted') {
      return true;
    }

    // Android/iOS no longer allows the app to display
    // the permission prompt automatically.
    if (!currentPermission.canAskAgain) {
      console.warn(
        '[notificationService] Push notifications are blocked. Enable notifications from the device settings.',
      );

      return false;
    }

    // Request permission
    const requestedPermission =
      await Notifications.requestPermissionsAsync();

    console.log(
      '[notificationService] Notification permission result:',
      requestedPermission.status,
    );

    if (requestedPermission.status !== 'granted') {
      console.warn(
        '[notificationService] Notification permission was not granted.',
      );

      return false;
    }

    console.log(
      '[notificationService] Notification permission granted.',
    );

    return true;
  } catch (error) {
    console.warn(
      '[notificationService] Failed to request notification permission:',
      error,
    );

    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Push token registration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Requests notification permission and obtains the Expo push token.
 *
 * Returns null when:
 *
 *  - Running in Expo Go
 *  - Running on an emulator/simulator
 *  - Permission is denied
 *  - Permission is blocked
 *  - EAS project ID is missing
 *  - Firebase/FCM is not configured correctly
 *  - Expo token registration fails
 */
export async function registerForPushNotificationsAsync():
  Promise<string | null> {

  // ───────────────────────────────────────────────────────────────────────────
  // Expo Go
  // ───────────────────────────────────────────────────────────────────────────

  if (IS_EXPO_GO) {
    console.log(
      '[notificationService] Remote push notifications are unavailable in Expo Go.',
    );

    return null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Physical device
  // ───────────────────────────────────────────────────────────────────────────

  if (!Device.isDevice) {
    console.log(
      '[notificationService] Push notifications require a physical device.',
    );

    return null;
  }

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // Permission
    // ─────────────────────────────────────────────────────────────────────────

    const permissionGranted =
      await requestNotificationPermission();

    if (!permissionGranted) {
      return null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EAS project ID
    // ─────────────────────────────────────────────────────────────────────────

    const projectId = getEasProjectId();

    if (!projectId) {
      console.warn(
        '[notificationService] EAS projectId is missing from the Expo configuration.',
      );

      return null;
    }

    console.log(
      '[notificationService] Registering device with Expo Push Service.',
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Expo push token
    // ─────────────────────────────────────────────────────────────────────────

    const tokenData =
      await Notifications.getExpoPushTokenAsync({
        projectId,
      });

    const token = tokenData.data;

    if (!token) {
      console.warn(
        '[notificationService] Expo Push Service returned an empty token.',
      );

      return null;
    }

    console.log(
      '[notificationService] Expo push token obtained:',
      token,
    );

    return token;
  } catch (error) {
    console.warn(
      '[notificationService] Could not register for push notifications:',
      error,
    );

    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Push token → Supabase
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registers this device for push notifications and stores
 * its Expo push token in the current user's Supabase profile.
 *
 * Safe to call on application startup.
 */
export async function syncPushToken(
  userId: string,
): Promise<void> {

  if (IS_EXPO_GO) {
    return;
  }

  if (!userId) {
    console.warn(
      '[notificationService] Cannot sync push token without a user ID.',
    );

    return;
  }

  try {
    const token =
      await registerForPushNotificationsAsync();

    if (!token) {
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({
        expo_push_token: token,
      })
      .eq('id', userId);

    if (error) {
      console.warn(
        '[notificationService] Failed to save push token:',
        error.message,
      );

      return;
    }

    console.log(
      '[notificationService] Push token synced successfully.',
    );
  } catch (error) {
    console.warn(
      '[notificationService] Unexpected push-token sync error:',
      error,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification preferences
// ─────────────────────────────────────────────────────────────────────────────

export async function getNotificationPrefs(
  userId: string,
): Promise<NotificationPrefs> {

  try {
    const { data, error } = await supabase
      .from('users')
      .select('notification_prefs')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn(
        '[notificationService] Failed to load notification preferences:',
        error.message,
      );

      return DEFAULT_NOTIFICATION_PREFS;
    }

    if (data?.notification_prefs) {
      return {
        ...DEFAULT_NOTIFICATION_PREFS,
        ...data.notification_prefs,
      };
    }

    return DEFAULT_NOTIFICATION_PREFS;
  } catch (error) {
    console.warn(
      '[notificationService] Failed to load notification preferences:',
      error,
    );

    return DEFAULT_NOTIFICATION_PREFS;
  }
}

export async function saveNotificationPrefs(
  userId: string,
  prefs: NotificationPrefs,
): Promise<void> {

  try {
    const { error } = await supabase
      .from('users')
      .update({
        notification_prefs: prefs,
      })
      .eq('id', userId);

    if (error) {
      console.warn(
        '[notificationService] Failed to save notification preferences:',
        error.message,
      );
    }
  } catch (error) {
    console.warn(
      '[notificationService] Failed to save notification preferences:',
      error,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Email preferences
// ─────────────────────────────────────────────────────────────────────────────

export async function getEmailPrefs(
  userId: string,
): Promise<EmailPrefs> {

  try {
    const { data, error } = await supabase
      .from('users')
      .select('email_prefs')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn(
        '[notificationService] Failed to load email preferences:',
        error.message,
      );

      return DEFAULT_EMAIL_PREFS;
    }

    if (data?.email_prefs) {
      return {
        ...DEFAULT_EMAIL_PREFS,
        ...data.email_prefs,
      };
    }

    return DEFAULT_EMAIL_PREFS;
  } catch (error) {
    console.warn(
      '[notificationService] Failed to load email preferences:',
      error,
    );

    return DEFAULT_EMAIL_PREFS;
  }
}

export async function saveEmailPrefs(
  userId: string,
  prefs: EmailPrefs,
): Promise<void> {

  try {
    const { error } = await supabase
      .from('users')
      .update({
        email_prefs: prefs,
      })
      .eq('id', userId);

    if (error) {
      console.warn(
        '[notificationService] Failed to save email preferences:',
        error.message,
      );
    }
  } catch (error) {
    console.warn(
      '[notificationService] Failed to save email preferences:',
      error,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Local notifications
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schedules a local notification.
 *
 * delaySeconds:
 *  0     -> show immediately
 *  > 0   -> show after the specified delay
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  delaySeconds = 0,
): Promise<void> {

  try {
    const permissionGranted =
      await requestNotificationPermission();

    if (!permissionGranted) {
      console.warn(
        '[notificationService] Local notification not scheduled because notification permission is unavailable.',
      );

      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
      },

      trigger:
        delaySeconds > 0
          ? {
              type:
                Notifications
                  .SchedulableTriggerInputTypes
                  .TIME_INTERVAL,

              seconds: delaySeconds,
            }
          : null,
    });

    console.log(
      '[notificationService] Local notification scheduled successfully.',
    );
  } catch (error) {
    console.warn(
      '[notificationService] scheduleLocalNotification failed:',
      error,
    );
  }
}