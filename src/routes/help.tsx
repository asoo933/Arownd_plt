import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  BarChart3,
  Building2,
  Mail,
  ChevronDown,
  ClipboardCheck,
  LogIn,
  PackageCheck,
  PlusCircle,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Timer,
  Truck,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/sooqy/page-header";
import { SeoHead } from "@/components/seo/SeoHead";
import { translate, useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: translate("help_page_title") },
      {
        name: "description",
        content: translate("help_page_description"),
      },
      { property: "og:title", content: translate("help_page_title") },
      { property: "og:description", content: translate("help_og_description") },
    ],
  }),
  component: HelpPage,
});

type Tab = "user" | "merchant" | "delivery" | "faq";

function HelpPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("user");
  const tabs: { id: Tab; label: string }[] = [
    { id: "user", label: t("help_tab_user") },
    { id: "merchant", label: translate("help_tab_merchant") },
    { id: "delivery", label: translate("help_tab_delivery") },
    { id: "faq", label: translate("help_tab_faq") },
  ];
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-4 px-4 pt-5">
      <SeoHead
        title={translate("help_title")}
        description={translate("help_description")}
        alternates={{ ar: "/help", en: "/help" }}
      />
      <PageHeader title={t("help_header")} subtitle={t("help_subtitle")} />

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        role="tablist"
        aria-label={t("help_tabs_aria")}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "min-h-[var(--control-height)] rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              tab === t.id
                ? "bg-primary text-accent-ink-foreground "
                : "bg-card text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "user" && <UserSection />}
      {tab === "merchant" && <MerchantSection />}
      {tab === "delivery" && <DeliveryPartnerSection />}
      {tab === "faq" && <FaqSection open={open} onToggle={setOpen} t={t} />}

      <QuickLinks t={t} />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-card)] bg-card p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-accent-ink">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function UserSection() {
  return (
    <div className="space-y-3">
      <FeatureCard
        icon={<LogIn className="size-5" />}
        title={translate("help_user_login_title")}
        desc={translate("help_user_login_desc")}
      />
      <FeatureCard
        icon={<Timer className="size-5" />}
        title={translate("help_user_reserve_title")}
        desc={translate("help_user_reserve_desc")}
      />
      <FeatureCard
        icon={<PackageCheck className="size-5" />}
        title={translate("help_user_track_title")}
        desc={translate("help_user_track_desc")}
      />
      <FeatureCard
        icon={<Sparkles className="size-5" />}
        title={translate("help_user_merchant_title")}
        desc={translate("help_user_merchant_desc")}
      />
      <Link
        to="/profile"
        className="block min-h-[var(--control-height)] rounded-[var(--radius-pill)] bg-primary px-4 py-3 text-center text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 "
      >
        {translate("help_user_profile_link")}
      </Link>
    </div>
  );
}

function MerchantSection() {
  return (
    <div className="space-y-3">
      <FeatureCard
        icon={<Store className="size-5" />}
        title={translate("help_merchant_store_title")}
        desc={translate("help_merchant_store_desc")}
      />
      <FeatureCard
        icon={<PlusCircle className="size-5" />}
        title={translate("help_merchant_product_title")}
        desc={translate("help_merchant_product_desc")}
      />
      <FeatureCard
        icon={<RefreshCw className="size-5" />}
        title={translate("help_merchant_stock_title")}
        desc={translate("help_merchant_stock_desc")}
      />
      <FeatureCard
        icon={<ClipboardCheck className="size-5" />}
        title={translate("help_merchant_reservation_title")}
        desc={translate("help_merchant_reservation_desc")}
      />
      <FeatureCard
        icon={<Truck className="size-5" />}
        title={translate("help_merchant_orders_title")}
        desc={translate("help_merchant_orders_desc")}
      />
      <FeatureCard
        icon={<BarChart3 className="size-5" />}
        title={translate("help_merchant_stats_title")}
        desc={translate("help_merchant_stats_desc")}
      />
      <Link
        to="/studio"
        className="block rounded-2xl bg-primary py-3 text-center text-sm font-bold text-primary-foreground "
      >
        {translate("help_merchant_studio_link")}
      </Link>
    </div>
  );
}

