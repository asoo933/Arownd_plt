import { cn } from "@/lib/utils";
import type { StockLevel } from "@/lib/sooqy";
import { BadgeCheck, Clock, XCircle, AlertTriangle, Check } from "lucide-react";
import type { StoreStatus } from "@/lib/geo";
import { useTranslation, type TranslateValues } from "@/lib/i18n";

type TFn = (key: string, values?: TranslateValues) => string;

/* ═══════════════ شارة مستوى المخزون ═══════════════ */
export function StockBadge({ level, className }: { level: StockLevel; className?: string }) {
  const { t } = useTranslation();
  const map = {
    in: { key: "badge_stock_in", cls: "bg-success-soft text-success border border-success/20" },
    low: { key: "badge_stock_low", cls: "bg-warning-soft text-warning border border-warning/20" },
    out: { key: "badge_stock_out", cls: "bg-danger-soft text-danger border border-danger/20" },
  }[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] leading-4 font-semibold",
        map.cls,
        className,
      )}
    >
      <Check className="size-2.5" aria-hidden="true" />
      {t(map.key)}
    </span>
  );
}

/* ═══════════════ شارة حالة فتح المتجر ═══════════════ */
function getStatusConfig(status: StoreStatus) {
  if (status.code === "no_hours") {
    return {
      icon: AlertTriangle,
      bgClass: "bg-neutral-200 text-muted-foreground border border-border",
      dotColor: "bg-neutral-500",
    };
  }
  if (status.code === "closed_today") {
    return {
      icon: XCircle,
      dotColor: "bg-warning",
      bgClass: "bg-warning-soft text-warning border border-warning/20",
    };
  }
  if (status.isOpen) {
    return {
      icon: Clock,
      dotColor: "bg-success live-dot",
      bgClass: "bg-success-soft text-success border border-success/20",
    };
  }
  return {
    icon: XCircle,
    bgClass: "bg-neutral-200 text-muted-foreground border border-border",
    dotColor: "bg-neutral-500",
  };
}

/** يحوّل حالة المتجر المنظّمة إلى نصوص بلغة الواجهة الحالية. */
export function localizeStoreStatus(
  status: StoreStatus,
  t: TFn,
): { label: string; description: string; nextChange?: string } {
  const p = status.params ?? {};
  const hours = Number(p["hours"] ?? 0);
  const mins = Number(p["mins"] ?? 0);
  const duration = (prefix: "closes" | "opens") =>
    hours > 0
      ? mins > 0
        ? t(`status_${prefix}_in_hm`, { hours, mins })
        : t(`status_${prefix}_in_h`, { hours })
      : t(`status_${prefix}_in_m`, { mins });

  switch (status.code) {
    case "no_hours":
      return { label: t("status_no_hours"), description: t("status_no_hours_desc") };
    case "closed_today": {
      const days = Number(p["days"] ?? 1);
      return {
        label: t("status_closed_temp"),
        description: t("status_closed_today_desc", {
          day: t(`weekday_${Number(p["dayIndex"] ?? 0)}`),
        }),
        nextChange: days === 1 ? t("status_tomorrow") : t("status_in_days", { days }),
      };
    }
    case "open":
      return {
        label: t("status_open_now"),
        description: t("status_open_until", { time: String(p["time"] ?? "") }),
        nextChange: duration("closes"),
      };
    case "closed_opens_today":
      return {
        label: t("status_closed_now"),
        description: t("status_opens_today", { time: String(p["time"] ?? "") }),
        nextChange: duration("opens"),
      };
    case "closed_opens_tomorrow":
    default:
      return {
        label: t("status_closed_now"),
        description: t("status_opens_tomorrow", { time: String(p["time"] ?? "") }),
        nextChange: duration("opens"),
      };
  }
}

export function OpenBadge({
  open,
  className,
  detailed = false,
  status,
}: {
  open?: boolean;
  className?: string;
  detailed?: boolean;
  status?: StoreStatus;
}) {
  const { t } = useTranslation();
  if (detailed && status) {
    const config = getStatusConfig(status);
    const Icon = config.icon;
    const text = localizeStoreStatus(status, t);
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-4 font-semibold",
          config.bgClass,
          className,
        )}
        title={text.description + (text.nextChange ? ` — ${text.nextChange}` : "")}
      >
        <span className={cn("size-1.5 shrink-0 rounded-full", config.dotColor)} />
        <Icon className="size-3 shrink-0" aria-hidden="true" />
        {text.label}
        {text.nextChange && <span className="opacity-70">· {text.nextChange}</span>}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-4 font-bold",
        open ? "bg-success-soft text-success" : "bg-neutral-200 text-muted-foreground",
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", open ? "bg-success live-dot" : "bg-neutral-500")}
      />
      {open ? t("badge_open") : t("badge_closed")}
    </span>
  );
}

/* ═══════════════ شارة التوثيق ═══════════════ */
export function VerifiedBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-caption font-bold text-accent-ink",
        className,
      )}
    >
      <BadgeCheck className="size-3.5" aria-hidden="true" /> {t("badge_verified")}
    </span>
  );
}

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useTranslation();
  const map: Record<string, { key: string; cls: string }> = {
    pending: { key: "status_pending", cls: "bg-warning-soft text-warning" },
    quoted: { key: "status_quoted", cls: "bg-warning-soft text-warning" },
    confirmed: { key: "status_confirmed", cls: "bg-primary-soft text-accent-ink" },
    shipped: { key: "status_shipped", cls: "bg-blue-soft text-blue" },
    delivered: { key: "status_delivered", cls: "bg-success-soft text-success" },
    cancelled: { key: "status_cancelled", cls: "bg-danger-soft text-danger" },
    rejected: { key: "status_rejected", cls: "bg-danger-soft text-danger" },
  };
  const m = map[status];
  const label = m ? t(m.key) : t("status_unknown");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-bold",
        m?.cls ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}
