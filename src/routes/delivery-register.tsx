import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Truck } from "lucide-react";
import { toast } from "sonner";
import { showError, showSuccess } from "@/lib/feedback";
import { useAuth } from "@/lib/auth";
import { translate, useTranslation } from "@/lib/i18n";
import { registerDeliveryCompany } from "@/lib/delivery";
import type { Database } from "@/integrations/supabase/types";
import { PageHeader } from "@/components/sooqy/page-header";
import { cn } from "@/lib/utils";
import { normalizePhone } from "@/lib/sooqy";

export const Route = createFileRoute("/delivery-register")({
  head: () => ({
    meta: [
      { title: translate("delivery_register_title") + " — Arownd" },
      {
        name: "description",
        content:
          translate("delivery_register_description"),
      },
    ],
  }),
  component: DeliveryRegisterPage,
});

function DeliveryRegisterPage() {
  const { user, ready } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  if (!ready) return null;

  if (!user) {
    return (
      <div className="space-y-4 px-4 pt-16 text-center">
        <Truck className="mx-auto size-12 text-accent-ink" />
        <h1 className="text-2xl font-bold">{t("delivery_register_login_title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("delivery_register_login_hint")}
        </p>
        <Link
          to="/auth"
          search={{ redirect: "/delivery-register" }}
          className="inline-flex min-h-[var(--control-height)] items-center justify-center rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground"
        >
          {t("delivery_login_action")}
        </Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || busy) return;
    if (!companyName.trim() || !contactPhone.trim()) {
      toast.error(t("delivery_registration_required"));
      return;
    }
    // شركة التوصيل قد تسجّل هاتفًا ثابتًا (021…) أو جوالًا: نقبل 9–10 أرقام تبدأ بـ 0
    if (!/^0\d{8,9}$/.test(normalizePhone(contactPhone.trim()))) {
      toast.error(t("delivery_registration_phone_invalid"));
      return;
    }
    setBusy(true);
    try {
      const payload: Database["public"]["Tables"]["delivery_companies"]["Insert"] = {
        user_id: user.id,
        company_name: companyName.trim(),
        contact_phone: normalizePhone(contactPhone.trim()),
        ...(contactName.trim() ? { contact_name: contactName.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(licenseNumber.trim() ? { license_number: licenseNumber.trim() } : {}),
      };
      await registerDeliveryCompany(payload);
      showSuccess(t("delivery_registration_success"));
      navigate({ to: "/", replace: true });
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-3 sm:space-y-5 sm:pt-5">
      <PageHeader title={t("delivery_register_title")} subtitle={t("delivery_register_join")} back="/" />

      <section className="space-y-4 rounded-[var(--radius-card)] border border-border bg-card p-3.5 sm:p-5">
        <div className="flex items-center gap-2">
          <Truck className="size-5 text-accent-ink" />
          <h2 className="font-bold">{t("delivery_company_details")}</h2>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder={t("delivery_company_name")}
            aria-label={t("delivery_company_name")}
            autoComplete="organization"
            className="h-12 w-full rounded-[var(--radius-control)] border border-input bg-background px-3 text-start outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder={t("delivery_contact_name_optional")}
            aria-label={t("delivery_contact_name_optional")}
            autoComplete="name"
            className="h-[var(--control-height)] w-full rounded-[var(--radius-control)] border border-input bg-background px-3 text-start outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <input
            required
            type="tel"
            dir="ltr"
            inputMode="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder={t("delivery_company_phone_required")}
            aria-label={t("delivery_company_phone_required")}
            autoComplete="tel"
            className="h-[var(--control-height)] w-full rounded-[var(--radius-control)] border border-input bg-background px-3 text-start outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <input
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("delivery_company_email_optional")}
            aria-label={t("delivery_company_email_optional")}
            autoComplete="email"
            className="h-[var(--control-height)] w-full rounded-[var(--radius-control)] border border-input bg-background px-3 text-start outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <input
            dir="ltr"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            placeholder={t("delivery_license_optional")}
            aria-label={t("delivery_license_optional")}
            className="h-[var(--control-height)] w-full rounded-[var(--radius-control)] border border-input bg-background px-3 text-start outline-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />

          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("delivery_registration_review_note")}
          </p>

          <button
            type="submit"
            disabled={busy}
            className={cn(
              "w-full bg-primary min-h-[var(--control-height)] rounded-full px-6 py-3 font-bold text-primary-foreground transition disabled:opacity-50",
              busy && "cursor-not-allowed",
            )}
          >
            {busy ? t("delivery_registration_submitting") : t("delivery_registration_submit")}
          </button>
        </form>
      </section>

      <div className="text-center text-xs text-muted-foreground">
        {t("delivery_existing_account")}{" "}
        <Link to="/" className="text-accent-ink font-bold hover:underline">
          {t("delivery_back_home")}
        </Link>
      </div>
    </div>
  );
}
