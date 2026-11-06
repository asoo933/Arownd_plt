import { describe, expect, it } from "vitest";
import { getSafeNotificationRoute } from "./native-notification-route";

describe("getSafeNotificationRoute", () => {
  const origin = "https://app.arownd.dz";

  it("keeps valid internal paths and their query/hash", () => {
    expect(getSafeNotificationRoute("/orders/123?tab=tracking#latest", origin))
      .toBe("/orders/123?tab=tracking#latest");
  });

  it.each([
    "//evil.example/path",
    "/\\\\evil.example/path",
    "https://evil.example/path",
    "javascript:alert(1)",
    "/%2f%2fevil.example",
    "/%5cevil.example",
    "/bad\u0000route",
  ])("rejects unsafe route %s", (route) => {
    expect(getSafeNotificationRoute(route, origin)).toBeNull();
  });

  it("rejects malformed origins", () => {
    expect(getSafeNotificationRoute("/orders", "not a url")).toBeNull();
  });
});
