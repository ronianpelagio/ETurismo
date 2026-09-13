import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Boxes,
  Star,
  Activity,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  Calendar,
  RefreshCw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { Skeleton } from "../components/LoadingSkeleton";
import {
  AdminUser,
  DashboardDemographics as DashboardDemographicsType,
  DashboardStats,
  TourFeedbackStats,
} from "../types";
import {
  fetchDashboardStats,
  fetchTourFeedbackStats,
  fetchUserDemographics,
  fetchActiveUserCount,
} from "./dashboardData";
import { supabase } from "../services/supabase";
import { useTheme } from "@/utils/theme";

const defaultStats: DashboardStats = {
  artifacts: 0,
  users: 0,
  activeUsers: 0,
  blockedUsers: 0,
  reviews: 0,
  liveStatus: "offline",
  totalVisitors: 0,
  scannedArtifacts: 0,
  audioPlays: 0,
  averageRating: 0,
  visitorsTrend: [],
};

const defaultDemographics: DashboardDemographicsType = {
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

const defaultFeedbackStats: TourFeedbackStats = {
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

// ─── Date range presets ───────────────────────────────────────────────────────
type RangePreset = "7d" | "30d" | "90d" | "all";

function getFromDate(
  preset: RangePreset,
  customFrom?: string,
): string | undefined {
  if (preset === "all") return undefined;
  if (preset === "7d")
    return new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  if (preset === "30d")
    return new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  if (preset === "90d")
    return new Date(Date.now() - 89 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  return customFrom;
}

type DashboardPageProps = { profile: AdminUser };

export default function DashboardPage({ profile }: DashboardPageProps) {
  const [stats, setStats] = useState(defaultStats);
  const [demographics, setDemographics] =
    useState<DashboardDemographicsType>(defaultDemographics);
  const [feedbackStats, setFeedbackStats] =
    useState<TourFeedbackStats>(defaultFeedbackStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Date range state ────────────────────────────────────────────────────────
  const [rangePreset, setRangePreset] = useState<RangePreset>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fromDate =
    rangePreset === "all"
      ? undefined
      : customFrom && rangePreset === "7d" // custom overrides only when explicitly set
        ? customFrom
        : getFromDate(rangePreset);

  const load = useCallback(async (from?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [s, d, f] = await Promise.all([
        fetchDashboardStats(from),
        fetchUserDemographics(),
        fetchTourFeedbackStats(),
      ]);
      setStats(s);
      setDemographics(d);
      setFeedbackStats(f);
    } catch (err: any) {
      setError(err?.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(fromDate);
  }, [fromDate, load]);

  // ── Realtime: refresh active-user count whenever any user row changes ───────
  useEffect(() => {
    const channel = supabase
      .channel("active-users-watch")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "users" },
        async () => {
          const count = await fetchActiveUserCount(5);
          setStats((prev) => ({ ...prev, activeUsers: count }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCustomApply = () => {
    if (!customFrom) return;
    load(customFrom);
    setShowAdvanced(false);
  };

  const handleRefresh = () => load(fromDate);

  const chartData = stats.visitorsTrend.map((p) => ({
    date: p.date.slice(5),
    visitors: p.count,
  }));

  const rangeLabelMap: Record<RangePreset, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    all: "All time",
  };

  const { theme } = useTheme();

  const chartColors =
    theme === "dark"
      ? {
          stroke: "#F2F2F2",
          grid: "rgba(255,255,255,0.06)",
          text: "#E6E6E6",
          tooltipBg: "rgba(6,6,6,0.9)",
          tooltipBorder: "rgba(255,255,255,0.12)",
          cursor: "rgba(255,255,255,0.06)",
        }
      : {
          stroke: "#0f172a",
          grid: "rgba(15,23,42,0.06)",
          text: "#0f172a",
          tooltipBg: "#ffffff",
          tooltipBorder: "rgba(15,23,42,0.06)",
          cursor: "rgba(15,23,42,0.06)",
        };

  const ageData = Object.entries(demographics.ageGroups).map(([k, v]) => ({
    label: k,
    value: v,
  }));
  const ageTotal = ageData.reduce((s, x) => s + x.value, 0);
  const genderTotal = Object.values(demographics.gender).reduce(
    (s, n) => s + n,
    0,
  );
  const topLocations = Object.entries(demographics.locations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const locationTotal = topLocations.reduce((s, [, n]) => s + n, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title={`Welcome Admin${profile?.email ? `, ${profile.first_name.split("@")[0]}` : ""}`}
        description="A snapshot of visitors, content, and engagement across the collection."
        actions={
          <Badge
            variant="outline"
            className="gap-1.5 rounded-full border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                stats.liveStatus === "live"
                  ? "bg-foreground"
                  : "bg-muted-foreground"
              }`}
            />
            {stats.liveStatus === "live" ? "Live now" : "Offline"}
          </Badge>
        }
      />

      {error && (
        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive-foreground">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Visitors"
          value={stats.totalVisitors.toLocaleString()}
          delta="All-time accounts"
          icon={<Users className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label="Active Users"
          value={stats.activeUsers.toLocaleString()}
          delta="active in last 5 min"
          icon={<Activity className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label="Artifacts"
          value={stats.artifacts.toLocaleString()}
          delta={`${stats.scannedArtifacts} with QR`}
          icon={<Boxes className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label="Avg. Rating"
          value={stats.averageRating ? stats.averageRating.toFixed(1) : "—"}
          delta={`${stats.reviews} artifact reviews`}
          icon={<Star className="h-4 w-4" />}
          loading={loading}
        />
      </div>

      {/* Charts row — full width visitor trend */}
      <div className="mt-4">
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {rangeLabelMap[rangePreset]}
              </div>
              <CardTitle className="mt-0.5 text-base font-semibold">
                Visitor trend
              </CardTitle>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Preset buttons */}
              {(["7d", "30d", "90d", "all"] as RangePreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setRangePreset(p);
                    setCustomFrom("");
                    setCustomTo("");
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                    rangePreset === p
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {p === "all" ? "All time" : p.toUpperCase()}
                </button>
              ))}

              {/* Advanced / custom range toggle */}
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                  showAdvanced
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                <SlidersHorizontal className="h-3 w-3" />
                Custom
              </button>

              {/* Refresh */}
              <button
                onClick={handleRefresh}
                className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>

          {/* Advanced / custom date panel */}
          {showAdvanced && (
            <div className="mx-4 mb-3 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  From
                </label>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  To
                </label>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                />
              </div>
              <Button
                size="sm"
                className="h-8 rounded-lg text-xs"
                onClick={handleCustomApply}
                disabled={!customFrom}
              >
                <Calendar className="mr-1.5 h-3 w-3" />
                Apply
              </Button>
              <button
                onClick={() => {
                  setCustomFrom("");
                  setCustomTo("");
                  setShowAdvanced(false);
                }}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Clear
              </button>
              <p className="w-full text-[10px] text-muted-foreground">
                Showing registrations from{" "}
                <span className="font-semibold text-foreground">
                  {customFrom || "—"}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-foreground">
                  {customTo || "today"}
                </span>
              </p>
            </div>
          )}

          <CardContent className="h-[320px] px-2 pb-2">
            {loading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 16, left: -8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="visGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={chartColors.stroke}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor={chartColors.stroke}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke={chartColors.grid}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: chartColors.text, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval={
                      chartData.length > 30
                        ? Math.floor(chartData.length / 15)
                        : chartData.length > 14
                          ? 3
                          : 0
                    }
                  />
                  <YAxis
                    tick={{ fill: chartColors.text, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{
                      stroke: chartColors.cursor,
                      strokeDasharray: "3 3",
                    }}
                    contentStyle={{
                      background: chartColors.tooltipBg,
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      borderRadius: 12,
                      color: chartColors.text,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [value, "Visitors"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke={chartColors.stroke}
                    strokeWidth={2}
                    fill="url(#visGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Demographics row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Gender</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : (
              <DistributionBars
                rows={[
                  {
                    label: "Male",
                    value: demographics.gender.male,
                    total: genderTotal,
                  },
                  {
                    label: "Female",
                    value: demographics.gender.female,
                    total: genderTotal,
                  },
                  {
                    label: "Other",
                    value: demographics.gender.other,
                    total: genderTotal,
                  },
                  {
                    label: "Unknown",
                    value: demographics.gender.unknown,
                    total: genderTotal,
                  },
                ]}
              />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Age groups</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : (
              <DistributionBars
                rows={ageData.map((r) => ({
                  label: r.label,
                  value: r.value,
                  total: ageTotal,
                }))}
                compact
              />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Top locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : topLocations.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No location data yet
              </p>
            ) : (
              <DistributionBars
                rows={topLocations.map(([label, value]) => ({
                  label,
                  value,
                  total: locationTotal,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Tour Feedback Section ─────────────────────────────────────────── */}
      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            Tour Feedback
          </h2>
          <Badge
            variant="outline"
            className="rounded-full border-border text-[10px] text-muted-foreground"
          >
            {feedbackStats.totalSubmissions} total
          </Badge>
        </div>

        {/* Feedback stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Feedback"
            value={feedbackStats.totalSubmissions.toLocaleString()}
            delta={`+${feedbackStats.submissionsLast7d} this week`}
            icon={<MessageSquare className="h-4 w-4" />}
            loading={loading}
          />
          <StatCard
            label="Avg. Tour Rating"
            value={
              feedbackStats.avgRating ? feedbackStats.avgRating.toFixed(1) : "—"
            }
            delta="Out of 5.0"
            icon={<Star className="h-4 w-4" />}
            loading={loading}
          />
          <StatCard
            label="Would Recommend"
            value={
              feedbackStats.recommendPct
                ? `${feedbackStats.recommendPct}%`
                : "—"
            }
            delta={`${feedbackStats.recommendYes} yes · ${feedbackStats.recommendNo} no`}
            icon={<ThumbsUp className="h-4 w-4" />}
            loading={loading}
          />
          <StatCard
            label="Avg. Artifacts Explored"
            value={
              feedbackStats.avgArtifactsExplored
                ? feedbackStats.avgArtifactsExplored.toFixed(1)
                : "—"
            }
            delta="Per visit"
            icon={<TrendingUp className="h-4 w-4" />}
            loading={loading}
          />
        </div>

        {/* Feedback charts row */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* 30-day submission trend */}
          <Card className="lg:col-span-2 rounded-2xl border-border bg-card">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Last 30 days
                </div>
                <CardTitle className="mt-0.5 text-base font-semibold">
                  Feedback trend
                </CardTitle>
              </div>
              <Badge
                variant="outline"
                className="rounded-full border-border text-[10px] text-muted-foreground"
              >
                {feedbackStats.submissionsLast30d} this month
              </Badge>
            </CardHeader>
            <CardContent className="h-[200px] px-2 pb-2">
              {loading ? (
                <Skeleton className="h-full w-full rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={feedbackStats.dailyTrend.map((d) => ({
                      date: d.day.slice(5),
                      submissions: d.submissions,
                      rating: d.avg_rating,
                    }))}
                    margin={{ top: 10, right: 16, left: -8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="fbGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={chartColors.stroke}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor={chartColors.stroke}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke={chartColors.grid}
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: chartColors.text, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fill: chartColors.text, fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: chartColors.tooltipBg,
                        border: `1px solid ${chartColors.tooltipBorder}`,
                        borderRadius: 10,
                        color: chartColors.text,
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="submissions"
                      stroke={chartColors.stroke}
                      strokeWidth={2}
                      fill="url(#fbGrad)"
                      name="Submissions"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Rating distribution */}
          <Card className="rounded-2xl border-border bg-card">
            <CardHeader className="pb-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Breakdown
              </div>
              <CardTitle className="mt-0.5 text-base font-semibold">
                Rating distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full rounded-xl" />
              ) : (
                <div className="space-y-2">
                  {([5, 4, 3, 2, 1] as const).map((star) => {
                    const count = feedbackStats.ratingDistribution[star];
                    const pct = feedbackStats.totalSubmissions
                      ? Math.round(
                          (count / feedbackStats.totalSubmissions) * 100,
                        )
                      : 0;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="w-5 text-right text-[11px] font-medium text-muted-foreground">
                          {star}★
                        </span>
                        <div className="flex-1 h-2 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="h-full rounded-full bg-foreground"
                          />
                        </div>
                        <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Visit type + Heard from + Recent feedback row */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* Visit type */}
          <Card className="rounded-2xl border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Visit type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-32 w-full rounded-xl" />
              ) : (
                <DistributionBars
                  rows={Object.entries(feedbackStats.visitTypes).map(
                    ([label, value]) => ({
                      label: label.charAt(0).toUpperCase() + label.slice(1),
                      value,
                      total: feedbackStats.totalSubmissions,
                    }),
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Heard from */}
          <Card className="rounded-2xl border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                How they heard about us
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-32 w-full rounded-xl" />
              ) : Object.keys(feedbackStats.heardFrom).length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No data yet
                </p>
              ) : (
                <DistributionBars
                  rows={Object.entries(feedbackStats.heardFrom)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([label, value]) => ({
                      label: label
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase()),
                      value,
                      total: Object.values(feedbackStats.heardFrom).reduce(
                        (s, n) => s + n,
                        0,
                      ),
                    }))}
                />
              )}
            </CardContent>
          </Card>

          {/* Recent feedback */}
          <Card className="rounded-2xl border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Recent feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-40 w-full rounded-xl" />
              ) : feedbackStats.recentFeedback.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No feedback yet
                </p>
              ) : (
                <div className="space-y-3">
                  {feedbackStats.recentFeedback.map((fb) => (
                    <div
                      key={fb.id}
                      className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-2.5"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[11px] font-semibold text-foreground">
                        {fb.overall_rating}★
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[11px] font-medium capitalize text-foreground">
                            {fb.visit_type}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ·
                          </span>
                          {fb.would_recommend ? (
                            <ThumbsUp className="h-3 w-3 text-foreground" />
                          ) : (
                            <ThumbsDown className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        {fb.highlights ? (
                          <p className="truncate text-[11px] text-muted-foreground">
                            {fb.highlights}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                          {new Date(fb.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DistributionBars({
  rows,
  compact,
}: {
  rows: Array<{ label: string; value: number; total: number }>;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2.5"}>
      {rows.map((r) => {
        const pct = r.total ? Math.round((r.value / r.total) * 100) : 0;
        return (
          <div key={r.label} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="tabular-nums font-medium text-foreground">
                {pct}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full rounded-full bg-foreground"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
