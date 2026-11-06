import { useLocation, Link } from "@tanstack/react-router";
import { House, Search, ShoppingBag, UserRound } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const items = [
    { to: "/", labelKey: "home", Icon: House },
    { to: "/explore", labelKey: "explore", Icon: Search },
    { to: "/bag", labelKey: "cart", Icon: ShoppingBag },
    { to: "/profile", labelKey: "profile", Icon: UserRound },
  ];

  return (
    <nav aria-label={t("aria_main_nav")} className="app-bottom-nav">
      <div className="app-bottom-nav-inner gap-1">
        {items.map(({ to, labelKey, Icon }) => {
          const isActive =
            to === "/"
              ? pathname === "/"
              : pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              preload="intent"
              activeOptions={{ exact: to === "/" }}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "app-bottom-nav-link",
                isActive && "app-bottom-nav-link-active",
              )}
            >
              <span
                className={cn(
                  "app-bottom-nav-icon",
                  isActive && "app-bottom-nav-icon-active",
                )}
                aria-hidden="true"
              >
                <Icon className="size-[22px]" strokeWidth={2} />
              </span>
              <span className="w-full whitespace-normal text-center text-[11px] leading-4">{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
