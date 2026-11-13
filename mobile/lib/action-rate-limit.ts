const lastAttemptAt = new Map<string, { attemptedAt: number; cooldownMs: number }>();

export class ActionRateLimitError extends Error {
  readonly code = "ACTION_RATE_LIMITED";

  constructor(readonly retryAfterMs: number) {
    super("Please wait before trying this action again.");
    this.name = "ActionRateLimitError";
  }
}

/**
 * Lightweight client-side guard against accidental repeated taps.
 * This is a UX safeguard only; the API/server remains authoritative.
 */
export function assertActionRateLimit(
  key: string,
  cooldownMs: number,
  now = Date.now()
): void {
  if (!key || !Number.isSafeInteger(cooldownMs) || cooldownMs <= 0) {
    throw new Error("invalid_rate_limit_configuration");
  }

  const previousAttempt = lastAttemptAt.get(key);
  if (previousAttempt !== undefined) {
    const elapsed = now - previousAttempt.attemptedAt;
    if (elapsed >= 0 && elapsed < previousAttempt.cooldownMs) {
      throw new ActionRateLimitError(previousAttempt.cooldownMs - elapsed);
    }
  }

  lastAttemptAt.set(key, { attemptedAt: now, cooldownMs });

  if (lastAttemptAt.size > 1_000) {
    for (const [entryKey, entry] of lastAttemptAt) {
      if (now - entry.attemptedAt >= entry.cooldownMs) lastAttemptAt.delete(entryKey);
    }
  }
}

/** Test-only reset to keep rate-limit unit tests isolated. */
export function resetActionRateLimitsForTests(): void {
  lastAttemptAt.clear();
}
