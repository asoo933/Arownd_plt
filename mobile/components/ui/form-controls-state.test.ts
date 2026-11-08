import { describe, expect, it } from "vitest";
import { getQuantityStepState } from "./form-controls-state";

describe("getQuantityStepState", () => {
  it("disables decrement at the minimum", () => {
    expect(getQuantityStepState(1, 1, 10)).toEqual({ canDecrease: false, canIncrease: true });
  });

  it("disables increment at the maximum", () => {
    expect(getQuantityStepState(10, 1, 10)).toEqual({ canDecrease: true, canIncrease: false });
  });

  it("allows both directions between bounds", () => {
    expect(getQuantityStepState(4, 1, 10)).toEqual({ canDecrease: true, canIncrease: true });
  });
});
