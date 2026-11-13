import type { RequestHandler } from "express";
import { logSecurityEvent } from "../lib/security-events";

interface WindowCounter {
  count: number;
  resetAt: number;
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const windowMs = readPositiveInteger(process.env.API_AUTH_RATE_LIMIT_WINDOW_MS, 60_000);
const maxRequests = readPositiveInteger(process.env.API_AUTH_RATE_LIMIT_MAX, 60);
const counters = new Map<string, WindowCounter>();

export const authenticatedUserRateLimit: RequestHandler = (req, res, next) => {
  const authUser = res.locals.authUser as { id?: unknown } | undefined;
  if (!authUser || typeof authUser.id !== "string" || authUser.id.length === 0) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const now = Date.now();
  const key = authUser.id;
  let counter = counters.get(key);

  if (!counter || counter.resetAt <= now) {
    counter = { count: 0, resetAt: now + windowMs };
    counters.set(key, counter);
  }

  counter.count += 1;
  const remaining = Math.max(0, maxRequests - counter.count);
  const resetAfterSeconds = Math.max(1, Math.ceil((counter.resetAt - now) / 1000));

  res.setHeader("RateLimit-Limit", String(maxRequests));
  res.setHeader("RateLimit-Remaining", String(remaining));
  res.setHeader("RateLimit-Reset", String(resetAfterSeconds));

  if (counters.size > 10_000) {
    for (const [userId, entry] of counters) {
      if (entry.resetAt <= now) counters.delete(userId);
    }
  }

  if (counter.count > maxRequests) {
    res.setHeader("Retry-After", String(resetAfterSeconds));
    logSecurityEvent("rate_limit_exceeded", req, {
      limit: maxRequests,
      windowMs,
      scope: "authenticated_user"
    });
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return;
  }

  next();
};
