import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** رابط أو إجراء على اليمين (مثل «عرض الكل») */
  action?: ReactNode;
  className?: string;
}

/**
 * عنوان قسم داخل الصفحة — سطر واحد مضغوط: عنوان + إجراء اختياري.
 * ليس ثابتًا (sticky) حتى لا يزاحم المحتوى؛ الرؤوس الثابتة هي `PageHeader`.
 */
export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="truncate text-section text-foreground">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 truncate text-caption text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** رابط «عرض الكل» بإيقون سهم موحّد (يشير لليسار في RTL) */
export function SeeAllLink({ to, children }: { to: string; children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center gap-0.5 rounded-[var(--radius-control)] text-sm font-semibold text-accent-ink transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95"
    >
      {children ?? t("action_see_all")}
      <ChevronLeft className="size-3.5" aria-hidden="true" />
    </Link>
  );
}
