import { Check } from "lucide-react";

const STEPS = ["Details", "Languages & audio", "Review"] as const;

export default function ArtifactFormProgress({ step }: { step: number }) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Artifact form progress">
      {STEPS.map((label, index) => {
        const number = index + 1;
        const complete = number < step;
        const active = number === step;

        return (
          <li
            key={label}
            className={`flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-xs transition-colors sm:px-3 ${
              active
                ? "border-foreground bg-foreground text-background"
                : complete
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-border bg-muted/30 text-muted-foreground"
            }`}
            aria-current={active ? "step" : undefined}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-bold">
              {complete ? (
                <Check className="h-3 w-3" aria-hidden="true" />
              ) : (
                number
              )}
            </span>
            <span className="truncate font-semibold">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
