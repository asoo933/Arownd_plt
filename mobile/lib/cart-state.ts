export type CartItem = {
  offerId: string;
  productId?: string;
  name?: string;
  quantity: number;
  options: Record<string, string>;
  price?: number;
};

export type CartIssueKind = "missing" | "unavailable" | "outOfStock" | "overStock" | "priceChanged";
export type CartOffer = {
  id: string;
  price: number;
  stock_quantity: number;
  is_available: boolean;
  product: { id: string; name: string };
  store: { id: string; name: string };
  images: { image_url: string | null; is_primary?: boolean | undefined }[];
};
export type CartLine = { item: CartItem; offer: CartOffer | null; issues: CartIssueKind[] };
export type CartEvaluation = { lines: CartLine[]; subtotal: number; blockingCount: number; loaded: boolean };

export const EMPTY_CART: CartItem[] = [];
export const MAX_CART_QUANTITY = 10;

/** Keeps option identity independent from the current interface language. */
export function normalizeCartOptions(options: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [rawKey, value] of Object.entries(options)) {
    const key = rawKey.trim();
    const alias = key.toLocaleLowerCase();
    const canonicalKey = alias === "size" || alias === "sizes" || key === "المقاس" || key === "مقاس"
      ? "size"
      : alias === "color" || alias === "colors" || key === "اللون" || key === "لون"
        ? "color"
        : key;
    if (canonicalKey && typeof value === "string") normalized[canonicalKey] = value.trim();
  }
  return normalized;
}

export function cartLineKey(item: Pick<CartItem, "offerId" | "options">): string {
  const options = Object.entries(normalizeCartOptions(item.options))
    .filter(([key, value]) => key.length > 0 && typeof value === "string")
    .sort(([left], [right]) => left.localeCompare(right));
  return item.offerId + "::" + JSON.stringify(options);
}

function cleanOptions(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const entries: [string, string][] = Object.entries(value).flatMap(([key, item]): [string, string][] =>
    key.length > 0 && typeof item === "string" ? [[key, item]] : []
  );
  return normalizeCartOptions(Object.fromEntries(entries));
}

export function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const lines = new Map<string, CartItem>();
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const row = entry as Record<string, unknown>;
    if (typeof row.offerId !== "string" || !row.offerId) continue;
    const item: CartItem = {
      offerId: row.offerId,
      productId: typeof row.productId === "string" ? row.productId : "",
      name: typeof row.name === "string" ? row.name : "",
      ...(typeof row.price === "number" && Number.isFinite(row.price) && row.price >= 0 ? { price: row.price } : {}),
      quantity: Math.max(1, Math.min(MAX_CART_QUANTITY, Math.floor(Number(row.quantity)) || 1)),
      options: cleanOptions(row.options)
    };
    const key = cartLineKey(item);
    const previous = lines.get(key);
    lines.set(key, { ...item, quantity: Math.min(MAX_CART_QUANTITY, (previous?.quantity ?? 0) + item.quantity) });
  }
  return [...lines.values()];
}

export function addCartItem(items: CartItem[], incoming: CartItem): CartItem[] {
  if (!incoming.offerId || typeof incoming.price !== "number" || !Number.isFinite(incoming.price) || incoming.price < 0) return items;
  const normalized = sanitizeCart([incoming])[0];
  if (!normalized) return items;
  const key = cartLineKey(normalized);
  const existing = items.find((item) => cartLineKey(item) === key);
  if (!existing) return [...items, normalized];
  return items.map((item) => cartLineKey(item) === key
    ? { ...item, ...normalized, quantity: Math.min(MAX_CART_QUANTITY, item.quantity + normalized.quantity) }
    : item);
}

export function setCartItemQuantity(items: CartItem[], lineKey: string, quantity: number): CartItem[] {
  const nextQuantity = Math.max(1, Math.min(MAX_CART_QUANTITY, Math.floor(quantity) || 1));
  return items.map((item) => cartLineKey(item) === lineKey ? { ...item, quantity: nextQuantity } : item);
}

export function removeCartItem(items: CartItem[], lineKey: string): CartItem[] {
  return items.filter((item) => cartLineKey(item) !== lineKey);
}

export function evaluateCart(items: CartItem[], offers: CartOffer[] | undefined): CartEvaluation {
  const loaded = offers !== undefined;
  const offerList = offers ?? [];
  const requestedByOffer = new Map<string, number>();
  for (const item of items) requestedByOffer.set(item.offerId, (requestedByOffer.get(item.offerId) ?? 0) + item.quantity);
  const lines = items.map((item): CartLine => {
    const offer = offerList.find((candidate) => candidate.id === item.offerId) ?? null;
    const issues: CartIssueKind[] = [];
    if (!offer) {
      if (loaded) issues.push("missing");
    } else {
      if (!offer.is_available) issues.push("unavailable");
      else if (offer.stock_quantity <= 0) issues.push("outOfStock");
      else if (offer.stock_quantity < (requestedByOffer.get(item.offerId) ?? item.quantity)) issues.push("overStock");
      if (item.price != null && offer.price !== item.price) issues.push("priceChanged");
    }
    return { item, offer, issues };
  });
  const subtotal = lines.reduce((sum, line) => sum + (line.offer?.price ?? 0) * line.item.quantity, 0);
  const blockingCount = lines.filter((line) => line.issues.some((issue) => issue !== "priceChanged")).length;
  return { lines, subtotal, blockingCount, loaded };
}
