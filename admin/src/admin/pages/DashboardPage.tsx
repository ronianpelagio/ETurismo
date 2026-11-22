import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
  Printer,
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
import {
  clusterLocations,
  topRegions,
  shortRegionLabel,

} from "../utils/locationClusters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { Skeleton } from "../components/LoadingSkeleton";
import PrintReportModal, { PrintRange } from "../components/PrintReportModal";
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
  gender: { male: 0, female: 0, other: 0 },
  ageGroups: {
    "13-17": 0,
    "18-24": 0,
    "25-34": 0,
    "35-44": 0,
    "45-54": 0,
    "55-64": 0,
    "65+": 0,
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
  const { t } = useTranslation();
  const [stats, setStats] = useState(defaultStats);
  const [demographics, setDemographics] =
    useState<DashboardDemographicsType>(defaultDemographics);
  const [feedbackStats, setFeedbackStats] =
    useState<TourFeedbackStats>(defaultFeedbackStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Print report modal ──────────────────────────────────────────────────────
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printRange, setPrintRange] = useState<PrintRange | null>(null);

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
    "7d": t("dashboard.lastNDays", { n: 7 }),
    "30d": t("dashboard.last30Days"),
    "90d": t("dashboard.last90Days"),
    all: t("dashboard.allTime"),
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
  // ── Location clustering ─────────────────────────────────────────────────────
  const clustered = clusterLocations(demographics.locations);
  const regionRows = topRegions(clustered, 10, true);

  // ── Split demographics data ──────────────────────────────────────────────────
  // PH regions sorted by count
  const phRows = Object.entries(clustered.regions)
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);
  const phTotal = phRows.reduce((s, r) => s + r.count, 0);

  // International: flatten all countries from all sub-regions, listed individually
  const intlRows: { country: string; subRegion: string; count: number }[] = [];
  for (const [subRegion, data] of Object.entries(clustered.international)) {
    for (const [country, count] of Object.entries(data.countries)) {
      intlRows.push({ country, subRegion, count });
    }
  }
  intlRows.sort((a, b) => b.count - a.count);
  const intlTotal = intlRows.reduce((s, r) => s + r.count, 0);

  return (
    <div>
      <PageHeader
        eyebrow={t("dashboard.eyebrow")}
        title={t("dashboard.welcome", {
          name: profile?.first_name?.split("@")[0] ?? "",
        })}
        description={t("dashboard.description")}
      />

      {/* ── Print-only report header ──────────────────────────────────────── */}
      <div className="hidden print:block mb-8 border-b-2 border-gray-800 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              ETurismo
            </h1>
            <p className="text-lg font-semibold text-gray-700 mt-0.5">
              Dashboard Analytics Report
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Generated {new Date().toLocaleString()} · Period:{" "}
              {printRange?.label ?? rangeLabelMap[rangePreset]}
            </p>
            {printRange && (
              <p className="text-xs text-gray-400 mt-0.5">
                Date range: {printRange.from} → {printRange.to}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-700">Summary</div>
            <table className="mt-1 text-xs text-gray-600 text-right">
              <tbody>
                <tr>
                  <td className="pr-3 text-left font-medium">Total Visitors</td>
                  <td>{stats.totalVisitors.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="pr-3 text-left font-medium">Artifacts</td>
                  <td>{stats.artifacts.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="pr-3 text-left font-medium">Avg. Rating</td>
                  <td>
                    {stats.averageRating ? stats.averageRating.toFixed(1) : "—"}
                  </td>
                </tr>
                <tr>
                  <td className="pr-3 text-left font-medium">Tour Feedback</td>
                  <td>{feedbackStats.totalSubmissions.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Print-only demographics section ──────────────────────────────── */}
      <div className="hidden print:block mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-300 pb-2">
          Visitor Demographics
        </h2>
        <div className="grid grid-cols-3 gap-6">
          {/* Gender */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
              Gender
            </h3>
            <table className="w-full text-xs">
              <tbody>
                {[
                  { label: "Male", value: demographics.gender.male },
                  { label: "Female", value: demographics.gender.female },
                  { label: "Other", value: demographics.gender.other },
                ].map((r) => {
                  const pct = genderTotal
                    ? Math.round((r.value / genderTotal) * 100)
                    : 0;
                  return (
                    <tr key={r.label} className="border-b border-gray-100">
                      <td className="py-1.5 font-medium text-gray-700 w-24">
                        {r.label}
                      </td>
                      <td className="py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden">
                            <div
                              className="h-full bg-gray-800 rounded"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-gray-600 w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-gray-500 pl-2">
                        {r.value}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Age groups */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
              Age Groups
            </h3>
            <table className="w-full text-xs">
              <tbody>
                {ageData.map((r) => {
                  const pct = ageTotal
                    ? Math.round((r.value / ageTotal) * 100)
                    : 0;
                  return (
                    <tr key={r.label} className="border-b border-gray-100">
                      <td className="py-1.5 font-medium text-gray-700 w-16">
                        {r.label}
                      </td>
                      <td className="py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden">
                            <div
                              className="h-full bg-gray-800 rounded"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-gray-600 w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-gray-500 pl-2">
                        {r.value}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Regions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
              Visitor Locations
            </h3>
            <table className="w-full text-xs">
              <tbody>
                {regionRows.slice(0, 8).map((r) => {
                  const regionTotal = regionRows.reduce(
                    (s, x) => s + x.count,
                    0,
                  );
                  const pct = regionTotal
                    ? Math.round((r.count / regionTotal) * 100)
                    : 0;
                  return (
                    <tr key={r.region} className="border-b border-gray-100">
                      <td className="py-1.5 font-medium text-gray-700 max-w-[120px] truncate">
                        {shortRegionLabel(r.region)}
                      </td>
                      <td className="py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden">
                            <div
                              className="h-full bg-gray-800 rounded"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-gray-600 w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-gray-500 pl-2">
                        {r.count}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Print-only tour feedback section ─────────────────────────────── */}
      <div className="hidden print:block mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-300 pb-2">
          Tour Feedback Summary
        </h2>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            {
              label: "Total Feedback",
              value: feedbackStats.totalSubmissions.toLocaleString(),
            },
            {
              label: "Avg. Tour Rating",
              value: feedbackStats.avgRating
                ? `${feedbackStats.avgRating.toFixed(1)} / 5`
                : "—",
            },
            {
              label: "Would Recommend",
              value: feedbackStats.recommendPct
                ? `${feedbackStats.recommendPct}%`
                : "—",
            },
            {
              label: "Avg. Artifacts Explored",
              value: feedbackStats.avgArtifactsExplored
                ? feedbackStats.avgArtifactsExplored.toFixed(1)
                : "—",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="border border-gray-200 rounded-lg p-3"
            >
              <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                {s.label}
              </div>
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          {/* Rating distribution */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
              Rating Distribution
            </h3>
            <table className="w-full text-xs">
              <tbody>
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const count = feedbackStats.ratingDistribution[star];
                  const pct = feedbackStats.totalSubmissions
                    ? Math.round((count / feedbackStats.totalSubmissions) * 100)
                    : 0;
                  return (
                    <tr key={star} className="border-b border-gray-100">
                      <td className="py-1.5 font-medium text-gray-700 w-10">
                        {star} ★
                      </td>
                      <td className="py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden">
                            <div
                              className="h-full bg-gray-800 rounded"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-gray-600 w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-gray-500 pl-2">
                        {count}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Visit types */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
              Visit Types
            </h3>
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(feedbackStats.visitTypes).map(
                  ([label, value]) => {
                    const total = Object.values(
                      feedbackStats.visitTypes,
                    ).reduce((s, n) => s + n, 0);
                    const pct = total ? Math.round((value / total) * 100) : 0;
                    return (
                      <tr key={label} className="border-b border-gray-100">
                        <td className="py-1.5 font-medium text-gray-700 capitalize w-20">
                          {label}
                        </td>
                        <td className="py-1.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden">
                              <div
                                className="h-full bg-gray-800 rounded"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="tabular-nums text-gray-600 w-8 text-right">
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 text-right tabular-nums text-gray-500 pl-2">
                          {value}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Print styles ──────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body { font-size: 11px; color: #111; }
          header, aside, nav, [data-sidebar] { display: none !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      {/* ── Print Report Modal ─────────────────────────────────────────────── */}
      <PrintReportModal
        open={showPrintModal}
        title={t("dashboard.printDashboard")}
        onClose={() => setShowPrintModal(false)}
        onPrint={(range) => {
          setPrintRange(range);
          setShowPrintModal(false);
          // Allow one render cycle so the print header updates before printing
          setTimeout(() => window.print(), 100);
        }}
      />

      {error && (
        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive-foreground print:hidden">
          {error}
        </div>
      )}

      {/* Screen-only interactive content */}
      <div className="print:hidden">
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
          {/* Print + Online indicator card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 flex flex-col justify-between gap-3"
          >
            {/* Online indicator */}
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  stats.liveStatus === "live"
                    ? "bg-green-500 shadow-[0_0_6px_2px_rgba(34,197,94,0.4)]"
                    : "bg-muted-foreground"
                }`}
              />
              <span className="text-xs font-medium text-foreground">
                {stats.liveStatus === "live" ? "Online" : "Offline"}
              </span>
              <span className="text-[11px] text-muted-foreground ml-0.5">
                {stats.liveStatus === "live"
                  ? "— system live"
                  : "— no active session"}
              </span>
            </div>
            {/* Print button */}
            <button
              onClick={() => setShowPrintModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted hover:border-foreground/30 active:scale-95"
            >
              <Printer className="h-3.5 w-3.5" />
              {t("dashboard.printReport")}
            </button>
          </motion.div>
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
                  {t("dashboard.visitorTrend")}
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
                    {p === "all" ? t("dashboard.allTime") : p.toUpperCase()}
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
                  {t("dashboard.custom")}
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
                    {t("dashboard.from")}
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
                    {t("dashboard.to")}
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
                  {t("dashboard.apply")}
                </Button>
                <button
                  onClick={() => {
                    setCustomFrom("");
                    setCustomTo("");
                    setShowAdvanced(false);
                  }}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" /> {t("dashboard.clear")}
                </button>
                <p className="w-full text-[10px] text-muted-foreground">
                  {t("dashboard.showingFrom")}{" "}
                  <span className="font-semibold text-foreground">
                    {customFrom || "—"}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-foreground">
                    {customTo || t("dashboard.today")}
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
              <CardTitle className="text-sm font-semibold">
                {t("dashboard.gender")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-32 w-full rounded-xl" />
              ) : (
                <DistributionBars
                  rows={[
                    {
                      label: t("dashboard.male"),
                      value: demographics.gender.male,
                      total: genderTotal,
                    },
                    {
                      label: t("dashboard.female"),
                      value: demographics.gender.female,
                      total: genderTotal,
                    },
                    {
                      label: t("dashboard.other"),
                      value: demographics.gender.other,
                      total: genderTotal,
                    },
                  ]}
                />
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                {t("dashboard.ageGroups")}
              </CardTitle>
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
                {t("dashboard.visitorLocations")}
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                {t("dashboard.locationsSubtitle")}
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-32 w-full rounded-xl" />
              ) : regionRows.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  {t("dashboard.noLocationData")}
                </p>
              ) : (
                <DistributionBars
                  rows={regionRows.slice(0, 5).map((r) => ({
                    label: shortRegionLabel(r.region),
                    value: r.count,
                    total: clustered.total,
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Visitor Demographics — Split Card (PH | International) ─────────── */}
        {(phRows.length > 0 || intlRows.length > 0) && (
          <div className="mt-4">
            <Card className="rounded-2xl border-border bg-card overflow-hidden">
              {/* Card header */}
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("dashboard.demographics")}
                  </div>
                  <CardTitle className="mt-0.5 text-base font-semibold">
                    {t("dashboard.visitorsBy")}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {clustered.unknownPhilippines > 0 && (
                    <Badge
                      variant="outline"
                      className="rounded-full border-border text-[10px] text-muted-foreground"
                    >
                      +{clustered.unknownPhilippines}{" "}
                      {t("dashboard.unresolvedPH")}
                    </Badge>
                  )}
                  {intlRows.length > 0 && (
                    <Badge
                      variant="outline"
                      className="rounded-full border-border text-[10px] text-muted-foreground"
                    >
                      {intlTotal} {t("dashboard.international")}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {loading ? (
                  <div className="px-4 pb-4">
                    <Skeleton className="h-[260px] w-full rounded-xl" />
                  </div>
                ) : (
                  /* Split: left = PH, right = International, divided by a vertical border */
                  <div className="flex divide-x divide-border">

                    {/* ── Left: Philippine Regions ── */}
                    <div className="flex-1 min-w-0 px-4 pb-4 pt-1">
                      {/* Section label */}
                      <div className="mb-2 flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          🇵🇭 Philippine Regions
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({phTotal.toLocaleString()})
                        </span>
                      </div>

                      {/* Scrollable list — max ~5 rows visible */}
                      <div className="max-h-[260px] overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                        {phRows.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No data</p>
                        ) : (
                          phRows.map((row, idx) => {
                            const pct = phTotal > 0 ? Math.round((row.count / phTotal) * 100) : 0;
                            const opacity = 1 - (idx / Math.max(phRows.length, 1)) * 0.55;
                            return (
                              <div key={row.region} className="group">
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span
                                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[9px] font-bold"
                                      style={{
                                        backgroundColor:
                                          theme === "dark"
                                            ? `rgba(242,242,242,${opacity * 0.18})`
                                            : `rgba(15,23,42,${opacity * 0.1})`,
                                        color: theme === "dark" ? "#F2F2F2" : "#0f172a",
                                      }}
                                    >
                                      {idx + 1}
                                    </span>
                                    <span
                                      className="truncate text-xs font-medium text-foreground"
                                      title={row.region}
                                    >
                                      {shortRegionLabel(row.region)}
                                    </span>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <span className="text-xs tabular-nums font-semibold text-foreground">
                                      {row.count.toLocaleString()}
                                    </span>
                                    <span className="w-7 text-right text-[11px] tabular-nums text-muted-foreground">
                                      {pct}%
                                    </span>
                                  </div>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-muted">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{
                                      duration: 0.7,
                                      ease: "easeOut",
                                      delay: idx * 0.04,
                                    }}
                                    className="h-full rounded-full"
                                    style={{
                                      backgroundColor:
                                        theme === "dark"
                                          ? `rgba(242,242,242,${0.3 + opacity * 0.7})`
                                          : `rgba(15,23,42,${0.15 + opacity * 0.85})`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}

                        {/* Unknown PH footer */}
                        {clustered.unknownPhilippines > 0 && (
                          <div className="border-t border-dashed border-border pt-2">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[9px] font-bold bg-muted text-muted-foreground">
                                  ?
                                </span>
                                <span className="truncate text-xs text-muted-foreground italic">
                                  Unresolved
                                </span>
                              </div>
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {clustered.unknownPhilippines.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-muted-foreground/30" style={{ width: `${phTotal + clustered.unknownPhilippines > 0 ? Math.round((clustered.unknownPhilippines / (phTotal + clustered.unknownPhilippines)) * 100) : 0}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Right: International Countries ── */}
                    <div className="flex-1 min-w-0 px-4 pb-4 pt-1">
                      {/* Section label */}
                      <div className="mb-2 flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          🌍 International
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({intlTotal.toLocaleString()})
                        </span>
                      </div>

                      {/* Scrollable list — max ~5 rows visible */}
                      <div className="max-h-[260px] overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                        {intlRows.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No international visitors</p>
                        ) : (
                          intlRows.map((row, idx) => {
                            const pct = intlTotal > 0 ? Math.round((row.count / intlTotal) * 100) : 0;
                            const opacity = 1 - (idx / Math.max(intlRows.length, 1)) * 0.55;
                            return (
                              <div key={`${row.country}-${idx}`} className="group">
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span
                                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[9px] font-bold"
                                      style={{
                                        backgroundColor:
                                          theme === "dark"
                                            ? `rgba(242,242,242,${opacity * 0.18})`
                                            : `rgba(15,23,42,${opacity * 0.1})`,
                                        color: theme === "dark" ? "#F2F2F2" : "#0f172a",
                                      }}
                                    >
                                      {idx + 1}
                                    </span>
                                    <div className="min-w-0">
                                      <span className="truncate text-xs font-medium text-foreground">
                                        {row.country}
                                      </span>
                                      <p className="truncate text-[10px] text-muted-foreground">
                                        {row.subRegion}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <span className="text-xs tabular-nums font-semibold text-foreground">
                                      {row.count.toLocaleString()}
                                    </span>
                                    <span className="w-7 text-right text-[11px] tabular-nums text-muted-foreground">
                                      {pct}%
                                    </span>
                                  </div>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-muted">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{
                                      duration: 0.7,
                                      ease: "easeOut",
                                      delay: idx * 0.04,
                                    }}
                                    className="h-full rounded-full"
                                    style={{
                                      backgroundColor:
                                        theme === "dark"
                                          ? `rgba(242,242,242,${0.3 + opacity * 0.7})`
                                          : `rgba(15,23,42,${0.15 + opacity * 0.85})`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Tour Feedback Section ─────────────────────────────────────────── */}
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">
              {t("dashboard.tourFeedback")}
            </h2>
            <Badge
              variant="outline"
              className="rounded-full border-border text-[10px] text-muted-foreground"
            >
              {t("dashboard.totalFeedbackCount", {
                count: feedbackStats.totalSubmissions,
              })}
            </Badge>
          </div>

          {/* Feedback stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label={t("dashboard.totalFeedback")}
              value={feedbackStats.totalSubmissions.toLocaleString()}
              delta={t("dashboard.thisWeek", {
                count: feedbackStats.submissionsLast7d,
              })}
              icon={<MessageSquare className="h-4 w-4" />}
              loading={loading}
            />
            <StatCard
              label={t("dashboard.avgTourRating")}
              value={
                feedbackStats.avgRating
                  ? feedbackStats.avgRating.toFixed(1)
                  : "—"
              }
              delta={t("dashboard.outOf5")}
              icon={<Star className="h-4 w-4" />}
              loading={loading}
            />
            <StatCard
              label={t("dashboard.wouldRecommend")}
              value={
                feedbackStats.recommendPct
                  ? `${feedbackStats.recommendPct}%`
                  : "—"
              }
              delta={t("dashboard.yesNo", {
                yes: feedbackStats.recommendYes,
                no: feedbackStats.recommendNo,
              })}
              icon={<ThumbsUp className="h-4 w-4" />}
              loading={loading}
            />
            <StatCard
              label={t("dashboard.avgArtifactsExplored")}
              value={
                feedbackStats.avgArtifactsExplored
                  ? feedbackStats.avgArtifactsExplored.toFixed(1)
                  : "—"
              }
              delta={t("dashboard.perVisit")}
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
                    {t("dashboard.last30Days")}
                  </div>
                  <CardTitle className="mt-0.5 text-base font-semibold">
                    {t("dashboard.feedbackTrend")}
                  </CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-full border-border text-[10px] text-muted-foreground"
                >
                  {t("dashboard.thisMonth", {
                    count: feedbackStats.submissionsLast30d,
                  })}
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
                  {t("dashboard.breakdown")}
                </div>
                <CardTitle className="mt-0.5 text-base font-semibold">
                  {t("dashboard.ratingDistribution")}
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
                  {t("dashboard.visitType")}
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
                  {t("dashboard.howHeard")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-32 w-full rounded-xl" />
                ) : Object.keys(feedbackStats.heardFrom).length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    {t("dashboard.noDataYet")}
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
                  {t("dashboard.recentFeedback")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-col">
                {loading ? (
                  <Skeleton className="h-[320px] w-full rounded-xl" />
                ) : feedbackStats.recentFeedback.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    {t("dashboard.noFeedbackYet")}
                  </p>
                ) : (
                  <div
                    className="max-h-[320px] space-y-3 overflow-y-auto overscroll-contain pr-1"
                    aria-label="Recent feedback submissions"
                  >
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
        {/* end screen-only content */}
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
