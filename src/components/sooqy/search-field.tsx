import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  bare?: boolean;
  trailing?: ReactNode;
}

export function SearchField({
  value,
  onChange,
  onSearch,
  placeholder,
  disabled,
  className,
  bare = false,
  trailing,
}: SearchFieldProps) {
  const { t } = useTranslation();
  const hasValue = value.length > 0;
  const hasTrailing = Boolean(trailing);

  return (
    <div className={cn("relative w-full", className)}>
      <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
        <Search className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSearch?.();
          }
        }}
        aria-label={placeholder ?? t("explore_search_placeholder")}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        className={cn(
          "h-12 w-full rounded-full border border-input bg-card ps-11 pe-4 text-base text-foreground placeholder:text-muted-foreground",
          "outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring",
          disabled && "pointer-events-none opacity-50",
          bare && "h-full rounded-none border-0 bg-transparent focus:ring-0",
          hasTrailing && "pe-20",
        )}
      />
      {(hasValue || hasTrailing) && !disabled && (
        <div className="absolute inset-y-0 end-0 flex items-center gap-1 pe-2">
          {hasValue && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                onSearch?.();
              }}
              aria-label={t("aria_clear_search")}
              className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
          {trailing}
        </div>
      )}
    </div>
  );
}

export interface FilterChipProps {
  label: string;
  value: string;
  selected: boolean;
  onChange: (value: string) => void;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function FilterChip({
  label,
  value,
  selected,
  onChange,
  icon: Icon,
  className,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-input bg-card text-foreground hover:bg-muted",
        className,
      )}
    >
      {Icon && <Icon className="size-4" aria-hidden="true" />}
      {label}
    </button>
  );
}
