import { describe, expect, it } from "vitest";
import { isValidReviewRating } from "@/lib/reviews";

describe("review rating validation", () => {
  it("accepts integer ratings from one to five", () => {
    expect([1, 2, 3, 4, 5].every(isValidReviewRating)).toBe(true);
  });

  it("rejects values outside the range and fractions", () => {
    expect([0, 6, 2.5, Number.NaN].some(isValidReviewRating)).toBe(false);
  });
});
