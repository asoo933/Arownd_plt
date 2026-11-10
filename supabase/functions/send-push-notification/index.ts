import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-push-webhook-secret",
};

function base64Url(input: Uint8Array): string {
  let binary = "";
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToBytes(pem: string): Uint8Array {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const raw = atob(body);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function getGoogleAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  token_uri?: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = base64Url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const unsigned = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)),
  );
  const assertion = `${unsigned}.${base64Url(signature)}`;
  const tokenResponse = await fetch(
    serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    },
  );
  const tokenBody = await tokenResponse.json();
  if (!tokenResponse.ok || typeof tokenBody.access_token !== "string") {
    throw new Error("Google OAuth token exchange failed");
  }
  return tokenBody.access_token;
}

function toFcmData(record: Record<string, unknown>): Record<string, string> {
  const source =
    record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : {};
  const data: Record<string, string> = {
    notification_id: String(record.id ?? ""),
    type: String(record.type ?? "info"),
  };
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      data[key] = String(value);
    }
  }
  return data;
}

type NotificationLanguage = "ar" | "en";

async function getPreferredLanguage(
  userId: string,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<NotificationLanguage | null> {
  try {
    const response = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    );
    if (!response.ok) return null;
    const user = (await response.json()) as {
      user_metadata?: Record<string, unknown>;
    };
    const language = user.user_metadata?.preferred_language;
    return language === "ar" || language === "en" ? language : null;
  } catch {
    return null;
  }
}

function localizedNotificationCopy(
  record: Record<string, unknown>,
  language: NotificationLanguage,
): { title: string; body: string } | null {
  if (record.type !== "order") return null;
  const data =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : {};
  const status = typeof data.status === "string" ? data.status : "";
  const url = typeof data.url === "string" ? data.url : "";
  const isMerchantNewOrder =
    (data.recipient_role === "merchant" && status === "pending") ||
    url.startsWith("/studio/orders/");

  const copy = {
    ar: {
      updateTitle: "تحديث على طلبك",
      merchantTitle: "طلب جديد لمتجرك",
      merchantBody: "وصلك طلب جديد. راجع تفاصيله وحدد رسوم التوصيل لإرسال عرضك للعميل.",
      pending: "استلم المتجر طلبك، وسيعمل على مراجعته.",
      quoted: "أرسل المتجر عرض التوصيل. راجع المبلغ الإجمالي واختر قبول العرض أو رفضه.",
      confirmed: "وافق المتجر على طلبك وبدأ تجهيزه.",
      shipped: "تم شحن طلبك، وهو في طريقه إليك.",
      delivered: "تم تسليم طلبك بنجاح.",
      cancelled: "تم إلغاء طلب المتجر.",
      accepted: "تم قبول طلب الشحن الخاص بك.",
      picked_up: "استلم مندوب التوصيل طردك من المتجر.",
      in_transit: "شُحنت طلبيتك وهي في الطريق إليك.",
      failed: "تعذّر توصيل الطلب. ستتم متابعة حالة الشحنة.",
      returned: "تم إرجاع الشحنة.",
      rejected: "لم يتم قبول طلب الشحن.",
    },
    en: {
      updateTitle: "Your order has been updated",
      merchantTitle: "A new order for your store",
      merchantBody: "You received a new order. Review its details and set the delivery fee to send your quote to the customer.",
      pending: "The store has received your order and will review it.",
      quoted: "The store sent a delivery quote. Review the total and choose whether to accept or decline it.",
      confirmed: "The store accepted your order and has started preparing it.",
      shipped: "Your order has been dispatched and is on its way.",
      delivered: "Your order has been delivered successfully.",
      cancelled: "The store order has been cancelled.",
      accepted: "Your delivery request has been accepted.",
      picked_up: "The delivery driver has collected your parcel from the store.",
      in_transit: "Your order has been dispatched and is on its way.",
      failed: "Delivery could not be completed. The shipment status will be followed up.",
      returned: "The shipment has been returned.",
      rejected: "The delivery request was not accepted.",
    },
  }[language];

  if (isMerchantNewOrder) {
    return { title: copy.merchantTitle, body: copy.merchantBody };
  }
  const localizedBody = copy[status as keyof typeof copy];
  const supportedStatuses = [
    "pending", "quoted", "confirmed", "shipped", "delivered", "cancelled",
    "accepted", "picked_up", "in_transit", "failed", "returned", "rejected",
  ];
  if (!supportedStatuses.includes(status) || typeof localizedBody !== "string") return null;
  return { title: copy.updateTitle, body: localizedBody };
}

