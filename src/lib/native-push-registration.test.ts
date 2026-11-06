import { describe, expect, it } from "vitest";
import { createPushRegistrationGate } from "./native-push-registration";

describe("createPushRegistrationGate", () => {
  it("prevents overlapping registration attempts", () => {
    const gate = createPushRegistrationGate();

    expect(gate.begin()).toBe(true);
    expect(gate.begin()).toBe(false);
  });

  it("prevents another attempt after registration is requested", () => {
    const gate = createPushRegistrationGate();

    expect(gate.begin()).toBe(true);
    gate.markRequested();

    expect(gate.begin()).toBe(false);
  });

  it("allows retry after a failed registration", () => {
    const gate = createPushRegistrationGate();

    expect(gate.begin()).toBe(true);
    gate.markFailed();

    expect(gate.begin()).toBe(true);
  });

  it("allows retry after a previously requested token fails server registration", () => {
    const gate = createPushRegistrationGate();

    expect(gate.begin()).toBe(true);
    gate.markRequested();
    gate.markFailed();

    expect(gate.begin()).toBe(true);
  });
});
