/**
 * Converts an untrusted push payload route into a same-origin app URL.
 * External URLs, protocol-relative paths, backslashes and encoded separators
 * are rejected before navigation.
 */
export function getSafeNotificationRoute(route: unknown, origin: string): string | null {
  if (
    typeof route !== "string" ||
    !route.startsWith("/") ||
    route.startsWith("//") ||
    route.includes("\\") ||
    route.length > 2048 ||
    /%(?:2f|5c|00)/i.test(route) ||
    Array.from(route).some((character) => {
      const code = character.charCodeAt(0);
      return code < 0x20 || code === 0x7f;
    })
  ) {
    return null;
  }

  try {
    const appOrigin = new URL(origin);
    const destination = new URL(route, appOrigin);
    if (
      destination.origin !== appOrigin.origin ||
      (destination.protocol !== "https:" && destination.protocol !== "http:") ||
      destination.username ||
      destination.password
    ) {
      return null;
    }

    return destination.pathname + destination.search + destination.hash;
  } catch {
    return null;
  }
}
