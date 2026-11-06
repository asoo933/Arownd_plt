import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  /** تعطيل كامل — يُستخدم عندما يصبح العنصر غير قابل للشراء. */
  disabled?: boolean;
  className?: string;
}) {
  const { isRTL, t } = useTranslation();
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border bg-card p-1",
        disabled && "opacity-50",
        isRTL && "flex-row-reverse",
        className,
      )}
    >
      <button
        type="button"
        aria-label={t("aria_decrease_qty")}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className={cn(
          "flex size-11 items-center justify-center rounded-full text-foreground transition hover:bg-muted disabled:opacity-40",
          isRTL && "rotate-180",
        )}
      >
        <Minus className="size-4" />
      </button>
      <span className="min-w-8 text-center text-sm font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={t("aria_increase_qty")}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className={cn(
          "flex size-11 items-center justify-center rounded-full text-foreground transition hover:bg-muted disabled:opacity-40",
          isRTL && "rotate-180",
        )}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
