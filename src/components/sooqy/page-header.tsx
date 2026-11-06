import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENGLISH_ENABLED, useTranslation } from "@/lib/i18n";

export function PageHeader({
  title,
  subtitle,
  back,
  action,
  className,
  showLanguageToggle,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string;
  action?: ReactNode;
  className?: string;
  showLanguageToggle?: boolean;
}) {
  const { lang, switchLang, t } = useTranslation();

  return (
    <header
      className={cn(
        "sticky top-[env(safe-area-inset-top)] z-20 -mx-[var(--margin)] flex min-h-16 items-center gap-3 border-b border-border/80 bg-background/90 px-[var(--margin)] py-2 backdrop-blur-xl",
        className,
      )}
    >
      {back && (
        <Link
          to={back}
          aria-label={t("aria_back")}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:bg-muted"
        >
          <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-h1 leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 truncate text-caption text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
      {showLanguageToggle && ENGLISH_ENABLED && (
        <button
          type="button"
          onClick={() => switchLang(lang === "ar" ? "en" : "ar")}
          aria-label={lang === "ar" ? t("aria_switch_lang") : t("aria_switch_lang_en")}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:bg-muted"
        >
          <Globe className="size-5" aria-hidden="true" />
        </button>
      )}
    </header>
  );
}
