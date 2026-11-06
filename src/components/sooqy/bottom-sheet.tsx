import { useEffect, useId, useRef, type ReactNode } from "react";
import { useTranslation } from "@/lib/i18n";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** محتوى ثابت أسفل الورقة (أزرار الإجراء الأساسية). */
  footer?: ReactNode;
  className?: string;
  /** نمط "نموذج مركّز" بدلًا من ورقة من الأسفل. القائمة تظهر في منتصف الشاشة. */
  modal?: boolean;
  /** عرض النموذج بالبكسل — افتراضي 320. */
  width?: number;
}

/**
 * ورقة سفلية للهاتف: تنزلق من الأسفل، قابلة للتمرير،
 * مع عنوان واضح ومقبض إغلاق وركن إجراءات ثابت.
 * مع `modal` تصبح نافذة مركّزة في وسط الشاشة.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
  modal = false,
  width = 320,
}: BottomSheetProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!panelRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[1200] flex items-end justify-center bg-[var(--color-overlay-scrim)]",
        modal && "items-center",
      )}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={cn(
          "animate-fade-up flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden",
          "rounded-t-[var(--radius-sheet)] border-t border-border bg-card",
          "pb-[env(safe-area-inset-bottom)]",
          modal &&
            "animate-scale-in items-center rounded-[var(--radius-sheet)] border-t-0 max-w-[calc(100vw-2rem)]",
          className,
        )}
        style={modal ? { width } : undefined}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* مقبض + رأس — في النمط المركّز لا نحتاج المقبض */}
        <div className="shrink-0 px-5 pt-3">
          {!modal && (
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          )}
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-h3 text-foreground">
                {title}
              </h2>
              {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label={t("aria_close")}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95"
            >
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* محتوى قابل للتمرير */}
        <div className={cn("min-h-0 flex-1 overflow-y-auto", modal ? "px-5 py-4" : "px-5 py-4")}>
          {children}
        </div>

        {/* ركن إجراءات ثابت */}
        {footer && (
          <div className="shrink-0 border-t border-border bg-card px-5 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
