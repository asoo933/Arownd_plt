import { Grid, Map as MapIcon, Store } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type View = "products" | "stores" | "map";

export interface ViewToggleProps {
  value: View;
  onChange: (view: View) => void;
  labels?: Partial<Record<View, string>>;
  className?: string;
}

/** مبدّل موحّد: منتجات / متاجر / خريطة — أيقونة + تسمية قصيرة. */
export function ViewToggle({ value, onChange, labels, className }: ViewToggleProps) {
  const { t } = useTranslation();
  // التسميات الافتراضية مفاتيح ترجمة — تُترجم وقت العرض.
  const options = [
    { id: "products", label: labels?.products ?? t("view_products"), Icon: Grid },
    { id: "stores", label: labels?.stores ?? t("view_stores"), Icon: Store },
    { id: "map", label: labels?.map ?? t("view_map"), Icon: MapIcon },
  ] as const;

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex w-full items-center gap-1 rounded-2xl border border-border bg-card p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id as View)}
            className={cn(
              "flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold transition",
              active
                ? "bg-primary text-accent-ink-foreground"
                : "text-muted-foreground active:bg-muted/50",
            )}
          >
            <opt.Icon className="size-4 shrink-0" />
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
