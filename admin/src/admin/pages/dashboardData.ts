import { supabase } from "../services/supabase";
import {
  DashboardDemographics,
  DashboardStats,
  TourFeedbackDailyTrend,
  TourFeedbackRow,
  TourFeedbackStats,
} from "../types";

const queryCount = async (table: string, filter?: Record<string, unknown>) => {
  let query = supabase.from(table).select("id", { head: true, count: "exact" });
  if (filter) {
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value as string);
    });
  }

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
};

const querySafe = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch {
    return null as T | null;
  }
};

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [
    artifacts,
    users,
    activeUsers,
    blockedUsers,
    reviewCount,
    scannedArtifacts,
    audioPlays,
    ratingResponse,
    visitorRows,
    liveResponse,
  ] = await Promise.all([
    queryCount("artifacts"),
    queryCount("users"),
    queryCount("users", { status: "active" }),
    // schema now uses 'active' / 'inactive' for user status
    queryCount("users", { status: "inactive" }),
    queryCount("user_ratings"),
    querySafe(async () => {
      const { count, error } = await supabase
        .from("artifacts")
        .select("id", { head: true, count: "exact" })
        .not("qr_code", "is", null);
      if (error) throw error;
      return count ?? 0;
    }),
    queryCount("audio_guides"),
    querySafe(async () => {
      const { data, error } = await supabase
        .from("user_ratings")
        .select("rating", { head: false });
      if (error) throw error;
      return data as Array<{ rating?: number | null }>;
    }),
    querySafe(async () => {
      const weekAgo = new Date(
        Date.now() - 6 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const { data, error } = await supabase
        .from("users")
        .select("created_at")
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Array<{ created_at?: string | null }>;
    }),
    querySafe(async () => {
      const { data, error } = await supabase
        .from("live_mass")
        .select("is_live")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    }),
  ]);

  const ratings = Array.isArray(ratingResponse)
    ? ratingResponse.map((item) => Number(item.rating ?? 0))
    : [];
  const averageRating = ratings.length
    ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
    : 0;

  const trendDays = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      date: date.toISOString().slice(0, 10),
      count: 0,
    };
  });

  if (Array.isArray(visitorRows)) {
    visitorRows.forEach((row) => {
      if (!row?.created_at) return;
      const dateKey = new Date(row.created_at).toISOString().slice(0, 10);
      const day = trendDays.find((item) => item.date === dateKey);
      if (day) day.count += 1;
    });
  }

  const liveStatus = liveResponse && liveResponse.is_live ? "live" : "offline";

  return {
    artifacts,
    users,
    activeUsers,
    blockedUsers,
    reviews: reviewCount,
    liveStatus,
    totalVisitors: users,
    scannedArtifacts: Number(scannedArtifacts ?? 0),
    audioPlays: Number(audioPlays ?? 0),
    averageRating,
    visitorsTrend: trendDays,
  };
}

export async function fetchUserDemographics(): Promise<DashboardDemographics> {
  const rowsResponse = await querySafe(async () => {
    // users table stores `age` (integer) and `Address` (text) for location breakdown
    const { data, error } = await supabase.from("users").select("gender, age, Address");
    if (error) throw error;
    return data as Array<Record<string, any>>;
  });

  const rows = Array.isArray(rowsResponse) ? rowsResponse : [];

  const result: DashboardDemographics = {
    gender: { male: 0, female: 0, other: 0, unknown: 0 },
    ageGroups: {
      "13-17": 0,
      "18-24": 0,
      "25-34": 0,
      "35-44": 0,
      "45-54": 0,
      "55-64": 0,
      "65+": 0,
      unknown: 0,
    },
    locations: {},
  };

  rows.forEach((row) => {
    const gender = String(row.gender ?? "").toLowerCase();
    if (gender === "male" || gender === "m") result.gender.male += 1;
    else if (gender === "female" || gender === "f") result.gender.female += 1;
    else if (gender) result.gender.other += 1;
    else result.gender.unknown += 1;

    // schema provides `age` as an integer; bucket into groups
    const ageVal = typeof row.age === "number" ? row.age : Number(row.age);
    if (!Number.isNaN(ageVal) && ageVal >= 0) {
      if (ageVal < 18) result.ageGroups["13-17"] += 1;
      else if (ageVal < 25) result.ageGroups["18-24"] += 1;
      else if (ageVal < 35) result.ageGroups["25-34"] += 1;
      else if (ageVal < 45) result.ageGroups["35-44"] += 1;
      else if (ageVal < 55) result.ageGroups["45-54"] += 1;
      else if (ageVal < 65) result.ageGroups["55-64"] += 1;
      else result.ageGroups["65+"] += 1;
    } else {
      result.ageGroups.unknown += 1;
    }

    // Bucket address into top locations (normalise to title-case, trim whitespace)
    const rawAddress = String(row.Address ?? "").trim();
    if (rawAddress) {
      // Normalise: "city, province" → "City, Province"
      const normAddress = rawAddress
        .split(",")
        .map((part) => part.trim().replace(/\b\w/g, (c) => c.toUpperCase()))
        .join(", ");
      result.locations[normAddress] = (result.locations[normAddress] ?? 0) + 1;
    }
  });

  return result;
}


