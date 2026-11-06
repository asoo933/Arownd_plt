import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowDownLeft,
  Info,
  ArrowUpRight,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  Upload,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { showError, showSuccess } from "@/lib/feedback";
import { useAuth } from "@/lib/auth";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { formatDA } from "@/lib/geo";
import { formatDate, formatTime } from "@/lib/market";
import {
  fetchWalletTransactions,
  summarizeWallet,
  uploadImageToBucket,
  createReceiptSignedUrl,
  walletTopup,
  walletWithdraw,
  type WalletTxType,
} from "@/lib/sooqy";
import { PageHeader } from "@/components/sooqy/page-header";
import { EmptyState } from "@/components/sooqy/empty-state";
import { cn } from "@/lib/utils";
import { SeoHead } from "@/components/seo/SeoHead";
import { WalletPageSkeleton } from "@/components/sooqy/skeleton";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/wallet")({
  head: () => ({}),
  component: WalletPage,
});

type Tab = "all" | "topup" | "withdraw" | "pending" | "approved" | "rejected";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "wallet_tab_all" },
  { id: "topup", label: "wallet_tab_topup" },
  { id: "withdraw", label: "wallet_tab_withdraw" },
  { id: "pending", label: "wallet_tab_pending" },
  { id: "approved", label: "wallet_tab_approved" },
  { id: "rejected", label: "wallet_tab_rejected" },
];

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "wallet_status_pending", cls: "bg-warning-soft text-warning" },
  approved: { label: "wallet_status_approved", cls: "bg-success-soft text-success" },
  rejected: { label: "wallet_status_rejected", cls: "bg-danger-soft text-danger" },
};

const TYPE_META: Record<WalletTxType, { label: string; icon: typeof Wallet }> = {
  topup: { label: "wallet_type_topup", icon: ArrowDownLeft },
  withdraw: { label: "wallet_type_withdraw", icon: ArrowUpRight },
  purchase: { label: "wallet_type_purchase", icon: ShoppingBag },
  refund: { label: "wallet_type_refund", icon: RotateCcw },
};

const METHODS = [
  { id: "baridimob", label: "wallet_method_baridimob" },
  { id: "ccp", label: "wallet_method_ccp" },
  { id: "bank", label: "wallet_method_bank" },
];

const PRESETS = [500, 1000, 2000, 5000];
const MIN_AMOUNT = 100;

