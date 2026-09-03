// src/services/authService.ts
// Thin wrapper around Supabase Auth + users table

import { supabase } from './supabase';
import type { User } from '../types/user';

export interface SignInResult {
  user: User | null;
  error: string | null;
}

export interface SignUpData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  gender?: 'Male' | 'Female' | 'Other';
  age?: number;
  address?: string;
  profile_picture?: string | null;
}

/**
 * Sign in with email/password and validate user profile.
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });

  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: 'Login failed. Please try again.' };

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) return { user: null, error: profileError.message };
  if (!profile) return { user: null, error: 'Profile not found. Please sign up again.' };
  if (profile.status !== 'active') return { user: null, error: 'Account inactive. Contact support.' };

  return { user: profile as User, error: null };
}

/**
 * Sign out the currently authenticated user.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Get the current session user profile.
 */
export async function getCurrentUserProfile(): Promise<User | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session?.user) return null;

  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', sessionData.session.user.id)
    .maybeSingle();

  return (data as User) ?? null;
}

/**
 * Update user profile fields.
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<User, 'id' | 'email' | 'role' | 'status' | 'created_at'>>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);

  return { error: error?.message ?? null };
}