// ─── Tour Feedback Stats ──────────────────────────────────────────────────────

const defaultTourFeedbackStats: TourFeedbackStats = {
  totalSubmissions: 0,
  submissionsLast7d: 0,
  submissionsLast30d: 0,
  avgRating: 0,
  ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  recommendPct: 0,
  recommendYes: 0,
  recommendNo: 0,
  visitTypes: { solo: 0, couple: 0, family: 0, group: 0, school: 0 },
  heardFrom: {},
  avgArtifactsExplored: 0,
  dailyTrend: [],
  recentFeedback: [],
};

export async function fetchTourFeedbackStats(): Promise<TourFeedbackStats> {
  const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [aggRow, trendRows, recentRows] = await Promise.all([
    // 1. Aggregated stats view
    querySafe(async () => {
      const { data, error } = await supabase
        .from("tour_feedback_stats")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as Record<string, any> | null;
    }),

    // 2. 30-day daily trend view
    querySafe(async () => {
      const { data, error } = await supabase
        .from("tour_feedback_daily_trend")
        .select("day, submissions, avg_rating")
        .gte("day", thirtyDaysAgo)
        .order("day", { ascending: true });
      if (error) throw error;
      return data as Array<{ day: string; submissions: number; avg_rating: number }>;
    }),

    // 3. Recent 5 feedback rows (with user join for display)
    querySafe(async () => {
      const { data, error } = await supabase
        .from("tour_feedback")
        .select(
          "id, user_id, overall_rating, visit_type, heard_from, highlights, suggestions, would_recommend, total_artifacts, submitted_at",
        )
        .order("submitted_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as TourFeedbackRow[];
    }),
  ]);

  if (!aggRow) return defaultTourFeedbackStats;

  // Heard-from breakdown: query the view directly
  const heardFromMap: Record<string, number> = {};
  const heardFromRows = await querySafe(async () => {
    const { data, error } = await supabase
      .from("tour_feedback_heard_from")
      .select("source, count");
    if (error) throw error;
    return data as Array<{ source: string; count: number }>;
  });
  if (Array.isArray(heardFromRows)) {
    heardFromRows.forEach((r) => {
      heardFromMap[r.source] = Number(r.count ?? 0);
    });
  }

  // Build full 30-day trend (fill missing days with 0)
  const trendMap = new Map<string, { submissions: number; avg_rating: number }>();
  if (Array.isArray(trendRows)) {
    trendRows.forEach((r) => trendMap.set(r.day, r));
  }
  const dailyTrend: TourFeedbackDailyTrend[] = Array.from({ length: 30 }).map(
    (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const found = trendMap.get(key);
      return {
        day: key,
        submissions: found?.submissions ?? 0,
        avg_rating: found ? Number(found.avg_rating ?? 0) : 0,
      };
    },
  );

  return {
    totalSubmissions: Number(aggRow.total_submissions ?? 0),
    submissionsLast7d: Number(aggRow.submissions_last_7d ?? 0),
    submissionsLast30d: Number(aggRow.submissions_last_30d ?? 0),

    avgRating: Number(aggRow.avg_rating ?? 0),
    ratingDistribution: {
      1: Number(aggRow.rating_1 ?? 0),
      2: Number(aggRow.rating_2 ?? 0),
      3: Number(aggRow.rating_3 ?? 0),
      4: Number(aggRow.rating_4 ?? 0),
      5: Number(aggRow.rating_5 ?? 0),
    },

    recommendPct: Number(aggRow.recommend_pct ?? 0),
    recommendYes: Number(aggRow.recommend_yes ?? 0),
    recommendNo: Number(aggRow.recommend_no ?? 0),

    visitTypes: {
      solo: Number(aggRow.vt_solo ?? 0),
      couple: Number(aggRow.vt_couple ?? 0),
      family: Number(aggRow.vt_family ?? 0),
      group: Number(aggRow.vt_group ?? 0),
      school: Number(aggRow.vt_school ?? 0),
    },

    heardFrom: heardFromMap,
    avgArtifactsExplored: Number(aggRow.avg_artifacts_explored ?? 0),
    dailyTrend,
    recentFeedback: Array.isArray(recentRows) ? recentRows : [],
  };
}
