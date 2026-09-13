import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase SMTP reminder ───────────────────────────────────────────────────
// Dashboard → Project Settings → Authentication → SMTP Settings
// Host: smtp-relay.brevo.com
// Port: 587  ← must be 587 (TLS) or 465 (SSL). Port 565 does NOT exist.
// Username: ae3788001@smtp-brevo.com
// Password: your Brevo SMTP password
// ─────────────────────────────────────────────────────────────────────────────

// Keys are read from .env (EXPO_PUBLIC_ prefix makes them available at runtime).
// Never hardcode secrets in source — keep them in .env and out of version control.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey =
  (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
    'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
