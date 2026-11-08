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

  it("disables both directions when the range is inverted", () => {
    expect(getQuantityStepState(4, 10, 1)).toEqual({ canDecrease: false, canIncrease: false });
  });

  it("disables both directions when the value is outside the range", () => {
    expect(getQuantityStepState(11, 1, 10)).toEqual({ canDecrease: false, canIncrease: false });
  });

  it("disables both directions for non-finite values", () => {
    expect(getQuantityStepState(Number.NaN, 1, 10)).toEqual({ canDecrease: false, canIncrease: false });
  });
});
