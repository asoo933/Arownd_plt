import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Compass, MapPin, Store, Truck, ShoppingBag, Eye, Users, Heart } from "lucide-react";
import { PageHeader } from "@/components/sooqy/page-header";
import { SeoHead } from "@/components/seo/SeoHead";
import { translate, useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-extrabold">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function Item({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 rounded-[var(--radius-card)] border border-border/60 bg-card p-4 ">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary-soft text-accent-ink">
        {icon}
      </div>
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function AboutPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-24">
      <SeoHead
        title={translate("about_title")}
        description={translate("about_description")}
        alternates={{ ar: "/about", en: "/about" }}
      />
      <PageHeader title={t("about_header")} back="/" />

      <div className="mb-8 rounded-[var(--radius-card)] bg-primary p-6 text-center text-primary-foreground ">
        <Store className="mx-auto mb-3 size-12" />
        <h1 className="text-2xl font-extrabold">{t("about_hero_heading")}</h1>
        <p className="mt-2 text-sm opacity-85">{t("about_hero_subheading")}</p>
      </div>

      <Section title={t("about_who_heading")}>
        <p>
          {t("about_who_first")}
        </p>
        <p>
          {t("about_who_second")}
        </p>
      </Section>

      <Section title={t("about_offers_heading")}>
        <Item
          icon={<Compass className="size-5" />}
          title={t("about_discover_heading")}
          desc={t("about_discover_description")}
        />
        <Item
          icon={<MapPin className="size-5" />}
          title={t("about_map_heading")}
          desc={t("about_map_description")}
        />
        <Item
          icon={<Store className="size-5" />}
          title={t("about_merchant_heading")}
          desc={t("about_merchant_description")}
        />
        <Item
          icon={<ShoppingBag className="size-5" />}
          title={t("about_order_heading")}
          desc={t("about_order_description")}
        />
        <Item
          icon={<Truck className="size-5" />}
          title={t("about_delivery_heading")}
          desc={t("about_delivery_description")}
        />
      </Section>

      <Section title={t("about_vision_heading")}>
        <p>
          {t("about_vision_description")}
        </p>
      </Section>

      <Section title={t("about_audience_heading")}>
        <Item
          icon={<Eye className="size-5" />}
          title={t("about_buyers_heading")}
          desc={t("about_buyers_description")}
        />
        <Item
          icon={<Store className="size-5" />}
          title={t("about_stores_heading")}
          desc={t("about_stores_description")}
        />
        <Item
          icon={<ShoppingBag className="size-5" />}
          title={t("about_projects_heading")}
          desc={t("about_projects_description")}
        />
        <Item
          icon={<Truck className="size-5" />}
          title={t("about_delivery_partners_heading")}
          desc={t("about_delivery_partners_description")}
        />
      </Section>

      <Section title={t("about_commitment_heading")}>
        <p>
          {t("about_commitment_description")}
        </p>
      </Section>

      <div className="mt-10 rounded-[var(--radius-card)] border border-border/60 bg-card p-6 text-center ">
        <Heart className="mx-auto mb-3 size-8 text-accent-ink" />
        <p className="text-lg font-extrabold">{t("about_footer_heading")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("about_footer_subheading")}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Link to="/terms" className="btn-secondary w-full">
          {t("about_terms_link")}
        </Link>
        <Link to="/privacy" className="btn-secondary w-full">
          {t("about_privacy_link")}
        </Link>
      </div>
    </div>
  );
}
