import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/lib/i18n";
import { ChevronLeft } from "lucide-react";
import { CategoryIcon } from "./category-icons";
import {
  MAIN_CATEGORIES,
  OTHER_CATEGORIES,
  categoryGradient,
  categoryLabel,
  childrenOf,
  isMainCategory,
  parentOf,
  resolveCategoryId,
  sumCounts,
  type CategoryNode,
} from "@/lib/taxonomy";
import { Reveal } from "@/components/sooqy/reveal";
import { formatNumber } from "@/lib/market";
import { cn } from "@/lib/utils";

/** خريطة أعداد المنتجات لكل تصنيف (من `fetchCategoryStats`) — `null` = بلا إحصاءات */
export type CategoryCounts = Record<string, number> | null;

const countLabel = (
  n: number,
  t: (key: string, values?: Record<string, string | number>) => string,
) =>
  n === 1
    ? t("product_count_one")
    : n === 2
      ? t("product_count_two")
      : t("product_count_many", { count: n });

/**
 * يُخفي التصنيفات الفارغة **فقط** عند توفّر الإحصاءات، وإن كانت كلها فارغة
 * (قاعدة جديدة/تجريبية) تُعرض كلها حتى لا تخلو الصفحة.
 */
function visibleCategories(list: CategoryNode[], counts: CategoryCounts): CategoryNode[] {
  if (!counts) return list;
  const nonEmpty = list.filter((c) => sumCounts(counts, c.id) > 0);
  return nonEmpty.length > 0 ? nonEmpty : list;
}

/** بطاقة تصنيف رئيسي — أيقونة متدرّجة، اسم، وصف قصير، وعدّاد منتجات */
function CategoryTile({
  node,
  count,
  index,
}: {
  node: CategoryNode;
  count: number | null;
  index: number;
}) {
  const { t } = useTranslation();
  return (
    <Reveal index={index}>
      <Link
        to="/category/$catId"
        params={{ catId: node.id }}
        className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-soft transition-transform duration-200 active:scale-[0.97]"
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -end-8 -top-8 size-24 rounded-full bg-gradient-to-br opacity-[0.12] blur-2xl",
            node.gradient,
          )}
        />
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-accent-ink shadow-lift",
            node.gradient,
          )}
        >
          <CategoryIcon categoryId={node.id} className="size-6" />
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-sm font-extrabold leading-snug text-foreground">{node.label}</span>
          {node.hint && (
            <span className="text-[11px] font-medium leading-relaxed text-muted-foreground">
              {node.hint}
            </span>
          )}
        </span>
        {count != null && count > 0 && (
          <span className="mt-auto w-fit rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold text-accent-ink-soft-foreground">
            {countLabel(count, t)}
          </span>
        )}
        <ChevronLeft
          aria-hidden
          className="absolute left-4 top-4 size-4 text-muted-foreground/50 transition-transform duration-200 group-active:-translate-x-0.5"
        />
      </Link>
    </Reveal>
  );
}

/** شبكة عمودين للتصنيفات {t("breadcrumb_home")} */
export function CategoryGrid({
  counts = null,
  className,
}: {
  counts?: CategoryCounts;
  className?: string;
}) {
  const list = visibleCategories(MAIN_CATEGORIES, counts);
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {list.map((c, i) => (
        <CategoryTile
          key={c.id}
          node={c}
          count={counts ? sumCounts(counts, c.id) : null}
          index={i}
        />
      ))}
    </div>
  );
}

/** شرائح «تصنيفات أخرى» — هادئة ومستوى واحد */
export function OtherCategoriesRow({ counts = null }: { counts?: CategoryCounts }) {
  const list = visibleCategories(OTHER_CATEGORIES, counts);
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {list.map((c) => (
        <Link
          key={c.id}
          to="/category/$catId"
          params={{ catId: c.id }}
          className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold text-foreground shadow-soft transition-transform active:scale-95"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-accent-ink"><CategoryIcon categoryId={c.id} className="size-[18px]" /></span>
          {c.label}
        </Link>
      ))}
    </div>
  );
}

