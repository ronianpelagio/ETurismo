import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase SMTP reminder ───────────────────────────────────────────────────
// Dashboard → Project Settings → Authentication → SMTP Settings
// Host: smtp-relay.brevo.com
// Port: 587  ← must be 587 (TLS) or 465 (SSL). Port 565 does NOT exist.
// Username: ae3788001@smtp-brevo.com
// Password: your Brevo SMTP password
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl = 'https://crcrgkskhoruqcbssvaw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyY3Jna3NraG9ydXFjYnNzdmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjgxNzQsImV4cCI6MjA5Mjk0NDE3NH0.SbgnbogBFjtuUbI7zp0bz65L7YA4oiEpCBs10syHJY0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});