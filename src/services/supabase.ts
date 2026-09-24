// src/services/supabase.ts

import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────
// Environment Variables
// ─────────────────────────────────────────────────────────────

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL as string;

const supabaseAnonKey =
  (
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ) as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
      'Add EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your .env file.'
  );
}

// ─────────────────────────────────────────────────────────────
// Supabase Client
// ─────────────────────────────────────────────────────────────

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      // AsyncStorage is required for native React Native session storage.
      ...(Platform.OS !== 'web'
        ? { storage: AsyncStorage }
        : {}),

      autoRefreshToken: true,

      persistSession: true,

      // Native Expo handles OAuth redirects manually.
      detectSessionInUrl: false,
    },
  }
);

// ─────────────────────────────────────────────────────────────
// Automatic Session Refresh
// ─────────────────────────────────────────────────────────────
//
// Supabase recommends controlling token refresh based on
// React Native AppState.
//
// When ETurismo is active:
//     → refresh tokens normally
//
// When ETurismo goes into background:
//     → stop unnecessary refresh activity
//

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', state => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}