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

/**
 * Count users whose last_seen timestamp is within the last `minutes` minutes.
 * Falls back to status='active' for rows that predate the last_seen column.
 */
export async function fetchActiveUserCount(minutes = 5): Promise<number> {
  const threshold = new Date(Date.now() - minutes * 60 * 1000).toISOString();

  // Primary: users that pinged the app recently
  const { count: recentCount, error: recentErr } = await supabase
    .from("users")
    .select("id", { head: true, count: "exact" })
    .gte("last_seen", threshold);

  if (!recentErr && recentCount !== null) return recentCount;

  // Fallback (last_seen column doesn't exist yet): count status='active'
  return queryCount("users", { status: "active" });
}

const querySafe = async <T>(fn: () => Promise<T>) => {
  try {
    return await fn();
  } catch {
    return null as T | null;
  }
};

export async function fetchDashboardStats(
  fromDate?: string,
): Promise<DashboardStats> {
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
    fetchActiveUserCount(5),
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
      // Use fromDate if provided, otherwise default to 6 days ago (7-day window)
      const start = fromDate
        ? new Date(fromDate).toISOString()
        : new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("users")
        .select("created_at")
        .gte("created_at", start)
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

  // Build trend days spanning from fromDate to today
  const startMs = fromDate
    ? new Date(fromDate).getTime()
    : Date.now() - 6 * 24 * 60 * 60 * 1000;
  const totalDays = Math.max(
    1,
    Math.round((Date.now() - startMs) / (24 * 60 * 60 * 1000)) + 1,
  );
  const trendDays = Array.from({ length: totalDays }).map((_, index) => {
    const date = new Date(startMs + index * 24 * 60 * 60 * 1000);
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
    const { data, error } = await supabase
      .from("users")
      .select("gender, age, Address");
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
  // Fetch all rows directly from the tour_feedback table — no views needed.
  // The authenticated admin policy in sql/tour_feedback.sql grants this read.
  const allRowsResponse = await querySafe(async () => {
    const { data, error } = await supabase
      .from("tour_feedback")
      .select(
        "id, user_id, overall_rating, visit_type, heard_from, highlights, suggestions, would_recommend, total_artifacts, submitted_at",
      )
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return data as TourFeedbackRow[];
  });

  const all: TourFeedbackRow[] = Array.isArray(allRowsResponse)
    ? allRowsResponse
    : [];

  if (all.length === 0) return defaultTourFeedbackStats;

  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 29 * 24 * 60 * 60 * 1000);

  // ── Volume ──────────────────────────────────────────────────────────────────
  const totalSubmissions = all.length;
  const submissionsLast7d = all.filter(
    (r) => new Date(r.submitted_at) >= sevenDaysAgo,
  ).length;
  const submissionsLast30d = all.filter(
    (r) => new Date(r.submitted_at) >= thirtyDaysAgo,
  ).length;

  // ── Ratings ─────────────────────────────────────────────────────────────────
  const avgRating =
    all.reduce((s, r) => s + r.overall_rating, 0) / totalSubmissions;

  const ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  all.forEach((r) => {
    const star = r.overall_rating as 1 | 2 | 3 | 4 | 5;
    if (star >= 1 && star <= 5) ratingDistribution[star] += 1;
  });

  // ── Recommendation ──────────────────────────────────────────────────────────
  const recommendYes = all.filter((r) => r.would_recommend).length;
  const recommendNo = all.filter((r) => !r.would_recommend).length;
  const recommendPct = Math.round((recommendYes / totalSubmissions) * 100);

  // ── Visit types ─────────────────────────────────────────────────────────────
  const visitTypes = { solo: 0, couple: 0, family: 0, group: 0, school: 0 };
  all.forEach((r) => {
    if (r.visit_type in visitTypes) (visitTypes as any)[r.visit_type] += 1;
  });

  // ── Heard from (unnest the array column) ────────────────────────────────────
  const heardFrom: Record<string, number> = {};
  all.forEach((r) => {
    (r.heard_from ?? []).forEach((source) => {
      heardFrom[source] = (heardFrom[source] ?? 0) + 1;
    });
  });

  // ── Avg artifacts explored ───────────────────────────────────────────────────
  const avgArtifactsExplored =
    all.reduce((s, r) => s + (r.total_artifacts ?? 0), 0) / totalSubmissions;

  // ── 30-day daily trend ───────────────────────────────────────────────────────
  const trendMap = new Map<
    string,
    { submissions: number; ratingSum: number }
  >();
  all.forEach((r) => {
    const day = new Date(r.submitted_at).toISOString().slice(0, 10);
    if (!trendMap.has(day)) trendMap.set(day, { submissions: 0, ratingSum: 0 });
    const entry = trendMap.get(day)!;
    entry.submissions += 1;
    entry.ratingSum += r.overall_rating;
  });

  const dailyTrend: TourFeedbackDailyTrend[] = Array.from({ length: 30 }).map(
    (_, i) => {
      const d = new Date(now - (29 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const found = trendMap.get(key);
      return {
        day: key,
        submissions: found?.submissions ?? 0,
        avg_rating: found
          ? Number((found.ratingSum / found.submissions).toFixed(2))
          : 0,
      };
    },
  );

  // ── Recent 5 submissions ─────────────────────────────────────────────────────
  const recentFeedback = all.slice(0, 5);

  return {
    totalSubmissions,
    submissionsLast7d,
    submissionsLast30d,
    avgRating: Number(avgRating.toFixed(2)),
    ratingDistribution,
    recommendPct,
    recommendYes,
    recommendNo,
    visitTypes,
    heardFrom,
    avgArtifactsExplored: Number(avgArtifactsExplored.toFixed(1)),
    dailyTrend,
    recentFeedback,
  };
}
