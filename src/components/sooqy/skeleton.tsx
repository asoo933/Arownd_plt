import { cn } from "@/lib/utils";

/** Loading placeholders follow the same geometry as their final components. */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-3xl border border-border bg-card", className)}>
      <div className="aspect-square skeleton" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-3/4 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-2/5 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

export function StoreCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-3xl border border-border bg-card p-4", className)}>
      <div className="size-20 shrink-0 animate-pulse rounded-2xl bg-muted" />
      <div className="min-w-0 flex-1 space-y-2 py-1">
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({
  count = 6,
  className,
  horizontal = false,
}: {
  count?: number;
  className?: string;
  horizontal?: boolean;
}) {
  return (
    <div
      aria-hidden={horizontal ? true : undefined}
      className={cn(
        horizontal
          ? "no-scrollbar -mx-4 flex snap-x snap-proximity gap-2.5 overflow-x-auto px-4 pb-1 sm:gap-3"
          : "grid grid-cols-2 gap-[var(--gutter)] sm:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={
            horizontal
              ? "w-[calc((100%-0.625rem)/2)] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/3)] lg:w-[calc((100%-2.25rem)/4)]"
              : undefined
          }
        >
          <ProductCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <StoreCardSkeleton key={i} />
      ))}
    </div>
  );
}


/** هيكل بطاقة المتجر الأفقية في الصفحة الرئيسية. */
export function StoreRailSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-hidden px-4 pb-1" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-64 shrink-0 overflow-hidden rounded-[var(--radius-card)] border border-border bg-card">
          <div className="aspect-[16/10] skeleton" />
          <div className="flex items-center gap-3 p-3">
            <div className="size-11 shrink-0 animate-pulse rounded-xl bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded-full bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** هيكل صفحة المنتج بأبعاد صورة البطل وبطاقات المعلومات النهائية. */
export function ProductDetailSkeleton() {
  return (
    <div className="pb-[calc(var(--nav-height)+env(safe-area-inset-bottom)+3rem)]" role="status" aria-label="جارٍ تحميل المنتج">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-b-[var(--radius-card)] bg-muted sm:aspect-square">
        <div className="size-full skeleton" />
      </div>
      <div className="space-y-6 px-5 pt-6">
        <section className="space-y-4 rounded-[var(--radius-card)] border border-border bg-card p-4">
          <div className="h-6 w-3/4 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded-full bg-muted" />
          <div className="h-8 w-1/2 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
        </section>
        <section className="space-y-4 rounded-[var(--radius-card)] border border-border bg-card p-4">
          <div className="h-5 w-1/3 animate-pulse rounded-full bg-muted" />
          <div className="grid grid-cols-2 gap-3"><div className="h-12 rounded-xl bg-muted animate-pulse" /><div className="h-12 rounded-xl bg-muted animate-pulse" /></div>
        </section>
        <section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-4">
          <div className="h-5 w-1/3 animate-pulse rounded-full bg-muted" />
          <div className="h-24 rounded-2xl bg-muted animate-pulse" />
        </section>
      </div>
    </div>
  );
}

/** هيكل صفحة المتجر: الغلاف، التعريف، التبويبات وشبكة المنتجات. */
export function StoreDetailSkeleton() {
  return (
    <div className="space-y-5 pb-8" role="status" aria-label="جارٍ تحميل المتجر">
      <div className="h-44 w-full skeleton sm:h-56" />
      <div className="space-y-3 px-4">
        <div className="flex items-center gap-3"><div className="-mt-10 size-20 shrink-0 rounded-2xl border-4 border-background bg-muted animate-pulse" /><div className="flex-1 space-y-2"><div className="h-5 w-2/3 rounded-full bg-muted animate-pulse" /><div className="h-3 w-1/3 rounded-full bg-muted animate-pulse" /></div></div>
        <div className="h-4 w-full rounded-full bg-muted animate-pulse" />
        <div className="h-11 w-full rounded-xl bg-muted animate-pulse" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
      </div>
    </div>
  );
}


