import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../services/supabase';

export interface PendingProfile {
  email: string;
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  address: string;
  country: string;
  province: string | null;
  city: string | null;
  barangay: string | null;
  profilePicUri: string | null;
}

function storageKey(email: string) {
  return `pending_profile_${email.toLowerCase().trim()}`;
}

export async function savePendingProfile(profile: PendingProfile) {
  await AsyncStorage.setItem(storageKey(profile.email), JSON.stringify(profile));
}

export async function clearPendingProfile(email: string) {
  await AsyncStorage.removeItem(storageKey(email));
}

const finalizations = new Map<string, Promise<void>>();

async function getPendingProfile(email: string): Promise<PendingProfile | null> {
  const value = await AsyncStorage.getItem(storageKey(email));
  if (!value) return null;

  try {
    return JSON.parse(value) as PendingProfile;
  } catch {
    await clearPendingProfile(email);
    return null;
  }
}

async function runFinalization(email: string, userId: string) {
  const profile = await getPendingProfile(email);
  if (!profile) return;

  let profilePictureUrl: string | null = null;

  if (profile.profilePicUri) {
    const imageResponse = await fetch(profile.profilePicUri);
    const imageData = await imageResponse.arrayBuffer();
    const objectPath = `${userId}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(objectPath, imageData, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('profile-pictures').getPublicUrl(objectPath);
    profilePictureUrl = `${data.publicUrl}?v=${Date.now()}`;
  }

  const { error: profileError } = await supabase
    .from('users')
    .update({
      first_name: profile.firstName,
      last_name: profile.lastName,
      gender: profile.gender,
      age: profile.age,
      Address: profile.address,
      country: profile.country,
      province: profile.province,
      city: profile.city,
      barangay: profile.barangay,
      ...(profilePictureUrl ? { profile_picture: profilePictureUrl } : {}),
    })
    .eq('id', userId);

  if (profileError) throw profileError;
  await clearPendingProfile(email);
}

export function finalizePendingProfile(email: string, userId: string) {
  const key = email.toLowerCase().trim();
  const current = finalizations.get(key);
  if (current) return current;

  const request = runFinalization(key, userId).finally(() => finalizations.delete(key));
  finalizations.set(key, request);
  return request;
}
