// src/types/user.ts
// Core user type matching the Supabase `users` table schema

export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  gender?: 'Male' | 'Female' | 'Other';
  age?: number;
  address?: string;
  Address?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  barangay?: string | null;
  profile_picture?: string | null;
  role: UserRole;
  status: UserStatus;
  created_at?: string;
  updated_at?: string;
  /** ISO timestamp updated every time the user opens the app or logs in */
  last_seen?: string | null;
}

export interface UserProfile extends User {
  full_name: string;
}

export type PartialUser = Partial<User> & Pick<User, 'id'>;
