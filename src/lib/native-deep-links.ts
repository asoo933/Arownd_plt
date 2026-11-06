export type NativeRegistrationIntent = "customer" | "merchant" | "delivery";

export type NativeAuthCallback = {
  code: string;
  reset: boolean;
  intent?: NativeRegistrationIntent;
  redirect?: string;
};

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 0x20 || code === 0x7f;
  });
}

function safeRelativePath(value: string | null): string | undefined {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\") ||
    value.includes("\\") ||
    /%(?:2f|5c|00)/i.test(value) ||
    hasControlCharacters(value)
  ) {
    return undefined;
  }
  return value;
}

/**
 * Accept only the app's registered auth callback URL.
 * Never navigate to arbitrary URLs supplied by an external deep link.
 */
export function parseNativeAuthCallback(rawUrl: string): NativeAuthCallback | null {
  try {
    const url = new URL(rawUrl);
    if (
      url.protocol !== "com.arownd.app:" ||
      url.hostname !== "auth" ||
      url.pathname !== "/callback"
    ) {
      return null;
    }

    const code = url.searchParams.get("code");
    if (!code || code.length > 2048) return null;

    const rawIntent = url.searchParams.get("intent");
    const intent: NativeRegistrationIntent | undefined =
      rawIntent === "customer" || rawIntent === "merchant" || rawIntent === "delivery"
        ? rawIntent
        : undefined;

    return {
      code,
      reset: ["1", "true"].includes(url.searchParams.get("reset") ?? ""),
      intent,
      redirect: safeRelativePath(url.searchParams.get("redirect")),
    };
  } catch {
    return null;
  }
}

/**
 * Parses app-owned content links only. The host must be "open", and the
 * resulting destination is always a same-app relative route, never a URL.
 */
export function parseNativeRouteLink(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (
      url.protocol !== "com.arownd.app:" ||
      url.hostname !== "open" ||
      !url.pathname.startsWith("/") ||
      url.pathname.startsWith("//") ||
      url.pathname.includes("\\") ||
      /%(?:2f|5c|00)/i.test(url.pathname) ||
      hasControlCharacters(url.pathname) ||
      url.pathname.length > 1024
    ) {
      return null;
    }

    const route = safeRelativePath(url.pathname);
    if (
      !route ||
      (route !== "/explore" &&
        route !== "/stores" &&
        !/^\/(products|stores)\/[A-Za-z0-9_-]+\/?$/.test(route))
    ) {
      return null;
    }
    return route + url.search + url.hash;
  } catch {
    return null;
  }
}
