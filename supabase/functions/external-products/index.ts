import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NoonProduct = {
  product_id?: unknown;
  title?: unknown;
  url?: unknown;
  image?: unknown;
  price?: unknown;
  currency?: unknown;
  brand?: unknown;
};

type JumiaProduct = NoonProduct;


function isHttpsUrl(value: unknown, allowedHosts: string[]): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && allowedHosts.some((host) =>
      url.hostname === host || url.hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

function normalizeNoonProduct(item: NoonProduct, country: "ae" | "eg") {
  if (
    typeof item.product_id !== "string" ||
    typeof item.title !== "string" ||
    !item.title.trim() ||
    !isHttpsUrl(item.url, ["noon.com"]) ||
    typeof item.price !== "number" ||
    !Number.isFinite(item.price) ||
    typeof item.currency !== "string"
  ) {
    return null;
  }

  const imageUrl = isHttpsUrl(item.image, ["nooncdn.com"]) ? item.image : null;
  const marketName = country === "ae" ? "Noon الإمارات" : "Noon مصر";
  const priceLabel = new Intl.NumberFormat(country === "ae" ? "ar-AE" : "ar-EG", {
    style: "currency",
    currency: item.currency,
    maximumFractionDigits: 2,
  }).format(item.price);

  return {
    id: `noon:${country}:${item.product_id}`,
    name: item.title.trim(),
    storeName: typeof item.brand === "string" && item.brand.trim()
      ? `${marketName} · ${item.brand.trim()}`
      : marketName,
    productUrl: item.url,
    imageUrl,
    priceLabel,
  };
}

function normalizeJumiaProduct(item: JumiaProduct) {
  const productId = typeof item.product_id === "string" || typeof item.product_id === "number"
    ? String(item.product_id).trim()
    : "";
  if (
    !productId ||
    typeof item.title !== "string" ||
    !item.title.trim() ||
    !isHttpsUrl(item.url, ["jumia.ma"]) ||
    typeof item.price !== "number" ||
    !Number.isFinite(item.price) ||
    item.currency !== "MAD"
  ) {
    return null;
  }

  const imageUrl = isHttpsUrl(item.image, ["jumia.is", "jumia.ma"]) ? item.image : null;
  const priceLabel = new Intl.NumberFormat("ar-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 2,
  }).format(item.price);

  return {
    id: `jumia:ma:${productId}`,
    name: item.title.trim(),
    storeName: typeof item.brand === "string" && item.brand.trim()
      ? `Jumia المغرب · ${item.brand.trim()}`
      : "Jumia المغرب",
    productUrl: item.url,
    imageUrl,
    priceLabel,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  try {
    const payload: unknown = await req.json();
    if (typeof payload !== "object" || payload === null) {
      return Response.json({ error: "Invalid request" }, { status: 400, headers: corsHeaders });
    }

    const country = (payload as { country?: unknown }).country;
    const language = (payload as { language?: unknown }).language;
    if (country !== "ae" && country !== "eg" && country !== "ma") {
      return Response.json({ error: "Unsupported market" }, { status: 400, headers: corsHeaders });
    }
    if (language !== "ar" && language !== "en") {
      return Response.json({ error: "Unsupported language" }, { status: 400, headers: corsHeaders });
    }

    const apiKey = Deno.env.get("REEFAPI_API_KEY");
    if (!apiKey) {
      console.error("[external-products] REEFAPI_API_KEY is not configured");
      return Response.json({ error: "Product source is not configured" }, { status: 503, headers: corsHeaders });
    }

    const isJumia = country === "ma";
    const endpoint = isJumia
      ? "https://api.reefapi.com/jumia/v1/search"
      : "https://api.reefapi.com/noon/v1/search";
    const requestBody = isJumia
      ? {
        query: language === "ar" ? "الأكثر مبيعاً" : "meilleures ventes",
        country: "ma",
        language: language === "ar" ? "ar" : "fr",
        page: 1,
      }
      : {
        query: "best sellers",
        country,
        language,
        page: 1,
        limit: 20,
      };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
    let upstream: Response;
    try {
      upstream = await fetch(endpoint, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const envelope: unknown = await upstream.json().catch(() => null);
    if (!upstream.ok || typeof envelope !== "object" || envelope === null) {
      console.error("[external-products] ReefAPI request failed", { country, status: upstream.status });
      return Response.json({ error: "Product source request failed" }, { status: 502, headers: corsHeaders });
    }

    const result = envelope as {
      ok?: unknown;
      data?: { results?: unknown };
      error?: { code?: unknown };
    };
    if (result.ok !== true || !Array.isArray(result.data?.results)) {
      console.error("[external-products] ReefAPI returned an invalid response", {
        country,
        code: typeof result.error?.code === "string" ? result.error.code : "UNKNOWN",
      });
      return Response.json({ error: "Product source returned invalid data" }, { status: 502, headers: corsHeaders });
    }

    const products = isJumia
      ? result.data.results
        .map((item) => normalizeJumiaProduct(item as JumiaProduct))
        .filter((item): item is NonNullable<typeof item> => item !== null)
      : result.data.results
        .map((item) => normalizeNoonProduct(item as NoonProduct, country))
        .filter((item): item is NonNullable<typeof item> => item !== null);

    return Response.json({ products }, { headers: corsHeaders });
  } catch (error) {
    console.error("[external-products] Request failed", error instanceof Error ? error.name : "UNKNOWN");
    return Response.json({ error: "Could not load external products" }, { status: 500, headers: corsHeaders });
  }
});
