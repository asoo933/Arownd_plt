import type { RequestHandler } from "express";
import { logSecurityEvent } from "../lib/security-events";

interface SupabaseAuthUser {
  id: string;
}

export const requireSupabaseAuth: RequestHandler = async (req, res, next) => {
  const authorization = req.get("authorization");
  const tokenMatch = authorization?.match(/^Bearer\s+([^\s]+)$/i);

  if (!tokenMatch) {
    logSecurityEvent("authentication_failed", req, { reason: "missing_or_invalid_bearer" });
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    res.status(503).json({ error: "Authentication service is not configured" });
    return;
  }

  try {
    const response = await fetch(
      `${supabaseUrl.replace(/\/+$/, "")}/auth/v1/user`,
      {
        method: "GET",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${tokenMatch[1]}`,
        },
        signal: AbortSignal.timeout(5_000),
      },
    );

    if (!response.ok) {
      logSecurityEvent("authentication_failed", req, {
        reason: "supabase_token_rejected",
        upstreamStatus: response.status,
      });
      res.status(response.status === 429 || response.status >= 500 ? 503 : 401)
        .json({ error: response.status === 429 || response.status >= 500
          ? "Authentication service unavailable"
          : "Unauthorized" });
      return;
    }

    const payload: unknown = await response.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("id" in payload) ||
      typeof payload.id !== "string"
    ) {
      logSecurityEvent("authentication_failed", req, { reason: "invalid_auth_response" });
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user: SupabaseAuthUser = { id: payload.id };
    res.locals.authUser = user;
    next();
  } catch {
    res.status(503).json({ error: "Authentication service unavailable" });
  }
};
