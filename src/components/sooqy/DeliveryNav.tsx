import { Link, useLocation } from "@tanstack/react-router";
import { Gauge, Home, User } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function DeliveryNav() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const items = [
    { to: "/delivery-dashboard", key: "delivery_dashboard", Icon: Gauge },
    { to: "/", key: "delivery_nav_home", Icon: Home },
    { to: "/profile", key: "profile", Icon: User },
  ];

  return (
    <nav aria-label={t("delivery_dashboard")} className="app-bottom-nav">
      <div className="app-bottom-nav-inner gap-1">
        {items.map(({ to, key, Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              preload="intent"
              aria-current={active ? "page" : undefined}
              className={cn("app-bottom-nav-link", active && "app-bottom-nav-link-active")}
            >
              <span
                className={cn("app-bottom-nav-icon", active && "app-bottom-nav-icon-active")}
                aria-hidden="true"
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.9} />
              </span>
              <span className="w-full truncate text-center">{t(key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
