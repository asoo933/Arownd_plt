import { useQuery } from "@tanstack/react-query";
import { fetchCommunes } from "@/lib/sooqy";
import { cn } from "@/lib/utils";

export const communesQuery = (wilayaId: number | null) => ({
  queryKey: ["communes", wilayaId],
  queryFn: () => fetchCommunes(wilayaId),
  enabled: wilayaId != null,
  staleTime: 5 * 60 * 1000,
});

export function CommuneSelect({
  value,
  onChange,
  wilayaId,
  allLabel = "كل البلديات",
  className,
  required,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  wilayaId: number | null;
  allLabel?: string | null;
  className?: string;
  required?: boolean;
}) {
  const { data = [], isLoading, isError, refetch } = useQuery(communesQuery(wilayaId));

  return (
    <div className="w-full space-y-1">
      <select
        value={value ?? ""}
        required={required}
        aria-label="اختيار البلدية"
        disabled={!wilayaId || isLoading || isError}
        aria-busy={isLoading}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(
          "min-h-[var(--control-height-compact)] w-full rounded-[var(--radius-control)] border border-input bg-card px-3 text-sm text-foreground outline-none transition-all appearance-none cursor-pointer disabled:opacity-50 focus:border-primary focus:ring-2 focus:ring-primary/10",
          className,
        )}
      >
        <option value="" disabled={allLabel === null || !wilayaId}>
          {!wilayaId
            ? "اختر الولاية أولاً"
            : isLoading
              ? "جارٍ تحميل البلديات..."
              : isError
                ? "تعذر تحميل البلديات"
                : (allLabel ?? "اختر البلدية")}
        </option>
        {data.map((commune) => (
          <option key={commune} value={commune}>
            {commune}
          </option>
        ))}
      </select>
      {isError && wilayaId != null && (
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-xs font-semibold text-primary underline"
        >
          إعادة تحميل البلديات
        </button>
      )}
    </div>
  );
}
