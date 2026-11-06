import { describe, expect, it } from "vitest";
import { wasNativeUpdateAccepted, type NativeAppUpdateStartResult } from "./native-app-update";

describe("wasNativeUpdateAccepted", () => {
  it("accepts a started update when Google Play confirms acceptance", () => {
    const result: NativeAppUpdateStartResult = {
      started: true,
      accepted: true,
      type: "flexible",
    };

    expect(wasNativeUpdateAccepted(result)).toBe(true);
  });

  it("does not report success when the user declines the update flow", () => {
    const result: NativeAppUpdateStartResult = {
      started: true,
      accepted: false,
      type: "immediate",
    };

    expect(wasNativeUpdateAccepted(result)).toBe(false);
  });

  it("does not report success when the update flow did not start", () => {
    const result: NativeAppUpdateStartResult = {
      started: false,
      accepted: true,
      type: "flexible",
    };

    expect(wasNativeUpdateAccepted(result)).toBe(false);
  });
});
