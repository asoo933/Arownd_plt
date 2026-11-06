import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/sooqy/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { showError } from "@/lib/feedback";
import { translate, useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/delete-account")({
  head: () => ({ meta: [{ title: translate("delete_seo_title") }] }),
  component: DeleteAccountPage,
});

type DeletionRequest = {
  id: string;
  status: "pending" | "under_review" | "blocked" | "completed" | "rejected";
  requested_at: string;
  updated_at: string;
  resolved_at: string | null;
  retention_note: string | null;
};

const statusLabels: Record<DeletionRequest["status"], string> = {
  pending: "delete_status_pending",
  under_review: "delete_status_under_review",
  blocked: "delete_status_blocked",
  completed: "delete_status_completed",
  rejected: "delete_status_rejected",
};

function DeleteAccountPage() {
  const { user, ready } = useAuth();
  const { t, lang } = useTranslation();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const requests = useQuery({
    queryKey: ["account-deletion-requests", user?.id],
    enabled: !!user,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_deletion_requests")
        .select("id,status,requested_at,updated_at,resolved_at,retention_note")
        .eq("user_id", user!.id)
        .order("requested_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as DeletionRequest[];
    },
  });

  const submitRequest = async () => {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("request_account_deletion");
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["account-deletion-requests", user.id] });
      toast.success(t("delete_success"));
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const hasOpenRequest = requests.data?.some((request) =>
    ["pending", "under_review", "blocked"].includes(request.status),
  );

  const cancelRequest = async (requestId: string) => {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("cancel_account_deletion_request", {
        _request_id: requestId,
      });
      if (error) throw error;
      if (!data) throw new Error(t("delete_cancel_error"));
      await queryClient.invalidateQueries({ queryKey: ["account-deletion-requests", user.id] });
      toast.success(t("delete_cancel_success"));
    } catch (error) {
      showError(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-page mx-auto max-w-xl space-y-5 pb-8 pt-4">
      <PageHeader title={t("delete_title")} subtitle={t("delete_subtitle")} back="/settings" />

      <section className="rounded-[var(--radius-card)] border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Trash2 className="size-5" />
          </span>
          <div>
            <h2 className="font-bold text-foreground">{t("delete_intro_title")}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t("delete_intro")}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-muted/60 p-3 text-sm leading-6 text-muted-foreground">
          <p className="font-semibold text-foreground">{t("delete_before_submit")}</p>
          <ul className="mt-2 list-disc space-y-1 ps-5">
            <li>{t("delete_warning_immediate")}</li>
            <li>{t("delete_warning_pending")}</li>
            <li>{t("delete_warning_records")}</li>
            <li>{t("delete_warning_password")}</li>
          </ul>
          <Link to="/privacy" className="mt-2 inline-flex font-bold text-accent-ink">
            {t("delete_privacy_link")}
          </Link>
        </div>
      </section>

      {!ready ? (
        <p className="text-sm text-muted-foreground">{t("delete_auth_check")}</p>
      ) : !user ? (
        <section className="rounded-[var(--radius-card)] border border-border bg-card p-4">
          <p className="text-sm leading-6 text-muted-foreground">
            {t("delete_login_hint")}
          </p>
          <Link to="/auth" className="btn-primary mt-4 inline-flex w-full justify-center">
            {t("delete_login_action")}
          </Link>
          <a
            href="mailto:arownddz@gmail.com?subject=%D8%B7%D9%84%D8%A8%20%D8%AD%D8%B0%D9%81%20%D8%AD%D8%B3%D8%A7%D8%A8%20Arownd"
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border px-4 text-sm font-bold text-foreground"
          >
            {t("delete_support_login")}
          </a>
        </section>
      ) : (
        <>
          <section className="rounded-[var(--radius-card)] border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{t("delete_account_label")}</p>
            <p className="mt-1 font-semibold text-foreground" dir="ltr">{user.email}</p>
            <button
              type="button"
              onClick={() => void submitRequest()}
              disabled={submitting || requests.isLoading || !!requests.error || !!hasOpenRequest}
              className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? t("delete_submitting") : hasOpenRequest ? t("delete_open_request") : t("delete_submit")}
            </button>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {t("delete_submit_note")}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-bold text-foreground">{t("delete_requests_title")}</h2>
            {requests.isLoading ? (
              <p className="text-sm text-muted-foreground">{t("delete_loading")}</p>
            ) : requests.error ? (
              <div className="space-y-3 rounded-xl border border-destructive/30 p-3 text-sm">
                <div className="flex items-start gap-2 text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{t("delete_service_unavailable")}</span>
                </div>
                <a href="mailto:arownddz@gmail.com?subject=%D8%B7%D9%84%D8%A8%20%D8%AD%D8%B0%D9%81%20%D8%AD%D8%B3%D8%A7%D8%A8%20Arownd" className="inline-flex min-h-10 items-center font-bold text-accent-ink underline">
                  {t("delete_support_submit")}
                </a>
              </div>
            ) : requests.data?.length ? (
              requests.data.map((request) => (
                <article key={request.id} className="rounded-[var(--radius-card)] border border-border bg-card p-4">
                  <div className="flex items-center gap-2">
                    {request.status === "completed" ? (
                      <CheckCircle2 className="size-4 text-green-600" />
                    ) : (
                      <Clock3 className="size-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-foreground">{t(statusLabels[request.status])}</span>
                    <span className="ms-auto text-xs text-muted-foreground">
                      {new Date(request.requested_at).toLocaleDateString(lang === "ar" ? "ar-DZ" : "en-DZ")}
                    </span>
                  </div>
                  {request.retention_note && (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{request.retention_note}</p>
                  )}
                  {["pending", "under_review", "blocked"].includes(request.status) && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void cancelRequest(request.id)}
                      className="btn-secondary mt-3 w-full disabled:opacity-50"
                    >
                      {submitting ? t("delete_executing") : t("delete_cancel")}
                    </button>
                  )}
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                {t("delete_empty")}
              </p>
            )}
          </section>
        </>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        {t("delete_contact")} arownddz@gmail.com
      </p>
    </div>
  );
}
