import { describe, expect, it } from "vitest";

import { getCustomerTab } from "./customer-navigation-state";

describe("getCustomerTab", () => {
  it("maps the main customer navigation routes", () => {
    expect(getCustomerTab("/home")).toBe("home");
    expect(getCustomerTab("/explore")).toBe("explore");
    expect(getCustomerTab("/cart")).toBe("cart");
    expect(getCustomerTab("/stores")).toBe("none");
    expect(getCustomerTab("/favorites")).toBe("none");
  });

  it("keeps product detail associated with explore", () => {
    expect(getCustomerTab("/product/abc")).toBe("explore");
  });

  it("keeps account routes associated with profile", () => {
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
