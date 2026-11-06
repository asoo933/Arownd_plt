import { useEffect, useId, useRef } from "react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** نافذة تأكيد موحّدة مع إدارة التركيز ومنع الإغلاق أثناء تنفيذ العملية. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const messageId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const cancelRef = useRef(onCancel);
  const busyRef = useRef(busy);
  cancelRef.current = onCancel;
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    confirmRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!busyRef.current) cancelRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;
  const cancel = () => {
    if (!busy) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-end justify-center bg-[var(--color-overlay-scrim)] p-4 pb-8 sm:items-center"
      onClick={cancel}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="animate-scale-in w-full max-w-sm rounded-[var(--radius-card)] border border-border bg-card p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <p id={messageId} className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="min-h-[var(--control-height)] rounded-[var(--radius-pill)] border border-border bg-background px-4 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {cancelLabel ?? t("cancel")}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "min-h-[var(--control-height)] rounded-[var(--radius-pill)] px-4 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
              tone === "danger"
                ? "bg-danger text-danger-foreground"
                : "bg-primary text-accent-ink-foreground",
            )}
          >
            {busy ? t("action_busy") : (confirmLabel ?? t("action_confirm"))}
          </button>
        </div>
      </div>
    </div>
  );
}
