import { describe, expect, it } from "vitest";

import { getOrderStatusTone, getOrderTrackingSteps } from "@/lib/orders";

describe("customer order display", () => {
  it("maps order statuses to tracking steps", () => {
    expect(getOrderTrackingSteps("pending")).toBe(0);
    expect(getOrderTrackingSteps("confirmed")).toBe(1);
    expect(getOrderTrackingSteps("shipped")).toBe(2);
    expect(getOrderTrackingSteps("delivered")).toBe(3);
    expect(getOrderTrackingSteps("cancelled")).toBe(-1);
  });

  it("classifies terminal and waiting statuses", () => {
    expect(getOrderStatusTone("delivered")).toBe("success");
    expect(getOrderStatusTone("pending")).toBe("pending");
    expect(getOrderStatusTone("quoted")).toBe("pending");
    expect(getOrderStatusTone("cancelled")).toBe("danger");
    expect(getOrderStatusTone("rejected")).toBe("danger");
    expect(getOrderStatusTone("unknown")).toBe("muted");
  });
});
