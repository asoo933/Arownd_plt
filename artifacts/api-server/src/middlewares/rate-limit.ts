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

const windowMs = readPositiveInteger(process.env.API_RATE_LIMIT_WINDOW_MS, 60_000);
const maxRequests = readPositiveInteger(process.env.API_RATE_LIMIT_MAX, 120);
const counters = new Map<string, WindowCounter>();

export const apiRateLimit: RequestHandler = (req, res, next) => {
  if (req.path === "/healthz") {
    next();
    return;
  }

  const now = Date.now();
  const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
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
    for (const [address, entry] of counters) {
      if (entry.resetAt <= now) counters.delete(address);
    }
  }

  if (counter.count > maxRequests) {
    res.setHeader("Retry-After", String(resetAfterSeconds));
    logSecurityEvent("rate_limit_exceeded", req, {
      limit: maxRequests,
      windowMs,
      scope: "ip"
    });
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return;
  }

  next();
};
