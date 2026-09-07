import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
  Filter,
  X,
  Users,
  TrendingUp,
  Calendar,
  Boxes,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { CardSkeleton, Skeleton } from "../components/LoadingSkeleton";
import { supabase } from "../services/supabase";
import { TourFeedbackRow } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = "submitted_at" | "overall_rating" | "total_artifacts";
type SortDir = "asc" | "desc";

type FeedbackFilter = {
  rating: number | null;       // 1-5 or null = all
  recommend: boolean | null;   // true/false/null = all
  visitType: string;            // "" = all
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
  if (!heard?.length) return <span className="text-muted-foreground/50 text-[10px]">—</span>;
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
              Highlights
            </p>
            <p className="text-xs text-foreground leading-relaxed">{fb.highlights}</p>
          </div>
        ) : null}
        {fb.suggestions ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Suggestions
            </p>
            <p className="text-xs text-foreground leading-relaxed">{fb.suggestions}</p>
          </div>
        ) : null}
        {!fb.highlights && !fb.suggestions && (
          <p className="text-xs text-muted-foreground italic col-span-2">
            No written comments provided.
          </p>
        )}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            How they heard about us
          </p>
          <HeardFromChips heard={fb.heard_from} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Artifacts explored
          </p>
          <p className="text-xs text-foreground">{fb.total_artifacts}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FeedbackPage() {
  const [rows, setRows] = useState<TourFeedbackRow[]>([]);
  const [summary, setSummary] = useState<FeedbackSummary>({
    total: 0,
    avgRating: 0,
    recommendPct: 0,
    last7d: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FeedbackFilter>({
    rating: null,
    recommend: null,
    visitType: "",
  });
  const [sortField, setSortField] = useState<SortField>("submitted_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("tour_feedback")
        .select(
          "id, user_id, overall_rating, visit_type, heard_from, highlights, suggestions, would_recommend, total_artifacts, submitted_at",
        )
        .order(sortField, { ascending: sortDir === "asc" });

      if (filter.rating !== null) query = query.eq("overall_rating", filter.rating);
      if (filter.recommend !== null) query = query.eq("would_recommend", filter.recommend);
      if (filter.visitType) query = query.eq("visit_type", filter.visitType);

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

  const visible = search.trim()
    ? rows.filter((r) => {
        const q = search.toLowerCase();
        return (
          (r.highlights ?? "").toLowerCase().includes(q) ||
          (r.suggestions ?? "").toLowerCase().includes(q) ||
          r.visit_type.toLowerCase().includes(q)
        );
      })
    : rows;

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
    filter.rating !== null || filter.recommend !== null || filter.visitType !== "";
  const clearFilters = () =>
    setFilter({ rating: null, recommend: null, visitType: "" });

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        eyebrow="User Feedback"
        title="Tour Feedback"
        description="All visitor feedback submitted after completing a tour. Click a row to see full details."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-xs"
            onClick={fetchFeedback}
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
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
          label="Total Submissions"
          value={summary.total.toLocaleString()}
          delta="All-time feedback"
          icon={<MessageSquare className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label="Avg. Rating"
          value={summary.avgRating ? summary.avgRating.toFixed(1) : "—"}
          delta="Out of 5.0"
          icon={<Star className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label="Would Recommend"
          value={summary.total ? `${summary.recommendPct}%` : "—"}
          delta="Visitors recommending"
          icon={<ThumbsUp className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label="This Week"
          value={summary.last7d.toLocaleString()}
          delta="Submissions (last 7 days)"
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
            placeholder="Search comments or visit type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
          onChange={(e) =>
            setFilter((f) => ({
              ...f,
              rating: e.target.value === "" ? null : Number(e.target.value),
            }))
          }
          className="h-8 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
        >
          <option value="">All ratings</option>
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
          onChange={(e) =>
            setFilter((f) => ({
              ...f,
              recommend:
                e.target.value === ""
                  ? null
                  : e.target.value === "yes",
            }))
          }
          className="h-8 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
        >
          <option value="">All responses</option>
          <option value="yes">Would recommend</option>
          <option value="no">Would not recommend</option>
        </select>

        {/* Visit type filter */}
        <select
          value={filter.visitType}
          onChange={(e) =>
            setFilter((f) => ({ ...f, visitType: e.target.value }))
          }
          className="h-8 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
        >
          {VISIT_TYPES.map((vt) => (
            <option key={vt} value={vt}>
              {vt ? VISIT_TYPE_LABELS[vt] : "All visit types"}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 gap-1 rounded-xl text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear filters
          </Button>
        )}

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
            <p className="text-sm text-muted-foreground">No feedback found.</p>
            {(hasActiveFilter || search) && (
              <p className="text-xs text-muted-foreground/60 mt-1">
                Try adjusting your filters or search query.
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
                      Date <SortIcon field="submitted_at" />
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left">
                    <button
                      onClick={() => handleSort("overall_rating")}
                      className="flex items-center font-semibold uppercase tracking-wider text-muted-foreground text-[10px] hover:text-foreground transition"
                    >
                      Rating <SortIcon field="overall_rating" />
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                    Visit type
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                    Recommend
                  </th>
                  <th className="px-4 py-2.5 text-left">
                    <button
                      onClick={() => handleSort("total_artifacts")}
                      className="flex items-center font-semibold uppercase tracking-wider text-muted-foreground text-[10px] hover:text-foreground transition"
                    >
                      Artifacts <SortIcon field="total_artifacts" />
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider text-muted-foreground text-[10px]">
                    Comment
                  </th>
                  <th className="px-4 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {visible.map((fb) => {
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
                              {VISIT_TYPE_LABELS[fb.visit_type] ?? fb.visit_type}
                            </Badge>
                          </td>

                          {/* Recommend */}
                          <td className="px-4 py-3">
                            {fb.would_recommend ? (
                              <span className="flex items-center gap-1 text-foreground">
                                <ThumbsUp className="h-3 w-3" />
                                <span className="text-[10px] font-medium">Yes</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <ThumbsDown className="h-3 w-3" />
                                <span className="text-[10px] font-medium">No</span>
                              </span>
                            )}
                          </td>

                          {/* Artifacts */}
                          <td className="px-4 py-3 text-foreground tabular-nums">
                            {fb.total_artifacts}
                          </td>

                          {/* Comment preview */}
                          <td className="px-4 py-3 max-w-[200px]">
                            {fb.highlights ? (
                              <p className="truncate text-muted-foreground">
                                {fb.highlights}
                              </p>
                            ) : fb.suggestions ? (
                              <p className="truncate text-muted-foreground/60 italic">
                                {fb.suggestions}
                              </p>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
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
                            <td colSpan={7} className="p-0">
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
      </Card>
    </div>
  );
}
