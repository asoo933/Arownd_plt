import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { fetchMyStore, merchantCreateStore } from "@/lib/sooqy";
import { translate, useTranslation } from "@/lib/i18n";
import { PageHeader } from "@/components/sooqy/page-header";
import { ErrorState } from "@/components/sooqy/error-state";
import { DashboardLoadingSkeleton } from "@/components/sooqy/skeleton";
import {
  MerchantOnboarding,
  type StoreForm,
  defaultStoreForm,
} from "@/components/sooqy/merchant-onboarding";

export const Route = createFileRoute("/create-store")({
  head: () => ({ meta: [{ title: translate("create_store_seo_title") }] }),
  component: CreateStorePage,
});

function CreateStorePage() {
  const { user, ready } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<StoreForm>(defaultStoreForm());
  // من لديه متجر بالفعل لا يُنشئ آخر بالخطأ — نوجّهه إلى الاستوديو
  const myStore = useQuery({ queryKey: ["my-store"], queryFn: fetchMyStore, enabled: !!user });
  useEffect(() => {
    if (myStore.data) void navigate({ to: "/studio", replace: true });
  }, [myStore.data, navigate]);

  if (!ready) return null;
  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-6 pt-4">
        <PageHeader title={t("create_store_title")} back="/settings" />
        <div className="mt-6 rounded-[var(--radius-card)] border border-border bg-card p-6 text-center">
          <p className="text-body text-muted-foreground">{t("create_store_login_hint")}</p>
          <Link
            to="/auth"
            search={{ redirect: "/create-store" }}
            className="btn-primary mt-4 w-full"
          >
            {t("create_store_login_action")}
          </Link>
        </div>
      </div>
    );
  }

  if (myStore.isLoading) {
    return <DashboardLoadingSkeleton cards={1} />;
  }

  if (myStore.isError) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-6">
        <PageHeader title={t("create_store_title")} back="/settings" />
        <ErrorState
          scope="create-store:existing-store"
          error={myStore.error}
          onRetry={() => myStore.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t("create_store_title")} subtitle={t("create_store_subtitle")} back="/settings" />
      <MerchantOnboarding
        onSubmit={async (input) => {
          await merchantCreateStore(input);
          await qc.invalidateQueries({ queryKey: ["my-store"] });
          await qc.invalidateQueries({ queryKey: ["my-roles"] });
          await qc.invalidateQueries({ queryKey: ["my-account-type"] });
          navigate({ to: "/studio" });
        }}
        form={form}
        setForm={setForm}
      />
    </div>
  );
}
