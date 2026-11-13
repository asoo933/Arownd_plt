const lastAttemptAt = new Map<string, number>();

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
    const elapsed = now - previousAttempt;
    if (elapsed >= 0 && elapsed < cooldownMs) {
      throw new ActionRateLimitError(cooldownMs - elapsed);
    }
  }

  lastAttemptAt.set(key, now);

  if (lastAttemptAt.size > 1_000) {
    for (const [entryKey, timestamp] of lastAttemptAt) {
      if (now - timestamp >= cooldownMs) lastAttemptAt.delete(entryKey);
    }
  }
}

/** Test-only reset to keep rate-limit unit tests isolated. */
export function resetActionRateLimitsForTests(): void {
  lastAttemptAt.clear();
}
