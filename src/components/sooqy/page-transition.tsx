import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { isNativePlatform } from "@/lib/platform";

/**
 * Web routes use a light entrance transition. Native WebViews avoid remounting
 * the entire route wrapper and skip the extra animation to reduce visual flash.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const native = isNativePlatform();

  return (
    <div key={native ? undefined : pathname} className={native ? undefined : "animate-fade-up"}>
      {children}
    </div>
  );
}