/** شرائح الفئات الفرعية داخل صفحة التصنيف (مع «{t("category_all")}») */
export function SubcategoryChips({ categoryId }: { categoryId: string }) {
  const { t } = useTranslation();
  const parent = parentOf(categoryId);
  const active = resolveCategoryId(categoryId);
  const children = parent ? childrenOf(parent.id) : [];
  if (!parent || children.length === 0) return null;
  const isParentActive = active === parent.id;

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <Link
        to="/category/$catId"
        params={{ catId: parent.id }}
        className={cn(
          "shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition",
          isParentActive
            ? "border-accent-ink bg-primary text-accent-ink-foreground shadow-lift"
            : "border-border bg-card text-muted-foreground",
        )}
      >
        {t("category_all")}
      </Link>
      {children.map((c) => (
        <Link
          key={c.id}
          to="/category/$catId"
          params={{ catId: c.id }}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition",
            c.id === active
              ? "border-accent-ink bg-primary text-accent-ink-foreground shadow-lift"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-accent-ink"><CategoryIcon categoryId={c.id} className="size-4" /></span>
          {c.label}
        </Link>
      ))}
    </div>
  );
}

/** مسار التنقّل: {t("breadcrumb_home")} ← التصنيف الرئيسي ← الفرعي */
export function CategoryBreadcrumb({ categoryId }: { categoryId: string }) {
  const { t } = useTranslation();
  const parent = parentOf(categoryId);
  const active = resolveCategoryId(categoryId);
  const isSub = !!parent && parent.id !== active;

  return (
    <nav
      aria-label={t("aria_category_breadcrumb")}
      className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"
    >
      <Link to="/" className="transition-colors hover:text-accent-ink">
        {t("breadcrumb_home")}
      </Link>
      {parent && (
        <>
          <ChevronLeft aria-hidden className="size-3 rotate-180" />
          {isSub ? (
            <Link
              to="/category/$catId"
              params={{ catId: parent.id }}
              className="transition-colors hover:text-accent-ink"
            >
              {parent.label}
            </Link>
          ) : (
            <span className="text-foreground">{parent.label}</span>
          )}
        </>
      )}
      {isSub && (
        <>
          <ChevronLeft aria-hidden className="size-3 rotate-180" />
          <span className="text-foreground">{categoryLabel(active)}</span>
        </>
      )}
    </nav>
  );
}

/** اختيار متعدّد للفئات الفرعية (تصنيف المتجر) */
export function SubcategoryMultiSelect({
  categoryId,
  value,
  onToggle,
}: {
  categoryId: string | null | undefined;
  value: string[];
  onToggle: (id: string) => void;
}) {
  const resolved = resolveCategoryId(categoryId);
  const children = isMainCategory(resolved) ? childrenOf(resolved) : [];
  if (children.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {children.map((c) => {
        const selected = value.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggle(c.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition",
              selected
                ? "border-accent-ink bg-primary-soft text-accent-ink-soft-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", selected ? "bg-primary/20 text-accent-ink" : "bg-primary/10 text-accent-ink")}>
              {selected ? <span aria-hidden="true">✓</span> : <CategoryIcon categoryId={c.id} className="size-4" />}
            </span>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

/** منتقي تصنيف رئيسي (للمتجر) — شبكة مضغوطة */
export function MainCategoryPicker({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (id: string) => void;
}) {
  const active = resolveCategoryId(value);
  return (
    <div className="grid grid-cols-2 gap-2">
      {MAIN_CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={cn(
            "flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-start text-xs font-bold transition",
            active === c.id
              ? "border-accent-ink bg-primary-soft text-accent-ink-soft-foreground"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-xl bg-primary/10 text-accent-ink",
              categoryGradient(c.id),
            )}
          >
            <CategoryIcon categoryId={c.id} className="size-4" />
          </span>
          <span className="leading-snug">{c.label}</span>
        </button>
      ))}
    </div>
  );
}
