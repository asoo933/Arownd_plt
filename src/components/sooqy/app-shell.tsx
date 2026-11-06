import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export function AppShell({
  children,
  className,
  width = "content",
}: {
  children: ReactNode;
  className?: string;
  width?: "content" | "wide";
}) {
  return (
    <div
      className={cn(
        width === "wide" ? "app-workspace" : "app-page",
        "min-h-dvh w-full overflow-x-clip bg-background",
        className,
      )}
    >
      {children}
    </div>
  );
}
