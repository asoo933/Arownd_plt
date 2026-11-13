import { afterEach, describe, expect, it } from "vitest";

import {
  ActionRateLimitError,
  assertActionRateLimit,
  resetActionRateLimitsForTests
} from "./action-rate-limit";

describe("action rate limit", () => {
  afterEach(() => resetActionRateLimitsForTests());

  it("allows the first action and actions after the cooldown", () => {
    expect(() => assertActionRateLimit("checkout:user-1", 5_000, 1_000)).not.toThrow();
    expect(() => assertActionRateLimit("checkout:user-1", 5_000, 6_000)).not.toThrow();
  });

  it("rejects repeated actions during the cooldown", () => {
    assertActionRateLimit("support:conversation-1", 2_000, 10_000);
    try {
      assertActionRateLimit("support:conversation-1", 2_000, 10_500);
      throw new Error("expected rate limit rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(ActionRateLimitError);
      expect((error as ActionRateLimitError).retryAfterMs).toBe(1_500);
    }
  });

  it("keeps independent action keys separate", () => {
    assertActionRateLimit("order:one", 3_000, 1_000);
    expect(() => assertActionRateLimit("order:two", 3_000, 1_000)).not.toThrow();
  });
});
