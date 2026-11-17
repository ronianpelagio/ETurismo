/**
 * CommentsPage
 *
 * Admin view for all artifact_comments pulled from Supabase.
 *
 * Features wired in:
 *  1. Sentiment analysis  — badge on every comment, run client-side
 *  2. Sentiment filter    — toolbar pills: All / Positive / Neutral / Negative
 *  3. Local dialect translation — per-comment translate button (Tagalog, Cebuano, Ilocano)
 *  4. Print / export report — "Print Report" button calls window.print()
 */

import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Search,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Printer,
  Languages,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Filter,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { Skeleton } from "../components/LoadingSkeleton";
import { supabase } from "../services/supabase";
import {
  analyzeSentiment,
  getSentiment,
  Sentiment,
  SENTIMENT_STYLES,
  SentimentResult,
} from "../utils/sentiment";
import {
  translate,
  DialectCode,
  DIALECT_META,
} from "../utils/translation";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CommentUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profile_picture: string | null;
}

interface ArtifactComment {
  id: string;
  artifact_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  likes: number;
  created_at: string;
  user: CommentUser | null;
  artifact_name?: string | null;
  sentiment: SentimentResult;
  /** Translated text if the user requested one, keyed by dialect. */
  translations: Partial<Record<DialectCode, string>>;
  /** Which dialect is currently shown (null = original). */
  activeTranslation: DialectCode | null;
}

type SentimentFilter = "all" | Sentiment;

const COMMENTS_PER_PAGE = 15;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function displayName(user: CommentUser | null): string {
  if (!user) return "Unknown User";
  const parts = [user.first_name, user.last_name].filter(Boolean);
  return parts.length ? parts.join(" ") : "Anonymous";
}

