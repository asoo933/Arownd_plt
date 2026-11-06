import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  Icon,
  title,
  hint,
  action,
  className,
}: {
  Icon?: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-border bg-card px-6 py-10 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-6" aria-hidden="true" />
        </div>
      )}
      <p className="text-base font-semibold text-foreground">{title}</p>
      {hint && <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
