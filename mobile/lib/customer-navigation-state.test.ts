import { describe, expect, it } from "vitest";

import { getCustomerTab } from "./customer-navigation-state";

describe("getCustomerTab", () => {
  it("maps the main shopping routes", () => {
    expect(getCustomerTab("/home")).toBe("home");
    expect(getCustomerTab("/explore")).toBe("explore");
    expect(getCustomerTab("/stores")).toBe("stores");
    expect(getCustomerTab("/favorites")).toBe("favorites");
  });

  it("keeps detail routes associated with their parent tab", () => {
    expect(getCustomerTab("/product/abc")).toBe("explore");
    expect(getCustomerTab("/store/abc")).toBe("stores");
    expect(getCustomerTab("/orders/abc")).toBe("profile");
    expect(getCustomerTab("/addresses")).toBe("profile");
    expect(getCustomerTab("/notifications")).toBe("profile");
    expect(getCustomerTab("/my-reviews")).toBe("profile");
    expect(getCustomerTab("/delivery-profile")).toBe("profile");
    expect(getCustomerTab("/settings")).toBe("profile");
  });

  it("hides the tab bar outside the main customer navigation", () => {
    expect(getCustomerTab("/checkout")).toBeNull();
    expect(getCustomerTab("/login")).toBeNull();
  });
});
