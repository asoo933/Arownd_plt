import { useEffect, useState } from "react";

export function useCountdown(to: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!to) return null;
  const ms = Math.max(0, new Date(to).getTime() - now);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { ms, label: `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` };
}

/** لا تعرض شريط السلة العائم؛ تبقى السلة متاحة من التنقل وصفحة السلة. */
export function DynamicIsland() {
  return null;
}