function DeliveryPartnerSection() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fields = [
      [translate("help_field_company"), "company"],
      [translate("help_field_contact"), "contact"],
      [translate("help_field_phone"), "phone"],
      [translate("help_field_email"), "email"],
      [translate("help_field_coverage"), "coverage"],
      [translate("help_field_details"), "details"],
    ] as const;
    const body = fields
      .map(([label, name]) => `${label}: ${String(formData.get(name) ?? "").trim()}`)
      .join("\\n");
    const subject = encodeURIComponent(translate("help_delivery_subject"));
    window.location.href = `mailto:arownddz@gmail.com?subject=${subject}&body=${encodeURIComponent(body)}`;
  }

  const inputClass =
    "min-h-[var(--control-height)] w-full rounded-[var(--radius-control)] border border-input bg-background px-3 py-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <section className="space-y-4 rounded-[var(--radius-card)] bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-accent-ink">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-bold">{translate("help_delivery_title")}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {translate("help_delivery_intro")}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 p-3">
        <p className="text-sm font-semibold">{translate("help_delivery_how")}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {translate("help_delivery_steps")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold">{translate("help_delivery_company_label")}</span>
          <input
            name="company"
            required
            maxLength={120}
            className={inputClass}
            placeholder={translate("help_delivery_company_placeholder")}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold">{translate("help_delivery_contact_label")}</span>
          <input
            name="contact"
            required
            maxLength={100}
            className={inputClass}
            placeholder={translate("help_delivery_contact_placeholder")}
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold">{translate("help_delivery_phone_label")}</span>
            <input
              name="phone"
              dir="ltr"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              maxLength={30}
              className={inputClass}
              placeholder={translate("help_delivery_phone_placeholder")}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold">{translate("help_delivery_email_label")}</span>
            <input
              name="email"
              dir="ltr"
              type="email"
              autoComplete="email"
              required
              maxLength={160}
              className={inputClass}
              placeholder="company@example.com"
            />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold">{translate("help_delivery_coverage_label")}</span>
          <input
            name="coverage"
            required
            maxLength={300}
            className={inputClass}
            placeholder={translate("help_delivery_coverage_placeholder")}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold">{translate("help_delivery_details_label")}</span>
          <textarea
            name="details"
            rows={4}
            maxLength={1500}
            className={inputClass}
            placeholder={translate("help_delivery_details_placeholder")}
          />
        </label>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground "
        >
          <Mail className="size-4" />
          {translate("help_delivery_submit")}
        </button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        {translate("help_delivery_direct")}{" "}
        <a href="mailto:arownddz@gmail.com" className="font-semibold text-accent-ink underline">
          arownddz@gmail.com
        </a>
      </p>
      <p className="text-caption leading-relaxed text-muted-foreground">
        {translate("help_delivery_mail_note")}
      </p>
    </section>
  );
}

function getFaqs(t: (key: string) => string) {
  return [
  {
    q: t("help_faq_order_q"),
    a: t("help_faq_order_a"),
  },
  {
    q: t("help_faq_payment_q"),
    a: t("help_faq_payment_a"),
  },
  {
    q: t("help_faq_fee_q"),
    a: t("help_faq_fee_a"),
  },
  {
    q: t("help_faq_reserve_q"),
    a: t("help_faq_reserve_a"),
  },
  {
    q: t("help_faq_cancel_q"),
    a: t("help_faq_cancel_a"),
  },
  {
    q: t("help_faq_become_merchant_q"),
    a: t("help_faq_become_merchant_a"),
  },
  {
    q: t("help_faq_manage_q"),
    a: t("help_faq_manage_a"),
  },
  ];
}

function FaqSection({ open, onToggle, t }: { open: number | null; onToggle: (i: number) => void; t: (key: string) => string }) {
  return (
    <div className="space-y-2">
      {getFaqs(t).map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="overflow-hidden rounded-2xl bg-card ">
            <button
              onClick={() => onToggle(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 p-4 text-start"
            >
              <span className="text-sm font-bold">{f.q}</span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            {isOpen && (
              <div className="animate-fade-up px-4 pb-4">
                <p className="text-xs leading-relaxed text-muted-foreground">{f.a}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QuickLinks({ t }: { t: (key: string) => string }) {
  const links = [
    { to: "/profile", label: t("help_quick_profile"), icon: <User className="size-5" /> },
    { to: "/studio", label: t("help_quick_studio"), icon: <Store className="size-5" /> },
    { to: "/bag", label: t("help_quick_bag"), icon: <ShoppingBag className="size-5" /> },
    { to: "/explore", label: t("help_quick_search"), icon: <Search className="size-5" /> },
  ] as const;
  return (
    <div className="space-y-2">
      <h2 className="font-bold">{t("help_quick_heading")}</h2>
      <div className="grid grid-cols-2 gap-2">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="flex items-center gap-2 rounded-2xl bg-card p-3 text-sm font-bold "
          >
            <span className="text-accent-ink">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
