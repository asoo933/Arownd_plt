export type CustomerTab = "home" | "explore" | "stores" | "favorites" | "profile";

export function getCustomerTab(pathname: string): CustomerTab | null {
  if (pathname === "/home" || pathname === "/") return "home";
  if (pathname === "/explore" || pathname.startsWith("/product/")) return "explore";
  if (pathname === "/stores" || pathname.startsWith("/store/")) return "stores";
  if (pathname === "/favorites") return "favorites";
  if (
    pathname === "/profile" ||
    pathname === "/settings" ||
    pathname === "/delivery-profile" ||
    pathname === "/orders" ||
    pathname.startsWith("/orders/")
  ) return "profile";
  if (pathname === "/checkout") return null;
  return null;
}