const MAX_WEBHOOK_BODY_BYTES = 64 * 1024;

function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return difference === 0;
}

async function readBoundedBody(req: Request): Promise<string> {
  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BODY_BYTES) {
    throw new Error("Webhook payload too large");
  }
  const reader = req.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_WEBHOOK_BODY_BYTES) {
      await reader.cancel();
      throw new Error("Webhook payload too large");
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  const providedSecret = req.headers.get("x-push-webhook-secret") ?? "";
  if (!webhookSecret || !constantTimeEqual(providedSecret, webhookSecret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
      return new Response("Unsupported media type", { status: 415 });
    }
    const rawBody = await readBoundedBody(req);
    let payload: { record?: unknown };
    try {
      payload = JSON.parse(rawBody) as { record?: unknown };
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
    const record =
      payload.record && typeof payload.record === "object" && !Array.isArray(payload.record)
        ? (payload.record as Record<string, unknown>)
        : undefined;
    const userId =
      typeof record?.user_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        record.user_id,
      )
        ? record.user_id
        : null;
    if (!record || !userId) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceAccountRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceAccountRaw || !supabaseUrl || !serviceRoleKey) {
      throw new Error("Push sender secrets are not configured");
    }
    const serviceAccount = JSON.parse(serviceAccountRaw);
    const projectId = serviceAccount.project_id;
    if (!projectId) throw new Error("Firebase service account has no project_id");

    const restHeaders = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };
    const devicesResponse = await fetch(
      `${supabaseUrl}/rest/v1/push_device_tokens?user_id=eq.${encodeURIComponent(userId)}&select=token`,
      { headers: restHeaders },
    );
    if (!devicesResponse.ok) throw new Error("Could not load registered push devices");
    const devices = (await devicesResponse.json()) as Array<{ token: string }>;
    if (!devices.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getGoogleAccessToken(serviceAccount);
    const data = toFcmData(record);
    const preferredLanguage = await getPreferredLanguage(userId, supabaseUrl, serviceRoleKey);
    const localizedCopy = preferredLanguage
      ? localizedNotificationCopy(record, preferredLanguage)
      : null;
    const notificationTitle = localizedCopy?.title ?? String(record.title || "Arownd");
    const notificationBody = localizedCopy?.body ?? String(record.body || "لديك إشعار جديد.");
    const results = await Promise.all(
      devices.map(async ({ token }) => {
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                token,
                notification: {
                  title: notificationTitle,
                  body: notificationBody,
                },
                data,
                android: {
                  priority: "high",
                  notification: {
                    channel_id: "arownd_updates_v2",
                    icon: "ic_stat_arownd",
                    sound: "arownd_notification",
                  },
                },
              },
            }),
          },
        );
        if (!response.ok) {
          const failure = await response.text();
          if (
            failure.includes("UNREGISTERED") ||
            failure.includes("registration-token-not-registered")
          ) {
            await fetch(
              `${supabaseUrl}/rest/v1/push_device_tokens?token=eq.${encodeURIComponent(token)}`,
              { method: "DELETE", headers: restHeaders },
            );
          }
          return false;
        }
        return true;
      }),
    );

    return new Response(
      JSON.stringify({ sent: results.filter(Boolean).length, total: devices.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[send-push-notification]", error);
    return new Response(JSON.stringify({ error: "Push delivery failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
