import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface SideSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** إجراءات ثابتة أسفل اللوحة (حفظ/إلغاء). */
  footer?: ReactNode;
  className?: string;
}

/**
 * لوحة موحّدة للتحرير والتفاصيل:
 * - الهاتف: ورقة سفلية (حتى 92% من الارتفاع) بزوايا علوية دائرية.
 * - الشاشات الكبيرة (md+): لوحة جانبية كاملة الارتفاع من جهة نهاية الصفحة.
 * Radix يوفّر حبس التركيز، الإغلاق بـ Escape، وإخفاء الخلفية عن قارئات الشاشة.
 */
export function SideSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: SideSheetProps) {
  const { t } = useTranslation();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[1000] bg-[var(--color-overlay-scrim)]" />
        <DialogPrimitive.Content
          className={cn(
            "animate-sheet fixed z-[1001] flex flex-col bg-card  outline-none",
            // الهاتف: ورقة سفلية
            "inset-x-0 bottom-0 max-h-[calc(100dvh-env(safe-area-inset-top))] rounded-t-[var(--radius-sheet)] border-t border-border",
            // md+: لوحة جانبية
            "md:inset-y-0 md:bottom-auto md:start-auto md:end-0 md:max-h-none md:w-[28rem] md:max-w-[92vw] md:rounded-none md:rounded-s-[var(--radius-sheet)] md:border-s md:border-t-0",
            className,
          )}
        >
          <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-lg font-bold text-foreground">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description
                className={cn("mt-0.5 text-xs text-muted-foreground", !description && "sr-only")}
              >
                {description ?? title}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              className="icon-btn shrink-0"
              aria-label={t("aria_close")}
              type="button"
            >
              <X className="size-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            {children}
          </div>

          {footer ? (
            <footer className="border-t border-border bg-card px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
              {footer}
            </footer>
          ) : (
            <div className="pb-[env(safe-area-inset-bottom)]" />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
