import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export interface StickyActionBarProps {
  children: ReactNode;
  className?: string;
}

export function StickyActionBar({ children, className }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom))] z-30 px-[var(--margin)]",
        className,
      )}
    >
      <div className="mx-auto max-w-xl rounded-[var(--radius-card)] border border-border bg-card/95 p-3 backdrop-blur">
        {children}
      </div>
    </div>
  );
}
