import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  X,
  TrendingUp,
  Printer,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { CardSkeleton, Skeleton } from "../components/LoadingSkeleton";
import PrintReportModal, { PrintRange } from "../components/PrintReportModal";
import { supabase } from "../services/supabase";
import { TourFeedbackRow } from "../types";
import {
  analyzeSentiment,
  Sentiment,
  SENTIMENT_STYLES,
} from "../utils/sentiment";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = "submitted_at" | "overall_rating" | "total_artifacts";
type SortDir = "asc" | "desc";
type SentimentFilter = "all" | Sentiment;

type FeedbackFilter = {
  rating: number | null; // 1-5 or null = all
  recommend: boolean | null; // true/false/null = all
  visitType: string; // "" = all
};

type FeedbackSummary = {
  total: number;
  avgRating: number;
  recommendPct: number;
  last7d: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VISIT_TYPE_LABELS: Record<string, string> = {
  solo: "Solo",
  couple: "Couple",
  family: "Family",
  group: "Group",
  school: "School",
};

const VISIT_TYPES = ["", "solo", "couple", "family", "group", "school"];
const FEEDBACK_PER_PAGE = 10;

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3 w-3 ${
            s <= rating
              ? "fill-foreground text-foreground"
              : "fill-none text-muted-foreground/30"
          }`}
        />
      ))}
    </span>
  );
}

function HeardFromChips({ heard }: { heard: string[] }) {
  if (!heard?.length)
    return <span className="text-muted-foreground/50 text-[10px]">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {heard.map((h) => (
        <span
          key={h}
          className="rounded-full border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] capitalize text-muted-foreground"
        >
          {h.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  );
}

// ─── Expanded row ─────────────────────────────────────────────────────────────

function ExpandedFeedback({ fb }: { fb: TourFeedbackRow }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="border-t border-border bg-muted/20 px-4 py-3 grid gap-3 sm:grid-cols-2">
        {fb.highlights ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {t("dashboard.positiveComments")}
            </p>
            <p className="text-xs text-foreground leading-relaxed">
              {fb.highlights}
            </p>
          </div>
        ) : null}
        {fb.suggestions ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              {t("dashboard.negativeComments")}
            </p>
            <p className="text-xs text-foreground leading-relaxed">
              {fb.suggestions}
            </p>
          </div>
        ) : null}
        {!fb.highlights && !fb.suggestions && (
          <p className="text-xs text-muted-foreground italic col-span-2">
            {t("dashboard.noWrittenComments")}
          </p>
        )}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {t("dashboard.howHeardAboutUs")}
          </p>
          <HeardFromChips heard={fb.heard_from} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {t("dashboard.artifactsExplored")}
          </p>
          <p className="text-xs text-foreground">{fb.total_artifacts}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<TourFeedbackRow[]>([]);
  const [summary, setSummary] = useState<FeedbackSummary>({
    total: 0,
    avgRating: 0,
    recommendPct: 0,
    last7d: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Print report modal ──────────────────────────────────────────────────────
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printRange, setPrintRange] = useState<PrintRange | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FeedbackFilter>({
    rating: null,
    recommend: null,
    visitType: "",
  });
  const [sentimentFilter, setSentimentFilter] =
    useState<SentimentFilter>("all");
  const [sortField, setSortField] = useState<SortField>("submitted_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchFeedback = useCallback(async (dateRange?: PrintRange | null) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("tour_feedback")
        .select(
          "id, user_id, overall_rating, visit_type, heard_from, highlights, suggestions, would_recommend, total_artifacts, submitted_at",
        )
        .order(sortField, { ascending: sortDir === "asc" });

      if (filter.rating !== null)
        query = query.eq("overall_rating", filter.rating);
      if (filter.recommend !== null)
        query = query.eq("would_recommend", filter.recommend);
      if (filter.visitType) query = query.eq("visit_type", filter.visitType);

      // Apply date range from print modal when present
      if (dateRange) {
        query = query.gte("submitted_at", dateRange.from);
        query = query.lte("submitted_at", dateRange.to + "T23:59:59");
      }

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;

      const allRows = (data ?? []) as TourFeedbackRow[];

      // Summary stats
      const total = allRows.length;
      const avgRating = total
        ? allRows.reduce((s, r) => s + r.overall_rating, 0) / total
        : 0;
      const yesCount = allRows.filter((r) => r.would_recommend).length;
      const recommendPct = total ? Math.round((yesCount / total) * 100) : 0;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const last7d = allRows.filter(
        (r) => new Date(r.submitted_at) >= sevenDaysAgo,
      ).length;

      setSummary({ total, avgRating, recommendPct, last7d });
      setRows(allRows);
    } catch (err: any) {
      setError(err?.message || "Unable to load feedback.");
    } finally {
      setLoading(false);
    }
  }, [sortField, sortDir, filter]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // ── Filtered rows (client-side search) ────────────────────────────────────

  const visible = useMemo(() => {
    let list = search.trim()
      ? rows.filter((r) => {
          const q = search.toLowerCase();
          return (
            (r.highlights ?? "").toLowerCase().includes(q) ||
            (r.suggestions ?? "").toLowerCase().includes(q) ||
            r.visit_type.toLowerCase().includes(q)
          );
        })
      : rows;

    if (sentimentFilter !== "all") {
      list = list.filter((r) => {
        // Score combined text from both comment fields
        const combined = [r.highlights, r.suggestions]
          .filter(Boolean)
          .join(" ");
        return analyzeSentiment(combined).sentiment === sentimentFilter;
      });
    }

    return list;
  }, [rows, search, sentimentFilter]);

  // sentiment counts for filter pill labels
  const sentimentCounts = useMemo(() => {
    const base = search.trim()
      ? rows.filter((r) => {
          const q = search.toLowerCase();
          return (
            (r.highlights ?? "").toLowerCase().includes(q) ||
            (r.suggestions ?? "").toLowerCase().includes(q) ||
            r.visit_type.toLowerCase().includes(q)
          );
        })
      : rows;
    const counts = { positive: 0, neutral: 0, negative: 0 };
    base.forEach((r) => {
      const combined = [r.highlights, r.suggestions].filter(Boolean).join(" ");
      const s = analyzeSentiment(combined).sentiment;
      counts[s]++;
    });
    return counts;
  }, [rows, search]);
  const totalPages = Math.max(1, Math.ceil(visible.length / FEEDBACK_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const paginatedRows = visible.slice(
    (page - 1) * FEEDBACK_PER_PAGE,
    page * FEEDBACK_PER_PAGE,
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // ── Sort toggle ────────────────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ChevronDown className="h-3 w-3 opacity-30 ml-0.5" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 ml-0.5" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-0.5" />
    );
  };

  // ── Clear filters ──────────────────────────────────────────────────────────

  const hasActiveFilter =
    filter.rating !== null ||
    filter.recommend !== null ||
    filter.visitType !== "" ||
    sentimentFilter !== "all";
  const clearFilters = () => {
    setFilter({ rating: null, recommend: null, visitType: "" });
    setSentimentFilter("all");
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="feedback-page-root">
      {/* ── Print-only report header ──────────────────────────────────────── */}
      <div className="hidden print:block mb-8 border-b-2 border-gray-800 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              ETurismo
            </h1>
            <p className="text-lg font-semibold text-gray-700 mt-0.5">
              Tour Feedback Report
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Generated {new Date().toLocaleString()}
              {printRange ? ` · ${printRange.label}` : ""}
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
                  <td className="pr-3 text-left font-medium">
                    Total Submissions
                  </td>
                  <td>{summary.total.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="pr-3 text-left font-medium">Avg. Rating</td>
                  <td>
                    {summary.avgRating
                      ? summary.avgRating.toFixed(1) + " / 5"
                      : "—"}
                  </td>
                </tr>
                <tr>
                  <td className="pr-3 text-left font-medium">
                    Would Recommend
                  </td>
                  <td>{summary.total ? `${summary.recommendPct}%` : "—"}</td>
                </tr>
                <tr>
                  <td className="pr-3 text-left font-medium">This Week</td>
                  <td>{summary.last7d.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PageHeader
        eyebrow={t("feedback.eyebrow")}
        title={t("feedback.title")}
        description={t("feedback.description")}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl text-xs print:hidden"
              onClick={() => setShowPrintModal(true)}
            >
              <Printer className="h-3 w-3" />
              {t("feedback.printReport")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl text-xs print:hidden"
              onClick={fetchFeedback}
            >
              <RefreshCw className="h-3 w-3" />
              {t("feedback.refresh")}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive-foreground">
          {error}
        </div>
      )}

      {/* ── Summary stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label={t("feedback.totalSubmissions")}
          value={summary.total.toLocaleString()}
          delta={t("feedback.allTimeFeedback")}
          icon={<MessageSquare className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label={t("feedback.avgRating")}
          value={summary.avgRating ? summary.avgRating.toFixed(1) : "—"}
          delta={t("feedback.outOf5")}
          icon={<Star className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label={t("feedback.wouldRecommend")}
          value={summary.total ? `${summary.recommendPct}%` : "—"}
          delta={t("feedback.visitorsRecommending")}
          icon={<ThumbsUp className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label={t("feedback.thisWeek")}
          value={summary.last7d.toLocaleString()}
          delta={t("feedback.last7Days")}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={loading}
        />
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("feedback.searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="h-8 rounded-xl border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 w-64"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Rating filter */}
        <select
          value={filter.rating ?? ""}
          onChange={(e) => {
            setFilter((f) => ({
              ...f,
              rating: e.target.value === "" ? null : Number(e.target.value),
            }));
            setCurrentPage(1);
          }}
          className="h-8 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
        >
          <option value="">{t("feedback.allRatings")}</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} ★
            </option>
          ))}
        </select>

        {/* Recommend filter */}
        <select
          value={
            filter.recommend === null ? "" : filter.recommend ? "yes" : "no"
          }
          onChange={(e) => {
            setFilter((f) => ({
              ...f,
              recommend:
                e.target.value === "" ? null : e.target.value === "yes",
            }));
            setCurrentPage(1);
          }}
          className="h-8 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
        >
          <option value="">{t("feedback.allResponses")}</option>
          <option value="yes">{t("feedback.wouldRecommendOption")}</option>
          <option value="no">{t("feedback.wouldNotRecommend")}</option>
        </select>

        {/* Visit type filter */}
        <select
          value={filter.visitType}
          onChange={(e) => {
            setFilter((f) => ({ ...f, visitType: e.target.value }));
            setCurrentPage(1);
          }}
          className="h-8 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
        >
          {VISIT_TYPES.map((vt) => (
            <option key={vt} value={vt}>
              {vt ? VISIT_TYPE_LABELS[vt] : t("feedback.allVisitTypes")}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearFilters();
              setCurrentPage(1);
            }}
            className="h-8 gap-1 rounded-xl text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            {t("feedback.clearFilters")}
          </Button>
        )}

        {/* Sentiment filter pills */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-0.5">
          {(["all", "positive", "neutral", "negative"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setSentimentFilter(s);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                sentimentFilter === s
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "positive" && <ThumbsUp className="h-3 w-3" />}
              {s === "negative" && <ThumbsDown className="h-3 w-3" />}
              {s === "neutral" && <Minus className="h-3 w-3" />}
              <span>
                {s === "all"
                  ? t("feedback.sentiment.all")
                  : s === "positive"
                    ? t("feedback.sentiment.positive")
                    : s === "neutral"
                      ? t("feedback.sentiment.neutral")
                      : t("feedback.sentiment.negative")}
              </span>
              {s !== "all" && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  ({sentimentCounts[s as Sentiment]})
                </span>
              )}
            </button>
          ))}
        </div>

        <span className="ml-auto text-[11px] text-muted-foreground">
          {visible.length} result{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <Card className="mt-3 rounded-2xl border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {t("feedback.noFeedbackFound")}
            </p>
            {(hasActiveFilter || search) && (
              <p className="text-xs text-muted-foreground/60 mt-1">
                {t("feedback.adjustFilters")}
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left">
                    <button
                      onClick={() => handleSort("submitted_at")}
                      className="flex items-center font-semibold uppercase tracking-wider text-muted-foreground text-[10px] hover:text-foreground transition"
                    >
                      {t("feedback.table.date")}{" "}
                      <SortIcon field="submitted_at" />
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left">
                    <button
                      onClick={() => handleSort("overall_rating")}
                      className="flex items-center font-semibold uppercase tracking-wider text-muted-foreground text-[10px] hover:text-foreground transition"
                    >
                      {t("feedback.table.rating")}{" "}
                      <SortIcon field="overall_rating" />
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                    {t("feedback.table.visitType")}
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                    {t("feedback.table.recommend")}
                  </th>
                  <th className="px-4 py-2.5 text-left">
                    <button
                      onClick={() => handleSort("total_artifacts")}
                      className="flex items-center font-semibold uppercase tracking-wider text-muted-foreground text-[10px] hover:text-foreground transition"
                    >
                      {t("feedback.table.artifacts")}{" "}
                      <SortIcon field="total_artifacts" />
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                    {t("feedback.table.comments")}
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                    {t("feedback.table.sentiment")}
                  </th>
                  <th className="px-4 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {paginatedRows.map((fb) => {
                    const isExpanded = expandedId === fb.id;
                    return (
                      <React.Fragment key={fb.id}>
                        <tr
                          className="cursor-pointer transition hover:bg-muted/30"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : fb.id)
                          }
                        >
                          {/* Date */}
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(fb.submitted_at).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </td>

                          {/* Rating */}
                          <td className="px-4 py-3">
                            <StarRow rating={fb.overall_rating} />
                          </td>

                          {/* Visit type */}
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className="rounded-full border-border text-[10px] capitalize"
                            >
                              {t(`feedback.visitTypes.${fb.visit_type}`) ??
                                fb.visit_type}
                            </Badge>
                          </td>

                          {/* Recommend */}
                          <td className="px-4 py-3">
                            {fb.would_recommend ? (
                              <span className="flex items-center gap-1 text-foreground">
                                <ThumbsUp className="h-3 w-3" />
                                <span className="text-[10px] font-medium">
                                  Yes
                                </span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <ThumbsDown className="h-3 w-3" />
                                <span className="text-[10px] font-medium">
                                  No
                                </span>
                              </span>
                            )}
                          </td>

                          {/* Artifacts */}
                          <td className="px-4 py-3 text-foreground tabular-nums">
                            {fb.total_artifacts}
                          </td>

                          {/* Positive comment */}
                          <td className="px-4 py-3 max-w-[220px]">
                            <div className="space-y-1">
                              {fb.highlights ? (
                                <div className="flex items-start gap-1">
                                  <ThumbsUp className="h-3 w-3 mt-0.5 shrink-0 text-emerald-500" />
                                  <p className="truncate text-[11px] text-muted-foreground">
                                    {fb.highlights}
                                  </p>
                                </div>
                              ) : null}
                              {fb.suggestions ? (
                                <div className="flex items-start gap-1">
                                  <ThumbsDown className="h-3 w-3 mt-0.5 shrink-0 text-red-400" />
                                  <p className="truncate text-[11px] text-muted-foreground/70 italic">
                                    {fb.suggestions}
                                  </p>
                                </div>
                              ) : null}
                              {!fb.highlights && !fb.suggestions && (
                                <span className="text-muted-foreground/40">
                                  —
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Sentiment badge */}
                          <td className="px-4 py-3">
                            {(() => {
                              const combined = [fb.highlights, fb.suggestions]
                                .filter(Boolean)
                                .join(" ");
                              if (!combined)
                                return (
                                  <span className="text-muted-foreground/40">
                                    —
                                  </span>
                                );
                              const { sentiment } = analyzeSentiment(combined);
                              return (
                                <Badge
                                  variant="outline"
                                  className={`rounded-full text-[10px] border flex items-center gap-1 w-fit ${SENTIMENT_STYLES[sentiment].className}`}
                                >
                                  {sentiment === "positive" && (
                                    <ThumbsUp className="h-2.5 w-2.5" />
                                  )}
                                  {sentiment === "negative" && (
                                    <ThumbsDown className="h-2.5 w-2.5" />
                                  )}
                                  {sentiment === "neutral" && (
                                    <Minus className="h-2.5 w-2.5" />
                                  )}
                                  {SENTIMENT_STYLES[sentiment].label}
                                </Badge>
                              );
                            })()}
                          </td>

                          {/* Expand chevron */}
                          <td className="px-3 py-3 text-muted-foreground">
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="p-0">
                              <ExpandedFeedback fb={fb} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
        {!loading && visible.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 print:hidden">
            <span className="text-xs tabular-nums text-muted-foreground">
              {t("feedback.showing", {
                from: (page - 1) * FEEDBACK_PER_PAGE + 1,
                to: Math.min(page * FEEDBACK_PER_PAGE, visible.length),
                total: visible.length,
              })}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Previous page"
                  disabled={page === 1}
                  onClick={() => setCurrentPage(page - 1)}
                  className="h-8 rounded-lg"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {t("feedback.page", { page, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Next page"
                  disabled={page === totalPages}
                  onClick={() => setCurrentPage(page + 1)}
                  className="h-8 rounded-lg"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Print-only feedback table ─────────────────────────────────────── */}
      <div className="hidden print:block mt-8">
        <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
          Feedback Records ({visible.length} entries)
        </h2>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-800 text-left">
              <th className="py-2 pr-3 font-semibold text-gray-700">Date</th>
              <th className="py-2 pr-3 font-semibold text-gray-700">Rating</th>
              <th className="py-2 pr-3 font-semibold text-gray-700">
                Visit Type
              </th>
              <th className="py-2 pr-3 font-semibold text-gray-700">
                Recommend
              </th>
              <th className="py-2 pr-3 font-semibold text-gray-700">
                Artifacts
              </th>
              <th className="py-2 font-semibold text-gray-700">Comments</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((fb) => (
              <tr key={fb.id} className="border-b border-gray-100">
                <td className="py-1.5 pr-3 text-gray-600 whitespace-nowrap">
                  {new Date(fb.submitted_at).toLocaleDateString()}
                </td>
                <td className="py-1.5 pr-3 font-semibold text-gray-800">
                  {fb.overall_rating} ★
                </td>
                <td className="py-1.5 pr-3 capitalize text-gray-600">
                  {fb.visit_type}
                </td>
                <td className="py-1.5 pr-3 text-gray-600">
                  {fb.would_recommend ? "Yes" : "No"}
                </td>
                <td className="py-1.5 pr-3 text-gray-600">
                  {fb.total_artifacts}
                </td>
                <td className="py-1.5 text-gray-600 max-w-[220px]">
                  {[fb.highlights, fb.suggestions]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Print styles ───────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body { font-size: 11px; }
          .feedback-page-root { padding: 0; }
          header, aside, nav, [data-sidebar] { display: none !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      {/* ── Print Report Modal ─────────────────────────────────────────────── */}
      <PrintReportModal
        open={showPrintModal}
        title={t("feedback.printFeedback")}
        onClose={() => setShowPrintModal(false)}
        onPrint={async (range) => {
          setPrintRange(range);
          setShowPrintModal(false);
          // Re-fetch rows filtered to the chosen date range, then print
          await fetchFeedback(range);
          setTimeout(() => window.print(), 100);
        }}
      />
    </div>
  );
}
