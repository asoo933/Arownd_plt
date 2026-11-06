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
import { filterNotifications, type NotificationFilter } from "@/lib/notification-filters";

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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteNotification(id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["notifications"] }),
        qc.invalidateQueries({ queryKey: ["unread-notification-count"] }),
      ]);
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
                  "min-h-10 shrink-0 rounded-full border px-4 text-xs font-bold transition-colors",
                  filter === value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:bg-muted",
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
          <div className="space-y-2 py-4">
            {filteredNotifications.map((n) => {
              const Icon = TYPE_ICON[n.type as keyof typeof TYPE_ICON] ?? Info;
              const isExpanded = expandedId === n.id;
              const open = () => handleClick(n);

              return (
                <div
                  key={n.id}
                  className={cn(
                    "card-premium !shadow-none p-3",
                    !n.read && "!border-accent-ink/30 bg-primary-soft/40",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-accent-ink-soft-foreground">
                      <Icon className="size-4" aria-hidden="true" />
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
                      <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                        {n.title}
                        {!n.read && (
                          <span
                            className="size-2 shrink-0 rounded-full bg-primary"
                            aria-label={t("notifications_unread")}
                          />
                        )}
                      </p>
                      {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                      <p className="mt-1 text-caption text-muted-foreground">
                        {formatDateTime(n.created_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : n.id)}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? t("notifications_hide_options") : t("notifications_show_options")}
                      className="icon-btn shrink-0"
                    >
                      <MoreHorizontal className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2">
                      {!n.read ? (
                        <button
                          type="button"
                          onClick={() => void handleMarkRead(n.id)}
                          disabled={markingId === n.id}
                          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary-soft text-xs font-bold text-accent-ink disabled:opacity-50"
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
                        onClick={(e) => void handleDelete(n.id, e)}
                        disabled={deletingId === n.id}
                        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-danger-soft text-xs font-bold text-danger disabled:opacity-50"
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
        )}
      </div>
    </>
  );
}
