import { useQuery } from "@tanstack/react-query";
import { ChevronDown, MapPin, Check } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { fetchWilayas } from "@/lib/sooqy";
import { cn } from "@/lib/utils";

export const wilayasQuery = { queryKey: ["wilayas"], queryFn: fetchWilayas, staleTime: Infinity };

/** زر اختيار الولاية — تصميم جديد فاخر */
export function WilayaButton({
  value,
  onChange,
  className,
  allLabel = "كل الولايات",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
  allLabel?: string;
}) {
  const { data = [] } = useQuery(wilayasQuery);
  const current = data.find((w) => w.id === value);
  const label = value == null ? allLabel : (current?.name_ar ?? String(value).padStart(2, "0"));
  const [isOpen, setIsOpen] = useState(false);
  const dropdownId = useId();
  const buttonRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleMouseDown);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen]);

  function handleMouseDown(e: MouseEvent) {
    const target = e.target as Node;
    if (
      buttonRef.current &&
      !buttonRef.current.contains(target) &&
      dropdownRef.current &&
      !dropdownRef.current.contains(target)
    ) {
      setIsOpen(false);
    }
  }

  useEffect(() => {
    if (isOpen && listRef.current) {
      const selected = listRef.current.querySelector("[data-selected]");
      if (selected) {
        selected.scrollIntoView({ block: "nearest", behavior: "auto" });
        (selected as HTMLElement).focus();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const anchor = buttonRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = 288;
      const left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 6,
        left,
        zIndex: 50,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const handleSelect = (wilayaId: number | null) => {
    onChange(wilayaId);
    setIsOpen(false);
    buttonRef.current?.querySelector("button")?.focus();
  };

  const button = (
    <div
      ref={buttonRef}
      className={cn(
        "relative inline-flex min-h-10 w-auto items-center rounded-full border border-primary/25 bg-primary/10 px-3.5 text-sm font-bold text-foreground transition hover:bg-primary/15 active:bg-primary/15 focus-within:ring-2 focus-within:ring-primary/30",
        className,
      )}
    >
      <span className="flex items-center gap-2 ps-5">
        <MapPin className="size-[18px] shrink-0 text-accent-ink" />
        <span className="max-w-[7rem] truncate">{label}</span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
      </span>
      <button
        type="button"
        aria-label="اختيار الولاية"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={dropdownId}
        onClick={() => setIsOpen(!isOpen)}
        className="absolute inset-0 h-full w-full cursor-pointer"
      />
    </div>
  );

  if (!isOpen) return button;

  const dropdown = (
    <div
      ref={(el) => {
        listRef.current = el;
        dropdownRef.current = el;
      }}
      id={dropdownId}
      role="listbox"
      aria-label="قائمة الولايات"
      onKeyDown={(event) => {
        const options = Array.from(
          listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
        );
        const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement);
        if (event.key === "Escape") {
          event.preventDefault();
          setIsOpen(false);
          buttonRef.current?.querySelector("button")?.focus();
          return;
        }
        if (
          event.key !== "ArrowDown" &&
          event.key !== "ArrowUp" &&
          event.key !== "Home" &&
          event.key !== "End"
        ) {
          return;
        }
        event.preventDefault();
        if (event.key === "Home") {
          options[0]?.focus();
          return;
        }
        if (event.key === "End") {
          options[options.length - 1]?.focus();
          return;
        }
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex =
          currentIndex < 0
            ? direction > 0
              ? 0
              : options.length - 1
            : (currentIndex + direction + options.length) % options.length;
        options[nextIndex]?.focus();
      }}
      style={dropdownStyle}
      className="min-w-[18rem] max-h-60 overflow-auto rounded-[var(--radius-control)] border border-border bg-card text-sm animate-fade-up"
    >
      <button
        type="button"
        role="option"
        aria-selected={value == null}
        tabIndex={value == null ? 0 : -1}
        data-selected={value == null}
        onClick={() => handleSelect(null)}
        className={cn(
          "flex min-h-[var(--touch-target-size)] w-full items-center gap-2 px-3 py-2.5 text-start transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
          value == null ? "bg-primary-soft text-accent-ink font-semibold" : "hover:bg-muted",
        )}
      >
        {value == null && <Check className="size-4 shrink-0 text-accent-ink" />}
        <span>{allLabel}</span>
      </button>
      {data.map((w) => (
        <button
          type="button"
          key={w.id}
          role="option"
          aria-selected={value === w.id}
          tabIndex={value === w.id ? 0 : -1}
          data-selected={value === w.id}
          onClick={() => handleSelect(w.id)}
          className={cn(
            "flex min-h-[var(--touch-target-size)] w-full items-center gap-2 px-3 py-2.5 text-start transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
            value === w.id ? "bg-primary-soft text-accent-ink font-semibold" : "hover:bg-muted",
          )}
        >
          {value === w.id && <Check className="size-4 shrink-0 text-accent-ink" />}
          <span className="text-muted-foreground w-6 text-center">
            {String(w.id).padStart(2, "0")}
          </span>
          <span>{w.name_ar}</span>
        </button>
      ))}
    </div>
  );
  return (
    <>
      {button}
      {dropdown}
    </>
  );
}

export function WilayaSelect({
  value,
  onChange,
  allLabel = "كل الولايات",
  className,
  required,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  allLabel?: string | null;
  className?: string;
  required?: boolean;
}) {
  const { data = [], isLoading, isError, refetch } = useQuery(wilayasQuery);
  return (
    <div className="w-full">
      <select
        value={value ?? ""}
        required={required}
        disabled={isLoading || isError}
        aria-busy={isLoading}
        aria-label="اختيار الولاية"
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className={cn(
          "min-h-[var(--control-height-compact)] w-full rounded-[var(--radius-control)] border border-input bg-card px-3 text-sm text-foreground outline-none transition-all appearance-none cursor-pointer focus:border-primary focus:ring-2 focus:ring-primary/10",
          className,
        )}
      >
        <option value="" disabled>
          {isLoading
            ? "جارٍ تحميل الولايات..."
            : isError
              ? "تعذر تحميل الولايات"
              : (allLabel ?? "اختر الولاية")}
        </option>
        {data.map((w) => (
          <option key={w.id} value={w.id}>
            {String(w.id).padStart(2, "0")} - {w.name_ar}
          </option>
        ))}
      </select>
      {isError && (
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-1 text-xs font-semibold text-primary underline"
        >
          إعادة تحميل الولايات
        </button>
      )}
    </div>
  );
}
