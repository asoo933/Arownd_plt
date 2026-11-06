import { Link, useLocation } from "@tanstack/react-router";
import { House, Plus, Store, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchMyStore } from "@/lib/sooqy";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function StudioNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const store = useQuery({
    queryKey: ["my-store"],
    queryFn: fetchMyStore,
    enabled: !!user,
  });
  const currentPath = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const isStoreActive = !!store.data?.id && currentPath === `/stores/${store.data.id}`;

  const navClass = (active: boolean) =>
    cn("app-bottom-nav-link", active && "app-bottom-nav-link-active");
  const iconClass = (active: boolean) =>
    cn("app-bottom-nav-icon", active && "app-bottom-nav-icon-active");

  return (
    <nav aria-label={t("studio_nav_aria")} className="app-bottom-nav">
      <div className="app-bottom-nav-inner gap-1">
        <Link
          to="/studio"
          aria-current={currentPath === "/studio" ? "page" : undefined}
          className={navClass(currentPath === "/studio")}
        >
          <span className={iconClass(currentPath === "/studio")} aria-hidden="true">
            <House className="size-[22px] shrink-0" strokeWidth={2} />
          </span>
          <span className="w-full truncate text-center">{t("home")}</span>
        </Link>
        <Link
          to="/studio/add-product"
          aria-label={t("studio_nav_add_product")}
          aria-current={currentPath === "/studio/add-product" ? "page" : undefined}
          className={navClass(currentPath === "/studio/add-product")}
        >
          <span className={iconClass(currentPath === "/studio/add-product")} aria-hidden="true">
            <Plus className="size-5 shrink-0" />
          </span>
          <span className="w-full truncate text-center">{t("studio_nav_add_product")}</span>
        </Link>
        {store.data?.id ? (
          <Link
            to="/stores/$storeId"
            params={{ storeId: store.data.id }}
            aria-current={isStoreActive ? "page" : undefined}
            className={navClass(isStoreActive)}
          >
            <span className={iconClass(isStoreActive)} aria-hidden="true">
              <Store className="size-5 shrink-0" />
            </span>
            <span className="w-full truncate text-center">{t("studio_nav_store")}</span>
          </Link>
        ) : (
          <Link
            to="/studio"
            aria-current={currentPath === "/studio" ? "page" : undefined}
            className={navClass(currentPath === "/studio")}
          >
            <span className={iconClass(currentPath === "/studio")} aria-hidden="true">
              <Store className="size-5 shrink-0" />
            </span>
            <span className="w-full truncate text-center">{t("studio_nav_store")}</span>
          </Link>
        )}
        <Link
          to="/profile"
          aria-current={currentPath === "/profile" ? "page" : undefined}
          className={navClass(currentPath === "/profile")}
        >
          <span className={iconClass(currentPath === "/profile")} aria-hidden="true">
            <UserRound className="size-[22px] shrink-0" strokeWidth={2} />
          </span>
          <span className="w-full truncate text-center">{t("profile")}</span>
        </Link>
      </div>
    </nav>
  );
}
