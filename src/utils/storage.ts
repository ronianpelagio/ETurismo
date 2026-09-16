import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGACY_SAVED_ARTIFACTS_KEY = 'savedArtifacts';

export const STORAGE_KEYS = {
  favoriteArtifacts: 'favoriteArtifacts',
  interestedEvents:  'interestedEvents',
  cachedArtifacts:   'cachedArtifacts',
  visitHistory:      'visitHistory',
  artifactComments:  'artifactComments',
  tourFeedback:      'tourFeedback',
} as const;

// ── Visit history entry ────────────────────────────────────────────────────────
export type VisitEntry = {
  artifactId:   string;
  artifactName: string;
  category:     string;
  image_url:    string;
  visitedAt:    number; // Unix ms timestamp
};

export async function getVisitHistory(): Promise<VisitEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.visitHistory);
  const parsed = safeParseJson<VisitEntry[]>(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export async function logVisit(entry: Omit<VisitEntry, 'visitedAt'>): Promise<void> {
  const history = await getVisitHistory();
  // Remove previous entry for the same artifact, prepend new one
  const filtered = history.filter(v => v.artifactId !== entry.artifactId);
  const updated: VisitEntry[] = [{ ...entry, visitedAt: Date.now() }, ...filtered].slice(0, 100);
  await AsyncStorage.setItem(STORAGE_KEYS.visitHistory, JSON.stringify(updated));
}

export async function clearVisitHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.visitHistory);
}

// ── Comments ──────────────────────────────────────────────────────────────────
export type CommentsMap = Record<string, string>; // artifactId -> comment text

export async function getComments(): Promise<CommentsMap> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.artifactComments);
  return (safeParseJson<CommentsMap>(raw)) || {};
}

export async function setComment(artifactId: string, text: string): Promise<CommentsMap> {
  const map = await getComments();
  map[artifactId] = text;
  await AsyncStorage.setItem(STORAGE_KEYS.artifactComments, JSON.stringify(map));
  return map;
}

type Json = any;

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function getStringArray(key: string): Promise<string[]> {
  const stored = await AsyncStorage.getItem(key);
  const parsed = safeParseJson<string[]>(stored);
  const current = Array.isArray(parsed) ? parsed : [];

  if (key === STORAGE_KEYS.favoriteArtifacts) {
    const legacyStored = await AsyncStorage.getItem(LEGACY_SAVED_ARTIFACTS_KEY);
    const legacy = safeParseJson<string[]>(legacyStored);
    if (Array.isArray(legacy)) {
      const merged = Array.from(new Set([...current, ...legacy]));
      await AsyncStorage.setItem(STORAGE_KEYS.favoriteArtifacts, JSON.stringify(merged));
      await AsyncStorage.removeItem(LEGACY_SAVED_ARTIFACTS_KEY);
      return merged;
    }
  }

  return current;
}

export async function setStringArray(key: string, value: string[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(Array.from(new Set(value))));
}

export async function toggleInStringArray(key: string, item: string): Promise<string[]> {
  const existing = await getStringArray(key);
  const has = existing.includes(item);
  const updated = has ? existing.filter(x => x !== item) : [...existing, item];
  await setStringArray(key, updated);
  return updated;
}

// ── Tour Feedback ─────────────────────────────────────────────────────────────
export type VisitType = 'solo' | 'couple' | 'family' | 'group' | 'school';

export type TourFeedback = {
  id: string;                   // uuid generated client-side
  userId?: string;              // Supabase auth uid (optional – anonymous allowed)
  overallRating: number;        // 1–5 stars for the completed tour
  visitType: VisitType;
  heardFrom: string[];          // multi-select: 'social_media','friend','flyer','hotel','other'
  highlights: string;           // free-text: favourite part of the tour
  suggestions: string;          // free-text: what could be improved
  wouldRecommend: boolean;
  submittedAt: number;          // Unix ms
};

export async function saveTourFeedback(feedback: TourFeedback): Promise<void> {
  const raw  = await AsyncStorage.getItem(STORAGE_KEYS.tourFeedback);
  const list: TourFeedback[] = safeParseJson<TourFeedback[]>(raw) ?? [];
  list.unshift(feedback);
  await AsyncStorage.setItem(STORAGE_KEYS.tourFeedback, JSON.stringify(list));
}

export async function getTourFeedbackList(): Promise<TourFeedback[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.tourFeedback);
  return safeParseJson<TourFeedback[]>(raw) ?? [];
}