function WalletPage() {
  const { user, ready } = useAuth();
  const { t: tr } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [showTopup, setShowTopup] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const [topupAmount, setTopupAmount] = useState("");
  const [topupMethod, setTopupMethod] = useState(METHODS[0].id);
  const [topupReceipt, setTopupReceipt] = useState<File | null>(null);
  const [busyTopup, setBusyTopup] = useState(false);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState(METHODS[0].id);
  const [withdrawNote, setWithdrawNote] = useState("");
  const [busyWithdraw, setBusyWithdraw] = useState(false);

  const txs = useQuery({
    queryKey: ["wallet"],
    queryFn: fetchWalletTransactions,
    enabled: !!user,
  });

  // تحديثات حية: اعتماد/رفض الإدارة يظهر فورًا (Supabase Realtime)
  useRealtimeSubscription({
    table: "wallet_transactions",
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    queryKeys: [["wallet"]],
    enabled: !!user,
  });

  if (!ready) return null;
  if (!user) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex size-20 items-center justify-center rounded-[var(--radius-card)] bg-primary-soft">
          <Wallet className="size-9 text-accent-ink" strokeWidth={1.6} />
        </span>
        <h1 className="text-h1 text-foreground">{tr("wallet_login_title")}</h1>
        <p className="max-w-xs text-body text-muted-foreground">
          {tr("wallet_login_hint")}
        </p>
        <a href="/auth" className="btn-primary mt-2">
          {tr("wallet_login_action")}
        </a>
      </div>
    );
  }

  if (txs.isLoading) return <WalletPageSkeleton />;

  const list = txs.data ?? [];
  const summary = summarizeWallet(list);
  const pendingTransactions = list.filter((t) => t.status === "pending");
  const pendingCount = pendingTransactions.length;
  const pendingTopup = pendingTransactions
    .filter((t) => t.type === "topup")
    .reduce((sum, t) => sum + Math.max(0, t.amount), 0);
  const pendingWithdraw = pendingTransactions
    .filter((t) => t.type === "withdraw")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const filtered = list.filter((t) => {
    if (tab === "all") return true;
    if (tab === "topup") return t.type === "topup" || t.type === "refund";
    if (tab === "withdraw") return t.type === "withdraw" || t.type === "purchase";
    return t.status === tab;
  });

  const submitTopup = async () => {
    const amount = Math.round(Number(topupAmount));
    if (!amount || amount < MIN_AMOUNT) {
      toast.error(tr("wallet_error_amount", { amount: MIN_AMOUNT }));
      return;
    }
    if (!topupReceipt) {
      toast.error(tr("wallet_error_receipt"));
      return;
    }
    setBusyTopup(true);
    try {
      const receiptUrl = await uploadImageToBucket(topupReceipt, "receipts");
      await walletTopup({
        amount,
        receiptUrl,
        method: topupMethod,
      });
      showSuccess(tr("wallet_topup_success"));
      setTopupAmount("");
      setTopupReceipt(null);
      setShowTopup(false);
      await qc.invalidateQueries({ queryKey: ["wallet"] });
    } catch (e) {
      showError(e);
    } finally {
      setBusyTopup(false);
    }
  };

  const submitWithdraw = async () => {
    const amount = Math.round(Number(withdrawAmount));
    if (!amount || amount < MIN_AMOUNT) {
      toast.error(tr("wallet_error_amount", { amount: MIN_AMOUNT }));
      return;
    }
    if (amount > summary.balance) {
      toast.error(tr("wallet_error_balance"));
      return;
    }
    setBusyWithdraw(true);
    try {
      await walletWithdraw({
        amount,
        method: withdrawMethod,
        note: withdrawNote.trim() || undefined,
      });
      showSuccess(tr("wallet_withdraw_success"));
      setWithdrawAmount("");
      setWithdrawNote("");
      setShowWithdraw(false);
      await qc.invalidateQueries({ queryKey: ["wallet"] });
    } catch (e) {
      showError(e);
    } finally {
      setBusyWithdraw(false);
    }
  };

  return (
    <>
      <SeoHead
        title={tr("wallet_title")}
        description={tr("wallet_description")}
        keywords={tr("wallet_keywords")}
        ogType="website"
      />
      <div className="mx-auto max-w-xl space-y-4 px-4 pb-6 pt-5">
        <PageHeader
          title={tr("wallet_title")}
          subtitle={tr("wallet_description")}
          back="/profile"
        />

        <aside
          id="wallet-preview-notice"
          role="note"
          className="flex items-start gap-3 rounded-[var(--radius-card)] border border-info/25 bg-info-soft px-4 py-3 text-start"
        >
          <Info className="mt-0.5 size-5 shrink-0 text-info" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-foreground">{tr("wallet_preview_title")}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {tr("wallet_preview_message")}
            </p>
          </div>
        </aside>

        {/* بطاقة الرصيد — تعرض الأرقام بعد تحميل بيانات Supabase فقط */}
        <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-primary p-5 text-primary-foreground  sm:p-6">
          <div className="pointer-events-none absolute -end-12 -top-16 size-44 rounded-full border-4 border-primary-foreground/10" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold opacity-80">{tr("wallet_balance")}</p>
              {txs.isLoading ? (
                <div
                  className="mt-3 h-10 w-40 animate-pulse rounded-lg bg-primary-foreground/10"
                  aria-label={tr("wallet_balance_loading")}
                />
              ) : txs.isError ? (
                <p className="mt-2 text-sm font-bold">{tr("wallet_balance_error")}</p>
              ) : (
                <p dir="ltr" className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                  {formatDA(summary.balance)}
                </p>
              )}
            </div>
            <span className="flex size-14 shrink-0 items-center justify-center rounded-[var(--radius-card)] bg-primary-foreground/20 ring-1 ring-primary-foreground/15">
              <Wallet className="size-7" strokeWidth={1.8} />
            </span>
          </div>
          <p className="relative mt-4 text-caption font-semibold opacity-75">
            {tr("wallet_balance_note")}
          </p>
          {!txs.isLoading && !txs.isError && (
            <div className="relative mt-4 grid grid-cols-2 gap-2 border-t border-primary-foreground/10 pt-3">
              <div className="rounded-[var(--radius-control)] bg-primary-foreground/5 px-3 py-2">
                <p className="text-caption font-bold opacity-70">{tr("wallet_pending_topups")}</p>
                <p dir="ltr" className="mt-1 text-sm font-extrabold">
                  {formatDA(pendingTopup)}
                </p>
              </div>
              <div className="rounded-[var(--radius-control)] bg-primary-foreground/5 px-3 py-2">
                <p className="text-caption font-bold opacity-70">{tr("wallet_pending_withdrawals")}</p>
                <p dir="ltr" className="mt-1 text-sm font-extrabold">
                  {formatDA(pendingWithdraw)}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* الخدمات المالية معطّلة حتى الإطلاق الرسمي */}
        <div className="grid grid-cols-2 gap-3" aria-describedby="wallet-preview-notice">
          <button type="button" disabled className="btn-primary cursor-not-allowed opacity-55">
            {tr("wallet_topup_soon")}
          </button>
          <button type="button" disabled className="btn-secondary cursor-not-allowed opacity-55">
            {tr("wallet_withdraw_soon")}
          </button>
        </div>

        {/* نموذج الشحن */}
        {showTopup && (
          <div className="animate-fade-up space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-4">
            <p className="text-sm font-extrabold text-foreground">{tr("wallet_topup_title")}</p>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">
                {tr("wallet_amount")}
              </label>
              <input
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder={tr("wallet_min_amount", { amount: MIN_AMOUNT })}
                dir="ltr"
                className="w-full rounded-[var(--radius-control)] border border-input bg-background px-3 py-2.5 text-start outline-none transition focus:ring-2 focus:ring-primary/30"
              />
              <div className="mt-2 flex gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setTopupAmount(String(p))}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                      topupAmount === String(p)
                        ? "border-accent-ink bg-primary text-accent-ink-foreground"
                        : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {p} {tr("wallet_currency")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">
                {tr("wallet_payment_method")}
              </label>
              <select
                value={topupMethod}
                onChange={(e) => setTopupMethod(e.target.value)}
                className="w-full rounded-[var(--radius-control)] border border-input bg-background px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-primary/30"
              >
                {METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {tr(m.label)}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-control)] border border-dashed border-border bg-background px-3 py-3 text-sm font-bold transition active:scale-[0.99]">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Upload className="size-4" />
                {topupReceipt ? tr("wallet_receipt_selected") : tr("wallet_receipt_attach")}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/heic,image/heif"
                className="hidden"
                onChange={(e) => setTopupReceipt(e.target.files?.[0] ?? null)}
              />
            </label>
            <button onClick={submitTopup} disabled={busyTopup} className="btn-primary w-full">
              {busyTopup ? tr("wallet_topup_sending") : tr("wallet_topup_submit")}
            </button>
          </div>
        )}

        {/* نموذج السحب */}
        {showWithdraw && (
          <div className="animate-fade-up space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-4">
            <p className="text-sm font-extrabold text-foreground">{tr("wallet_withdraw_title")}</p>
            <p className="text-caption font-semibold text-muted-foreground">
              {tr("wallet_available_withdraw", { amount: formatDA(summary.balance) })}
            </p>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">
                {tr("wallet_amount")}
              </label>
              <input
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder={tr("wallet_min_amount", { amount: MIN_AMOUNT })}
                dir="ltr"
                className="w-full rounded-[var(--radius-control)] border border-input bg-background px-3 py-2.5 text-start outline-none transition focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">
                {tr("wallet_payout_method")}
              </label>
              <select
                value={withdrawMethod}
                onChange={(e) => setWithdrawMethod(e.target.value)}
                className="w-full rounded-[var(--radius-control)] border border-input bg-background px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-primary/30"
              >
                {METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">
                {tr("wallet_account_details")}
              </label>
              <input
                value={withdrawNote}
                onChange={(e) => setWithdrawNote(e.target.value)}
                placeholder={tr("wallet_account_placeholder")}
                className="w-full rounded-[var(--radius-control)] border border-input bg-background px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button onClick={submitWithdraw} disabled={busyWithdraw} className="btn-primary w-full">
              {busyWithdraw ? tr("wallet_topup_sending") : tr("wallet_withdraw_submit")}
            </button>
          </div>
        )}

        {/* ملخص الحركة المالية من المعاملات المعتمدة فقط */}
        {!txs.isLoading && !txs.isError && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-card)] border border-border bg-card p-3.5">
              <div className="flex items-center gap-2 text-success">
                <ArrowDownLeft className="size-4" />
                <span className="text-caption font-bold text-muted-foreground">
                  {tr("wallet_total_topups")}
                </span>
              </div>
              <p dir="ltr" className="mt-2 text-base font-extrabold text-foreground">
                {formatDA(summary.totalTopup)}
              </p>
            </div>
            <div className="rounded-[var(--radius-card)] border border-border bg-card p-3.5">
              <div className="flex items-center gap-2 text-danger">
                <ArrowUpRight className="size-4" />
                <span className="text-caption font-bold text-muted-foreground">
                  {tr("wallet_total_withdrawals")}
                </span>
              </div>
              <p dir="ltr" className="mt-2 text-base font-extrabold text-foreground">
                {formatDA(summary.totalWithdraw)}
              </p>
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-[var(--radius-card)] border border-border bg-card px-4 py-3">
              <span className="text-xs font-bold text-muted-foreground">{tr("wallet_pending_count")}</span>
              <span className="text-sm font-extrabold text-foreground">{pendingCount}</span>
            </div>
          </div>
        )}

        {/* سجل المعاملات والفلاتر */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-foreground">{tr("wallet_transactions_title")}</h2>
            <p className="mt-0.5 text-caption text-muted-foreground">
              {tr("wallet_transactions_hint")}
            </p>
          </div>
          {!txs.isLoading && !txs.isError && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-caption font-bold text-muted-foreground">
              {filtered.length} {tr("wallet_transactions_count")}
            </span>
          )}
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
                tab === t.id
                  ? "border-accent-ink bg-primary text-accent-ink-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {tr(t.label)}
            </button>
          ))}
        </div>

        {txs.isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-[var(--radius-card)] border border-border bg-card"
              />
            ))}
          </div>
        )}

        {txs.isError && (
          <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger-soft p-4 text-center">
            <p className="text-sm font-bold text-foreground">{tr("wallet_error_load")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tr("wallet_error_network")}
            </p>
            <button onClick={() => void txs.refetch()} className="btn-secondary mt-3">
              {tr("wallet_retry")}
            </button>
          </div>
        )}

        {!txs.isLoading && !txs.isError && filtered.length === 0 && (
          <EmptyState
            Icon={Wallet}
            title={tab === "all" ? tr("wallet_empty_all") : tr("wallet_empty_filtered")}
            hint={tr("wallet_empty_hint")}
          />
        )}

        <div className="space-y-3">
          {filtered.map((t) => {
            const st = STATUS[t.status] ?? {
              label: t.status,
              cls: "bg-muted text-muted-foreground",
            };
            const meta = TYPE_META[t.type] ?? { label: t.type, icon: Wallet };
            const Icon = meta.icon;
            const date = formatDate(t.created_at, undefined, {
              day: "numeric",
              month: "long",
            });
            const time = formatTime(t.created_at);
            const methodKey = METHODS.find((m) => m.id === t.method)?.label;
            const methodLabel = methodKey ? tr(methodKey) : t.method;
            return (
              <div
                key={t.id}
                className="rounded-[var(--radius-card)] border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-card)]",
                      t.amount >= 0 ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{tr(meta.label)}</p>
                    <p className="truncate text-caption text-muted-foreground">
                      {date} · {time}
                      {methodLabel ? ` · ${methodLabel}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p
                      dir="ltr"
                      className={cn(
                        "text-sm font-extrabold",
                        t.amount >= 0 ? "text-success" : "text-danger",
                      )}
                    >
                      {t.amount >= 0 ? "+" : "−"}
                      {formatDA(Math.abs(t.amount))}
                    </p>
                    <span
                      className={cn(
                        "mt-1 inline-block rounded-full px-2 py-0.5 text-caption font-bold",
                        st.cls,
                      )}
                    >
                      {tr(st.label)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-caption text-muted-foreground">
                  <span>
                    {tr("wallet_transaction_id")}{" "}
                    <b dir="ltr" className="font-mono">
                      {t.id.slice(0, 8).toUpperCase()}
                    </b>
                  </span>
                  {methodLabel && <span>{methodLabel}</span>}
                </div>
                {t.note && (
                  <p className="mt-2 rounded-[var(--radius-control)] bg-background px-3 py-2 text-caption font-semibold text-muted-foreground">
                    {t.note}
                  </p>
                )}
                {t.receipt_url && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const url = await createReceiptSignedUrl(t.receipt_url!);
                        window.location.assign(url);
                      } catch (error) {
                        showError(error);
                      }
                    }}
                    className="mt-2 flex items-center gap-1.5 text-xs font-bold text-accent-ink"
                  >
                    <ReceiptText className="size-3.5" />
                    {tr("wallet_receipt_view")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
