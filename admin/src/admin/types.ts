export interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  gender: string | null;
  age: number | null;
  status: string;
  email: string;
  role: string;
  profile_picture: string | null;
  Address: string | null;
  created_at: string;
  /** ISO timestamp written by the mobile app each time the user opens the app */
  last_seen: string | null;
}
// Update your Artifact type in your types file
export type Artifact = {
  id: string;
  name: string;
  category: string;
  qr_code?: string | null;
  qr_value?: string | null;
  description?: string | null;
  image_url?: string | null;
  creator?: string | null;
  Historical_Significance?: string | null;
  created_at?: string | null;
};

export type ArtifactTranslation = {
  id: string;
  artifact_id: string;
  language_code: string;
  name: string;
  description?: string | null;
  audio_url?: string | null;
  created_at?: string | null;
};
export type Announcement = {
  id: string;
  title: string;
  announcement_datetime: string;
  description?: string | null;
  image_url?: string | null;
  created_at?: string | null;
};

export type EventItem = {
  id: string;
  title: string;
  event_datetime: string;
  description?: string | null;
  image_url?: string | null;
  created_at?: string | null;
};

export type AudioGuide = {
  id: string;
  artifact_id?: string | null;
  artifact_name?: string | null;
  audio_url?: string | null;
  created_at?: string | null;
};

export type RatingReview = {
  id: string;
  user_id?: string | null;
  artifact_id?: string | null;
  rating?: number | null;
  feedback?: string | null;
  created_at?: string | null;
};

export type LiveMass = {
  id?: string;
  title: string;
  stream_url?: string | null;
  is_live?: boolean | null;
  started_at?: string | null;
  created_at?: string | null;
};

export type DashboardVisitorTrend = {
  date: string;
  count: number;
};

export type DashboardStats = {
  artifacts: number;
  users: number;
  activeUsers: number;
  blockedUsers: number;
  reviews: number;
  liveStatus: "offline" | "live";
  totalVisitors: number;
  scannedArtifacts: number;
  audioPlays: number;
  averageRating: number;
  visitorsTrend: DashboardVisitorTrend[];
};

// ─── Tour Feedback ────────────────────────────────────────────────────────────

export type TourFeedbackRow = {
  id: string;
  user_id: string | null;
  overall_rating: number;
  visit_type: "solo" | "couple" | "family" | "group" | "school";
  heard_from: string[];
  highlights: string | null;
  suggestions: string | null;
  would_recommend: boolean;
  total_artifacts: number;
  submitted_at: string;
};

export type TourFeedbackDailyTrend = {
  day: string; // ISO date string "YYYY-MM-DD"
  submissions: number;
  avg_rating: number;
};

export type TourFeedbackStats = {
  // Volume
  totalSubmissions: number;
  submissionsLast7d: number;
  submissionsLast30d: number;

  // Ratings
  avgRating: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;

  // Recommendation
  recommendPct: number;
  recommendYes: number;
  recommendNo: number;

  // Visit-type breakdown
  visitTypes: Record<"solo" | "couple" | "family" | "group" | "school", number>;

  // Heard-from breakdown  { social_media: 12, friend: 8, … }
  heardFrom: Record<string, number>;

  // Avg artifacts explored per visit
  avgArtifactsExplored: number;

  // 30-day daily trend
  dailyTrend: TourFeedbackDailyTrend[];

  // Recent 5 submissions for the "latest feedback" list
  recentFeedback: TourFeedbackRow[];
};

export type DashboardDemographics = {
  gender: {
    male: number;
    female: number;
    other: number;
    unknown: number;
  };
  ageGroups: {
    "13-17": number;
    "18-24": number;
    "25-34": number;
    "35-44": number;
    "45-54": number;
    "55-64": number;
    "65+": number;
    unknown: number;
  };
  locations: Record<string, number>;
};
