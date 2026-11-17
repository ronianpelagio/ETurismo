/**
 * PrintReportModal
 *
 * A modal that lets the admin choose a report period before printing.
 * Supports: Weekly · Monthly · Quarterly · Yearly · Custom date range.
 *
 * Usage:
 *   <PrintReportModal
 *     open={showPrint}
 *     onClose={() => setShowPrint(false)}
 *     onPrint={(from, to, label) => { /* store range then window.print() *\/ }}
 *   />
 */

import React, { useState } from "react";
import { Calendar, Printer, X, ChevronDown, CalendarDays, CalendarRange, BarChart3, TrendingUp, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrintRange = {
  from: string;   // ISO date string "YYYY-MM-DD"
  to: string;     // ISO date string "YYYY-MM-DD"
  label: string;  // human-readable, used in print header
};

type Preset = "weekly" | "monthly" | "quarterly" | "yearly" | "custom";

interface PrintReportModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the chosen date range; parent should store it then call window.print() */
  onPrint: (range: PrintRange) => void;
  title?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

function startOfQuarter(): string {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10);
}

function startOfYear(): string {
  return `${new Date().getFullYear()}-01-01`;
}

const PRESETS: { key: Preset; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { key: "weekly",    label: "Weekly",    icon: CalendarDays,  description: "Last 7 days" },
  { key: "monthly",   label: "Monthly",   icon: CalendarRange, description: "Last 30 days" },
  { key: "quarterly", label: "Quarterly", icon: BarChart3,     description: "Current quarter" },
  { key: "yearly",    label: "Yearly",    icon: TrendingUp,    description: `Jan 1 – today (${new Date().getFullYear()})` },
  { key: "custom",    label: "Custom",    icon: PenLine,       description: "Pick your own date range" },
];

function resolveRange(preset: Preset, customFrom: string, customTo: string): PrintRange | null {
  const to = today();
  switch (preset) {
    case "weekly":
      return { from: daysAgo(6), to, label: "Weekly Report (Last 7 Days)" };
    case "monthly":
      return { from: daysAgo(29), to, label: "Monthly Report (Last 30 Days)" };
    case "quarterly":
      return { from: startOfQuarter(), to, label: `Quarterly Report (Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()})` };
    case "yearly":
      return { from: startOfYear(), to, label: `Annual Report (${new Date().getFullYear()})` };
    case "custom":
      if (!customFrom || !customTo) return null;
      if (customTo < customFrom) return null;
      return {
        from: customFrom,
        to: customTo,
        label: `Custom Report (${customFrom} – ${customTo})`,
      };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrintReportModal({
  open,
  onClose,
  onPrint,
  title = "Print Report",
}: PrintReportModalProps) {
  const [selected, setSelected] = useState<Preset>("monthly");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState(today());
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const range = resolveRange(selected, customFrom, customTo);

  const handlePrint = () => {
    setError(null);
    if (!range) {
      setError(
        selected === "custom" && !customFrom
          ? "Please select a start date."
          : selected === "custom" && customTo < customFrom
          ? "End date must be on or after start date."
          : "Invalid date range.",
      );
      return;
    }
    onPrint(range);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-muted">
                <Printer className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-[11px] text-muted-foreground">Choose a report period</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-3">
            {/* Preset grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRESETS.filter((p) => p.key !== "custom").map((p) => (
                <button
                  key={p.key}
                  onClick={() => { setSelected(p.key); setError(null); }}
                  className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition ${
                    selected === p.key
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-muted/30 text-foreground hover:border-foreground/40 hover:bg-muted/60"
                  }`}
                >
                  <p.icon className="h-4 w-4" />
                  <span className="text-xs font-semibold leading-tight">{p.label}</span>
                  <span className={`text-[10px] leading-tight ${selected === p.key ? "text-background/70" : "text-muted-foreground"}`}>
                    {p.description}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom toggle */}
            <button
              onClick={() => { setSelected("custom"); setError(null); }}
              className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${
                selected === "custom"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-muted/30 text-foreground hover:border-foreground/40 hover:bg-muted/60"
              }`}
            >
              <div className="flex items-center gap-2">
                <PenLine className="h-4 w-4 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">Custom Range</p>
                  <p className={`text-[10px] ${selected === "custom" ? "text-background/70" : "text-muted-foreground"}`}>
                    Pick your own start and end date
                  </p>
                </div>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${selected === "custom" ? "rotate-180" : ""}`} />
            </button>

            {/* Custom date inputs */}
            {selected === "custom" && (
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/20 px-3 py-3">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Calendar className="h-3 w-3" /> From
                  </label>
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo || today()}
                    onChange={(e) => { setCustomFrom(e.target.value); setError(null); }}
                    className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Calendar className="h-3 w-3" /> To
                  </label>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom}
                    max={today()}
                    onChange={(e) => { setCustomTo(e.target.value); setError(null); }}
                    className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                  />
                </div>
              </div>
            )}

            {/* Selected range preview */}
            {range && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
                <Printer className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">
                  Will print:{" "}
                  <span className="font-semibold text-foreground">{range.label}</span>
                  <span className="ml-1.5 tabular-nums">
                    ({range.from} → {range.to})
                  </span>
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] text-destructive-foreground">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              disabled={!range}
              className="gap-1.5 rounded-xl text-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Report
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
