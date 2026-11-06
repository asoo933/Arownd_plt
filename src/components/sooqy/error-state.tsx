import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { AlertTriangle, RefreshCw, ServerCrash, WifiOff } from "lucide-react";
import { friendlyError, isOffline, logNetError } from "@/lib/conn";
import { cn } from "@/lib/utils";

/**
 * حالة الخطأ (بند 2.5): تمييز بين «لا يوجد اتصال» و«فشل الخادم» و«لا توجد بيانات»،
 * مع تسجيل الخطأ تقنيًا في السجل المحلي + console، وزر إعادة محاولة بدورة تحميل.
 * الاستدعاء القديم (title/hint/onRetry) ما زال يعمل كما هو.
 */
export function ErrorState({
  title,
  hint,
  error,
  scope = "query",
  onRetry,
  className,
}: {
  title?: string;
  hint?: string;
  error?: unknown;
  scope?: string;
  onRetry?: () => unknown;
  className?: string;
}) {
  const { t } = useTranslation();
  const [retrying, setRetrying] = useState(false);
  const loggedRef = useRef<unknown>(null);

  // تسجيل تقني مرة واحدة لكل خطأ
  useEffect(() => {
    if (!error || loggedRef.current === error) return;
    loggedRef.current = error;
    logNetError(scope, error);
  }, [error, scope]);

  const friendly = friendlyError(error);
  const finalTitle = title ?? friendly.title;
  const finalHint = hint ?? friendly.hint;
  const offline = isOffline();

  const Icon = offline ? WifiOff : friendly.kind === "server" ? ServerCrash : AlertTriangle;

  async function handleRetry() {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-border bg-card px-6 py-10 text-center",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-2xl",
          offline ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger",
        )}
      >
        <Icon className="size-6" aria-hidden />
      </span>

      <p className="text-sm font-bold text-foreground">{finalTitle}</p>
      {finalHint && (
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{finalHint}</p>
      )}

      {onRetry && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="btn-secondary mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <RefreshCw className={cn("size-4", retrying && "animate-spin")} aria-hidden />
          {retrying ? t("action_retrying") : t("action_retry")}
        </button>
      )}
    </div>
  );
}
