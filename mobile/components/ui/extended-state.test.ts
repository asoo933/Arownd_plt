import { describe, expect, it } from "vitest";

import { clampProgress } from "./extended-state";

describe("clampProgress", () => {
  it("keeps progress within the supported range", () => {
    expect(clampProgress(-0.5)).toBe(0);
    expect(clampProgress(0.4)).toBe(0.4);
    expect(clampProgress(1.5)).toBe(1);
  });

  it("normalizes non-finite values to zero", () => {
    expect(clampProgress(Number.NaN)).toBe(0);
    expect(clampProgress(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampProgress(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});
