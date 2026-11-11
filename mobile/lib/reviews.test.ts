import { describe, expect, it } from "vitest";
import { getReviewTargetPath, isValidReviewRating } from "@/lib/reviews";

describe("review rating validation", () => {
  it("accepts integer ratings from one to five", () => {
    expect([1, 2, 3, 4, 5].every(isValidReviewRating)).toBe(true);
  });

  it("rejects values outside the range and fractions", () => {
    expect([0, 6, 2.5, Number.NaN].some(isValidReviewRating)).toBe(false);
  });
});

describe("review target navigation", () => {
  it("routes product and store reviews to their matching details", () => {
    expect(getReviewTargetPath({ target_type: "product", target_id: "product-id" })).toBe("/product/product-id");
    expect(getReviewTargetPath({ target_type: "store", target_id: "store-id" })).toBe("/store/store-id");
  });

  it("encodes target identifiers before building a route", () => {
    expect(getReviewTargetPath({ target_type: "product", target_id: "id/with spaces" })).toBe("/product/id%2Fwith%20spaces");
  });
});
