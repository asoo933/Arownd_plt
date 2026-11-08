export type CustomerTab = "home" | "explore" | "favorites" | "profile" | "none";

export function getCustomerTab(pathname: string): CustomerTab | null {
  if (pathname === "/home" || pathname === "/") return "home";
  if (pathname === "/explore" || pathname.startsWith("/product/")) return "explore";
  if (pathname === "/stores" || pathname.startsWith("/store/")) return "none";
  if (pathname === "/favorites") return "favorites";
  if (
    pathname === "/profile" ||
    pathname === "/settings" ||
    pathname === "/delivery-profile" ||
    pathname === "/addresses" ||
    pathname === "/notifications" ||
    pathname === "/my-reviews" ||
    pathname === "/orders" ||
    pathname.startsWith("/orders/")
  ) return "profile";
  if (pathname === "/checkout") return null;
  return null;
}
