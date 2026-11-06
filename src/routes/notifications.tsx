import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Lock,
  Package,
  Tag,
  CalendarCheck,
  Info,
  Trash2,
  CheckCircle2,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import {
  fetchMyNotifications,
  markNotificationsRead,
  markNotificationRead,
  deleteNotification,
  fetchUnreadNotificationCount,
} from "@/lib/sooqy";
import { formatDateTime } from "@/lib/market";
import { EmptyState } from "@/components/sooqy/empty-state";
import { ErrorState } from "@/components/sooqy/error-state";
import { cn } from "@/lib/utils";
import { SeoHead } from "@/components/seo/SeoHead";
import { PageHeader } from "@/components/sooqy/page-header";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { showError, showSuccess } from "@/lib/feedback";
import { ConfirmDialog } from "@/components/sooqy/confirm-dialog";
import { filterNotifications, groupNotificationsByDate, type NotificationFilter } from "@/lib/notification-filters";

export const Route = createFileRoute("/notifications")({
  head: () => ({}),
  component: NotificationsPage,
});

const TYPE_ICON = {
  order: Package,
  offer: Tag,
  reservation: CalendarCheck,
  system: Info,
  info: Info,
} as const;

const DATE_GROUP_LABELS = {
  today: "notifications_group_today",
  yesterday: "notifications_group_yesterday",
  older: "notifications_group_older",
} as const;

const TYPE_TONE = {
  order: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  offer: "bg-lime-500/15 text-lime-800 dark:text-lime-300",
  reservation: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  system: "bg-muted text-muted-foreground",
  info: "bg-muted text-muted-foreground",
} as const;

type NotificationData = {
  order_id?: string;
  merchant_order_id?: string;
  recipient_role?: "customer" | "merchant";
  reservation_id?: string;
  offer_id?: string;
  store_id?: string;
  product_id?: string;
  status?: string;
  [key: string]: unknown;
};

function navigateForNotification(
  navigate: ReturnType<typeof useNavigate>,
  n: { type: string; data: NotificationData },
) {
  const d = n.data as NotificationData;
  switch (n.type) {
    case "order":
      if (d.order_id && d.recipient_role === "merchant") {
        navigate({ to: "/studio/orders/$orderId", params: { orderId: d.order_id } });
      } else if (d.order_id) {
        navigate({ to: "/orders/$orderId", params: { orderId: d.order_id } });
      } else {
        navigate({ to: "/orders" });
      }
      break;
    case "reservation":
      // رقم الحجز ليس رقم طلب: نفتح المنتج أو المتجر إن توفّرا، وإلا قائمة الطلبات
      if (d.product_id)
        navigate({ to: "/products/$productId", params: { productId: d.product_id } });
      else if (d.store_id) navigate({ to: "/stores/$storeId", params: { storeId: d.store_id } });
      else navigate({ to: "/orders" });
      break;
    case "offer": {
      const productId = d.product_id ?? d.offer_id;
      if (productId) navigate({ to: "/products/$productId", params: { productId } });
      else if (d.store_id) navigate({ to: "/stores/$storeId", params: { storeId: d.store_id } });
      else navigate({ to: "/" });
      break;
    }
    case "system":
    case "info":
    default:
      // لا يوجد توجيه افتراضي للإشعارات العامة
      break;
  }
}

function NotificationsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const q = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchMyNotifications,
    enabled: !!user,
  });
  const unreadCount = useQuery({
    queryKey: ["unread-notification-count", user?.id],
    queryFn: fetchUnreadNotificationCount,
    enabled: !!user,
  });
  const filteredNotifications = filterNotifications(q.data ?? [], filter);

  // تحديثات حية: إشعارات جديدة (Supabase Realtime)
  useRealtimeSubscription({
    table: "notifications",
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    queryKeys: [["notifications"], ["unread-notification-count"]],
    enabled: !!user,
  });

  const markAll = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await markNotificationsRead();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["notifications"] }),
        qc.invalidateQueries({ queryKey: ["unread-notification-count"] }),
      ]);
    } catch (error) {
      showError(error);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    if (markingId === id) return;
    setMarkingId(id);
    try {
      await markNotificationRead(id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["notifications"] }),
        qc.invalidateQueries({ queryKey: ["unread-notification-count"] }),
      ]);
    } catch (error) {
      showError(error);
    } finally {
      setMarkingId(null);
    }
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId || deletingId) return;
    setDeletingId(pendingDeleteId);
    try {
      await deleteNotification(pendingDeleteId);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["notifications"] }),
        qc.invalidateQueries({ queryKey: ["unread-notification-count"] }),
      ]);
      setPendingDeleteId(null);
      showSuccess(t("notifications_deleted"));
    } catch (error) {
      showError(error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClick = (n: { type: string; data: unknown; read: boolean; id: string }) => {
    if (!n.read) handleMarkRead(n.id);
    navigateForNotification(navigate, { type: n.type, data: n.data as NotificationData });
  };

  return (
    <>
      <SeoHead
        title={t("notifications_title")}
        description={t("notifications_description")}
        keywords={t("notifications_keywords")}
        ogType="website"
      />
      <div className="px-4 pb-6 pt-4">
        <PageHeader
          title={t("notifications_title")}
          back="/profile"
          action={
            q.data && (unreadCount.data ?? q.data.some((n) => !n.read)) ? (
              <button
                type="button"
                onClick={() => void markAll()}
                disabled={markingAll}
                className="min-h-11 px-2 text-sm font-bold text-accent-ink disabled:opacity-50"
              >
                {markingAll ? t("notifications_marking_all") : t("notifications_mark_all")}
              </button>
            ) : undefined
          }
        />

        {user && q.data && q.data.length > 0 && (unreadCount.data ?? 0) > 0 && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary-soft/50 p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Bell className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground">
                {t("notifications_filter_unread")}
              </p>
              <p className="mt-0.5 text-xl font-extrabold tabular-nums text-foreground">
                {unreadCount.data}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className="min-h-10 rounded-xl bg-card px-3 text-xs font-bold text-accent-ink shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("notifications_filter_unread")}
            </button>
          </div>
        )}

        {!user && (
          <EmptyState
            Icon={Lock}
            title={t("notifications_login_title")}
            hint={t("notifications_login_hint")}
            action={
              <Link to="/auth" className="btn-small">
                {t("notifications_login_action")}
              </Link>
            }
          />
        )}

        {user && q.isLoading && (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        )}

        {user && q.isError && (
          <ErrorState scope="notifications" error={q.error} onRetry={() => void q.refetch()} />
        )}

        {user && q.data && q.data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="flex size-20 items-center justify-center rounded-3xl bg-primary-soft">
              <Bell className="size-9 text-accent-ink" strokeWidth={1.6} />
            </span>
            <h2 className="mt-5 text-h3 text-foreground">{t("notifications_empty_title")}</h2>
            <p className="mt-2 max-w-xs text-body text-muted-foreground">
              {t("notifications_empty_hint")}
            </p>
            <Link to="/" className="btn-small mt-6">
              {t("notifications_browse")}
            </Link>
          </div>
        )}


        {user && q.data && q.data.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t("notifications_title")}>
            {([
              ["all", "notifications_filter_all"],
              ["unread", "notifications_filter_unread"],
              ["orders", "notifications_filter_orders"],
              ["offers", "notifications_filter_offers"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={cn(
                  "min-h-11 shrink-0 rounded-full border px-4 text-xs font-bold transition-all duration-200",
                  filter === value
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary-soft/40",
                )}
              >
                {t(label)}
                {value === "unread" && (unreadCount.data ?? 0) > 0 ? (
                  <span className="ms-1.5 tabular-nums">({unreadCount.data})</span>
                ) : null}
              </button>
            ))}
          </div>
        )}

        {user && q.data && q.data.length > 0 && filteredNotifications.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t("notifications_filter_empty")}
          </p>
        )}

        {user && q.data && q.data.length > 0 && (
          <div className="space-y-5 py-4">
            {groupNotificationsByDate(filteredNotifications).map((group) => (
              <section key={group.key} className="space-y-2">
                <h2 className="px-1 text-xs font-bold text-muted-foreground">
                  {t(DATE_GROUP_LABELS[group.key])}
                </h2>
                <div className="space-y-2">
                  {group.items.map((n) => {
              const Icon = TYPE_ICON[n.type as keyof typeof TYPE_ICON] ?? Info;
              const isExpanded = expandedId === n.id;
              const open = () => handleClick(n);

              return (
                <div
                  key={n.id}
                  className={cn(
                    "group/notif relative overflow-hidden rounded-2xl border bg-card p-3 shadow-none transition-all duration-200 hover:border-primary/35 hover:shadow-sm",
                    !n.read && "border-s-4 border-s-primary border-y-primary/30 border-e-primary/30 bg-primary-soft/35",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl",
                        TYPE_TONE[n.type as keyof typeof TYPE_TONE] ?? "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={open}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          open();
                        }
                      }}
                      className="min-w-0 flex-1 cursor-pointer text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <p className="flex items-start gap-2 text-sm font-bold leading-6 text-foreground">
                        <span className="min-w-0 flex-1">{n.title}</span>
                        {!n.read && (
                          <span
                            className="mt-2 size-2 shrink-0 rounded-full bg-primary ring-4 ring-primary/10"
                            aria-label={t("notifications_unread")}
                          />
                        )}
                      </p>
                      {n.body && (
                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-2 text-[11px] font-medium tabular-nums text-muted-foreground/80">
                        {formatDateTime(n.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : n.id)}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? t("notifications_hide_options") : t("notifications_show_options")}
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <MoreHorizontal className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/70 pt-3">
                      {!n.read ? (
                        <button
                          type="button"
                          onClick={() => void handleMarkRead(n.id)}
                          disabled={markingId === n.id}
                          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary-soft text-xs font-bold text-accent-ink transition-colors hover:bg-primary/20 disabled:opacity-50"
                        >
                          {markingId === n.id ? (
                            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <CheckCircle2 className="size-4" aria-hidden="true" />
                          )}
                          {t("notifications_mark_read")}
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(n.id)}
                        disabled={deletingId === n.id}
                        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-danger-soft text-xs font-bold text-danger transition-colors hover:bg-danger/15 disabled:opacity-50"
                      >
                        {deletingId === n.id ? (
                          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Trash2 className="size-4" aria-hidden="true" />
                        )}
                        {t("notifications_delete")}
                      </button>
                    </div>
                  )}
                </div>
              );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title={t("notifications_delete_confirm_title")}
        message={t("notifications_delete_confirm_message")}
        confirmLabel={t("notifications_delete_confirm_action")}
        busy={deletingId !== null}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDeleteId(null)}
      />
    </>
  );
}
