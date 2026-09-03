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
  profile_picture?: string | null;
  role: UserRole;
  status: UserStatus;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile extends User {
  full_name: string;
}

export type PartialUser = Partial<User> & Pick<User, 'id'>;