function avatarInitials(user: CommentUser | null): string {
  if (!user) return "?";
  const f = user.first_name?.[0] ?? "";
  const l = user.last_name?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

const SENTIMENT_ICON: Record<Sentiment, React.ReactNode> = {
  positive: <ThumbsUp className="h-3 w-3" />,
  neutral:  <Minus className="h-3 w-3" />,
  negative: <ThumbsDown className="h-3 w-3" />,
};

// ─── TranslateDropdown ─────────────────────────────────────────────────────────

function TranslateDropdown({
  comment,
  onTranslate,
  onRestore,
}: {
  comment: ArtifactComment;
  onTranslate: (id: string, dialect: DialectCode) => void;
  onRestore: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dialects = Object.keys(DIALECT_META) as DialectCode[];

  return (
    <div className="relative print:hidden">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 rounded-lg px-2 text-[11px] text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
        title="Translate comment"
      >
        <Languages className="h-3.5 w-3.5" />
        {comment.activeTranslation
          ? DIALECT_META[comment.activeTranslation].name
          : "Translate"}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-xl border border-border bg-popover shadow-lg">
          {comment.activeTranslation && (
            <button
              className="w-full px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted/40"
              onClick={() => {
                onRestore(comment.id);
                setOpen(false);
              }}
            >
              Show original
            </button>
          )}
          {dialects.map((code) => (
            <button
              key={code}
              className={`w-full px-3 py-2 text-left text-xs hover:bg-muted/40 ${
                comment.activeTranslation === code
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              }`}
              onClick={() => {
                onTranslate(comment.id, code);
                setOpen(false);
              }}
            >
              {DIALECT_META[code].flag} {DIALECT_META[code].name} ({DIALECT_META[code].nativeName})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CommentsPage() {
  const [comments, setComments] = useState<ArtifactComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = React.useMemo(() => {
    const total = comments.length;
    const positive = comments.filter((c) => c.sentiment.sentiment === "positive").length;
    const negative = comments.filter((c) => c.sentiment.sentiment === "negative").length;
    const neutral  = comments.filter((c) => c.sentiment.sentiment === "neutral").length;
    return { total, positive, negative, neutral };
  }, [comments]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: fetch comments + artifact name (no user embed — multiple FKs
      // between artifact_comments and users cause an ambiguous-relationship
      // error in PostgREST when using the embed syntax).
      const { data: rows, error: qErr } = await supabase
        .from("artifact_comments")
        .select(
          `id, artifact_id, user_id, parent_id, content, likes, created_at,
           artifact:artifacts(name)`,
        )
        .order("created_at", { ascending: false });

      if (qErr) throw qErr;

      const rawRows = (rows ?? []) as any[];

      // Step 2: fetch user profiles for all unique user_ids in one query
      const uids = [...new Set(rawRows.map((r) => r.user_id).filter(Boolean))];
      let userMap = new Map<string, CommentUser>();

      if (uids.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, first_name, last_name, profile_picture")
          .in("id", uids);

        for (const u of users ?? []) {
          userMap.set(u.id, u as CommentUser);
        }
      }

      const enriched: ArtifactComment[] = rawRows.map((r) => ({
        id: r.id,
        artifact_id: r.artifact_id,
        user_id: r.user_id,
        parent_id: r.parent_id,
        content: r.content ?? "",
        likes: r.likes ?? 0,
        created_at: r.created_at,
        user: userMap.get(r.user_id) ?? null,
        artifact_name: r.artifact?.name ?? null,
        sentiment: analyzeSentiment(r.content ?? ""),
        translations: {},
        activeTranslation: null,
      }));

      setComments(enriched);
    } catch (err: any) {
      setError(err?.message || "Unable to load comments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // ── Translate handler ──────────────────────────────────────────────────────

  const handleTranslate = (id: string, dialect: DialectCode) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        // Cache translation so we don't re-compute on re-open
        const translated =
          c.translations[dialect] ?? translate(c.content, dialect);
        return {
          ...c,
          translations: { ...c.translations, [dialect]: translated },
          activeTranslation: dialect,
        };
      }),
    );
  };

  const handleRestoreOriginal = (id: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, activeTranslation: null } : c,
      ),
    );
  };

  // ── Filter + search ────────────────────────────────────────────────────────

  const visible = React.useMemo(() => {
    let filtered = comments;

    if (sentimentFilter !== "all") {
      filtered = filtered.filter(
        (c) => c.sentiment.sentiment === sentimentFilter,
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.content.toLowerCase().includes(q) ||
          displayName(c.user).toLowerCase().includes(q) ||
          (c.artifact_name ?? "").toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [comments, sentimentFilter, search]);

  const totalPages = Math.max(1, Math.ceil(visible.length / COMMENTS_PER_PAGE));
  const page = Math.min(currentPage, totalPages);
  const paginatedRows = visible.slice(
    (page - 1) * COMMENTS_PER_PAGE,
    page * COMMENTS_PER_PAGE,
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // ── Print ──────────────────────────────────────────────────────────────────

  const handlePrint = () => window.print();

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="comments-page-root">
      {/* ── Print-only header (hidden on screen) ──────────────────────────── */}
      <div className="hidden print:block mb-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">ETurismo — Comments Report</h1>
            <p className="text-sm text-gray-500 mt-1">
              Generated {new Date().toLocaleString()} · Showing{" "}
              {sentimentFilter === "all"
                ? "all comments"
                : `${sentimentFilter} comments`}
            </p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Total: {stats.total}</div>
            <div>Positive: {stats.positive}</div>
            <div>Neutral: {stats.neutral}</div>
            <div>Negative: {stats.negative}</div>
          </div>
        </div>
      </div>

      {/* ── Screen header ─────────────────────────────────────────────────── */}
      <div className="print:hidden">
        <PageHeader
          eyebrow="Community"
          title="Artifact Comments"
          description="All visitor comments on artifacts. Filter by sentiment, search by content, or translate to a local dialect."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl text-xs"
                onClick={handlePrint}
              >
                <Printer className="h-3.5 w-3.5" />
                Print Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl text-xs"
                onClick={fetchComments}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          }
        />
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive-foreground print:hidden">
          {error}
        </div>
      )}

      {/* ── Summary stat cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
        <StatCard
          label="Total Comments"
          value={stats.total.toLocaleString()}
          delta="All time"
          icon={<MessageSquare className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label="Positive"
          value={stats.positive.toLocaleString()}
          delta={
            stats.total
              ? `${Math.round((stats.positive / stats.total) * 100)}% of total`
              : "—"
          }
          icon={<ThumbsUp className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label="Neutral"
          value={stats.neutral.toLocaleString()}
          delta={
            stats.total
              ? `${Math.round((stats.neutral / stats.total) * 100)}% of total`
              : "—"
          }
          icon={<Minus className="h-4 w-4" />}
          loading={loading}
        />
        <StatCard
          label="Negative"
          value={stats.negative.toLocaleString()}
          delta={
            stats.total
              ? `${Math.round((stats.negative / stats.total) * 100)}% of total`
              : "—"
          }
          icon={<ThumbsDown className="h-4 w-4" />}
          loading={loading}
        />
      </div>

      {/* ── Filter toolbar ───────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-2 print:hidden">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search comments, user, artifact…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="h-8 rounded-xl border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 w-72"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Sentiment filter pills */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-0.5">
          {(["all", "positive", "neutral", "negative"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setSentimentFilter(s);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                sentimentFilter === s
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s !== "all" && SENTIMENT_ICON[s as Sentiment]}
              <span className="capitalize">{s}</span>
              {s !== "all" && (
                <span className="tabular-nums text-[10px] text-muted-foreground">
                  ({stats[s as Sentiment]})
                </span>
              )}
            </button>
          ))}
        </div>

        <span className="ml-auto text-[11px] text-muted-foreground">
          {visible.length} comment{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Print filter summary ─────────────────────────────────────────── */}
      <div className="hidden print:flex items-center gap-4 mt-3 mb-4 text-sm text-gray-600">
        <span className="font-semibold">Filter:</span>
        <span className="capitalize">{sentimentFilter}</span>
        {search && <span>· Search: "{search}"</span>}
        <span>· {visible.length} results</span>
      </div>

      {/* ── Comment list ─────────────────────────────────────────────────── */}
      <Card className="mt-3 rounded-2xl border-border bg-card overflow-hidden print:shadow-none print:border-0">
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3 px-4 py-4">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-40 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-3/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No comments found.</p>
            {(sentimentFilter !== "all" || search) && (
              <p className="text-xs text-muted-foreground/60 mt-1">
                Try adjusting your filters or search query.
              </p>
            )}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="divide-y divide-border">
              {paginatedRows.map((c) => {
                const displayText =
                  c.activeTranslation && c.translations[c.activeTranslation]
                    ? c.translations[c.activeTranslation]!
                    : c.content;

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-start gap-3 px-4 py-4 hover:bg-muted/20 transition print:py-3 print:hover:bg-transparent"
                  >
                    {/* Avatar */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground border border-border print:h-6 print:w-6">
                      {c.user?.profile_picture ? (
                        <img
                          src={c.user.profile_picture}
                          alt={displayName(c.user)}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        avatarInitials(c.user)
                      )}
                    </div>

                    {/* Body */}
                    <div className="min-w-0 flex-1">
                      {/* Top row */}
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-foreground">
                          {displayName(c.user)}
                        </span>
                        {c.artifact_name && (
                          <>
                            <span className="text-muted-foreground/40 text-xs">on</span>
                            <span className="text-xs text-muted-foreground font-medium truncate max-w-[180px]">
                              {c.artifact_name}
                            </span>
                          </>
                        )}
                        {/* Sentiment badge */}
                        <Badge
                          variant="outline"
                          className={`flex items-center gap-1 rounded-full px-1.5 py-0 text-[10px] border print:flex ${SENTIMENT_STYLES[c.sentiment.sentiment].className}`}
                        >
                          {SENTIMENT_ICON[c.sentiment.sentiment]}
                          {SENTIMENT_STYLES[c.sentiment.sentiment].label}
                        </Badge>
                        <span className="ml-auto text-[11px] text-muted-foreground whitespace-nowrap">
                          {timeAgo(c.created_at)}
                        </span>
                      </div>

                      {/* Content */}
                      <p
                        className={`text-xs leading-relaxed ${
                          c.activeTranslation
                            ? "text-foreground italic"
                            : "text-muted-foreground"
                        }`}
                      >
                        {displayText}
                      </p>

                      {/* Translation notice */}
                      {c.activeTranslation && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground/60 print:hidden">
                          Translated to{" "}
                          {DIALECT_META[c.activeTranslation].name} ·{" "}
                          <button
                            className="underline hover:text-muted-foreground"
                            onClick={() => handleRestoreOriginal(c.id)}
                          >
                            Show original
                          </button>
                        </p>
                      )}

                      {/* Bottom row: likes + translate */}
                      <div className="mt-1.5 flex items-center gap-3 print:hidden">
                        <span className="text-[11px] text-muted-foreground">
                          {c.likes} like{c.likes !== 1 ? "s" : ""}
                        </span>
                        {c.parent_id && (
                          <span className="text-[11px] text-muted-foreground/60">
                            Reply
                          </span>
                        )}
                        <div className="ml-auto">
                          <TranslateDropdown
                            comment={c}
                            onTranslate={handleTranslate}
                            onRestore={handleRestoreOriginal}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        {!loading && visible.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 print:hidden">
            <span className="text-xs tabular-nums text-muted-foreground">
              Showing {(page - 1) * COMMENTS_PER_PAGE + 1}–
              {Math.min(page * COMMENTS_PER_PAGE, visible.length)} of{" "}
              {visible.length} comments
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
                  Page {page} of {totalPages}
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

      {/* ── Print styles ─────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body { font-size: 11px; }
          .comments-page-root { padding: 0; }
          header, aside, nav, [data-sidebar] { display: none !important; }
        }
      `}</style>
    </div>
  );
}
