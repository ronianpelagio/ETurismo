// EmailJS OTP helper
// Add EXPO_PUBLIC_EMAILJS_SERVICE_ID, EXPO_PUBLIC_EMAILJS_TEMPLATE_ID,
// and EXPO_PUBLIC_EMAILJS_PUBLIC_KEY to your .env file

import emailjs from '@emailjs/browser';

const SERVICE_ID  = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID  ?? '';
const TEMPLATE_ID = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID ?? '';
const PUBLIC_KEY  = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY  ?? '';

// In-memory OTP store (session-scoped). For production, persist in Supabase.
const otpStore: Record<string, { code: string; expiresAt: number }> = {};

export function createOTP(email: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = { code, expiresAt: Date.now() + 5 * 60 * 1000 };
  return code;
}

export function verifyOTP(email: string, code: string): 'valid' | 'expired' | 'invalid' {
  const entry = otpStore[email];
  if (!entry) return 'invalid';
  if (Date.now() > entry.expiresAt) { delete otpStore[email]; return 'expired'; }
  if (entry.code !== code) return 'invalid';
  delete otpStore[email];
  return 'valid';
}

export async function sendOTPEmail(email: string, code: string): Promise<void> {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    throw new Error('EmailJS environment variables are not set');
  }

  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    { to_email: email, otp_code: code },
    { publicKey: PUBLIC_KEY },
  );
}