export function DashboardLoadingSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-5" role="status" aria-label="جارٍ تحميل الصفحة">
      <div className="space-y-2"><div className="h-7 w-2/5 animate-pulse rounded-full bg-muted" /><div className="h-3 w-3/5 animate-pulse rounded-full bg-muted" /></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => <div key={i} className="h-24 rounded-[var(--radius-card)] border border-border bg-card p-4"><div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" /><div className="mt-4 h-6 w-2/3 animate-pulse rounded-full bg-muted" /></div>)}
      </div>
      <div className="space-y-3"><div className="h-5 w-1/3 animate-pulse rounded-full bg-muted" />
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="flex min-h-24 items-center gap-3 rounded-[var(--radius-card)] border border-border bg-card p-4"><div className="size-14 shrink-0 animate-pulse rounded-xl bg-muted" /><div className="min-w-0 flex-1 space-y-2"><div className="h-4 w-3/4 animate-pulse rounded-full bg-muted" /><div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" /></div></div>)}
      </div>
    </div>
  );
}

export const LoadingSkeleton = ListSkeleton;


/** هيكل المحفظة مع الحفاظ على مواضع الرصيد والملخص والفلاتر وسجل العمليات. */
export function WalletPageSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 pb-6 pt-5" role="status" aria-label="جارٍ تحميل المحفظة">
      <div className="space-y-2"><div className="h-7 w-1/3 animate-pulse rounded-full bg-muted" /><div className="h-3 w-2/3 animate-pulse rounded-full bg-muted" /></div>
      <section className="space-y-4 rounded-[var(--radius-card)] bg-primary p-5">
        <div className="h-3 w-1/4 animate-pulse rounded-full bg-primary-foreground/20" />
        <div className="h-10 w-2/5 animate-pulse rounded-lg bg-primary-foreground/20" />
        <div className="h-3 w-3/4 animate-pulse rounded-full bg-primary-foreground/15" />
        <div className="grid grid-cols-2 gap-2 border-t border-primary-foreground/10 pt-3"><div className="h-14 animate-pulse rounded-xl bg-primary-foreground/10" /><div className="h-14 animate-pulse rounded-xl bg-primary-foreground/10" /></div>
      </section>
      <div className="grid grid-cols-2 gap-3"><div className="h-12 animate-pulse rounded-xl bg-muted" /><div className="h-12 animate-pulse rounded-xl bg-muted" /></div>
      <div className="grid grid-cols-2 gap-3"><div className="h-24 animate-pulse rounded-[var(--radius-card)] border border-border bg-card" /><div className="h-24 animate-pulse rounded-[var(--radius-card)] border border-border bg-card" /><div className="col-span-2 h-14 animate-pulse rounded-[var(--radius-card)] border border-border bg-card" /></div>
      <div className="space-y-2"><div className="h-5 w-1/3 animate-pulse rounded-full bg-muted" /><div className="flex gap-2 overflow-hidden">{Array.from({length:4}).map((_,i)=><div key={i} className="h-9 w-20 shrink-0 animate-pulse rounded-full bg-muted" />)}</div>{Array.from({length:3}).map((_,i)=><div key={i} className="h-20 animate-pulse rounded-[var(--radius-card)] border border-border bg-card" />)}</div>
    </div>
  );
}

/** هيكل عناصر الإشعارات بأبعاد الصف النهائي. */
export function NotificationListSkeleton({ count = 4 }: { count?: number }) {
  return <div className="space-y-2 py-4" role="status" aria-label="جارٍ تحميل الإشعارات">
    {Array.from({length:count}).map((_,i)=><div key={i} className="flex min-h-[88px] items-start gap-3 rounded-[var(--radius-card)] border border-border bg-card p-3"><div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" /><div className="min-w-0 flex-1 space-y-2 pt-1"><div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" /><div className="h-3 w-full animate-pulse rounded-full bg-muted" /><div className="h-3 w-1/3 animate-pulse rounded-full bg-muted" /></div><div className="size-7 shrink-0 animate-pulse rounded-lg bg-muted" /></div>)}
  </div>;
}

