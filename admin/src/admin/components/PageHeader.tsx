import React from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-7 flex flex-col gap-5 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className="mt-1 hidden h-10 w-1 rounded-full bg-foreground sm:block"
          aria-hidden="true"
        />
        <div className="space-y-1.5">
          {eyebrow && (
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </div>
          )}
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-foreground sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-card/70 p-1.5 shadow-sm">
          {actions}
        </div>
      )}
    </div>
  );
}