/** هيكل إعدادات المتجر: ترويسة النموذج وبطاقات الحقول والخريطة. */
export function StoreSettingsSkeleton() {
  return <div className="mx-auto max-w-3xl space-y-4 px-4 pb-24 pt-5" role="status" aria-label="جارٍ تحميل إعدادات المتجر">
    <div className="space-y-2"><div className="h-7 w-1/3 animate-pulse rounded-full bg-muted" /><div className="h-3 w-2/3 animate-pulse rounded-full bg-muted" /></div>
    <section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-4"><div className="flex items-center gap-3"><div className="size-20 animate-pulse rounded-2xl bg-muted" /><div className="h-10 flex-1 animate-pulse rounded-xl bg-muted" /></div>{Array.from({length:3}).map((_,i)=><div key={i} className="h-11 animate-pulse rounded-xl bg-muted" />)}</section>
    {Array.from({length:4}).map((_,i)=><section key={i} className="space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-4"><div className="h-5 w-1/3 animate-pulse rounded-full bg-muted" /><div className="grid grid-cols-2 gap-3"><div className="h-11 animate-pulse rounded-xl bg-muted" /><div className="h-11 animate-pulse rounded-xl bg-muted" /></div><div className="h-11 animate-pulse rounded-xl bg-muted" /></section>)}
    <div className="h-12 animate-pulse rounded-xl bg-muted" />
  </div>;
}

/** هيكل تفاصيل طلب التاجر مع أقسام الملخص والعناصر والإجراءات. */
export function MerchantOrderDetailSkeleton() {
  return <div className="mx-auto w-full max-w-4xl space-y-5 px-4 pb-24 pt-5 sm:px-6" role="status" aria-label="جارٍ تحميل تفاصيل الطلب">
    <div className="h-7 w-1/3 animate-pulse rounded-full bg-muted" />
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-card"><div className="space-y-3 bg-primary-soft p-4"><div className="h-5 w-1/3 animate-pulse rounded-full bg-muted" /><div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" /></div><div className="space-y-4 p-4">{Array.from({length:3}).map((_,i)=><div key={i} className="flex items-center gap-3 rounded-xl border border-border p-3"><div className="size-14 animate-pulse rounded-xl bg-muted" /><div className="flex-1 space-y-2"><div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" /><div className="h-3 w-1/3 animate-pulse rounded-full bg-muted" /></div></div>)}<div className="h-24 animate-pulse rounded-xl bg-muted" /><div className="h-11 animate-pulse rounded-xl bg-muted" /></div></section>
  </div>;
}


/** هيكل قائمة الطلبات مع مساحة لملخص كل طلب وحالاته وعناصره. */
export function OrderListSkeleton({ count = 3 }: { count?: number }) {
  return <div className="space-y-3" role="status" aria-label="جارٍ تحميل الطلبات">
    {Array.from({length:count}).map((_,i)=><section key={i} className="space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-4"><div className="flex items-center justify-between gap-3"><div className="h-4 w-1/3 animate-pulse rounded-full bg-muted" /><div className="h-6 w-20 animate-pulse rounded-full bg-muted" /></div><div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" /><div className="flex items-center gap-3 border-t border-border pt-3"><div className="size-14 animate-pulse rounded-xl bg-muted" /><div className="min-w-0 flex-1 space-y-2"><div className="h-4 w-3/4 animate-pulse rounded-full bg-muted" /><div className="h-3 w-1/3 animate-pulse rounded-full bg-muted" /></div></div><div className="flex justify-between border-t border-border pt-3"><div className="h-4 w-1/4 animate-pulse rounded-full bg-muted" /><div className="h-4 w-1/3 animate-pulse rounded-full bg-muted" /></div></section>)}
  </div>;
}

/** هيكل تتبع الطلب: رأس الطلب ومسار الحالة وتفاصيل الشحنة. */
export function OrderTrackingSkeleton() {
  return <div className="space-y-4 px-4 pt-4" role="status" aria-label="جارٍ تحميل تتبع الطلب"><div className="h-8 w-2/3 animate-pulse rounded-full bg-muted" /><section className="space-y-4 rounded-[var(--radius-card)] border border-border bg-card p-4"><div className="h-5 w-1/3 animate-pulse rounded-full bg-muted" /><div className="space-y-5 py-3">{Array.from({length:4}).map((_,i)=><div key={i} className="flex items-start gap-3"><div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" /><div className="flex-1 space-y-2"><div className="h-4 w-1/3 animate-pulse rounded-full bg-muted" /><div className="h-3 w-2/3 animate-pulse rounded-full bg-muted" /></div></div>)}</div></section><section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-4"><div className="h-5 w-1/3 animate-pulse rounded-full bg-muted" /><div className="h-20 animate-pulse rounded-xl bg-muted" /><div className="h-11 animate-pulse rounded-xl bg-muted" /></section></div>;
}
