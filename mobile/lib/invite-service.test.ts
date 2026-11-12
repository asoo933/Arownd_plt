import { describe, expect, it } from "vitest";

import { formatInviteCode, normalizeInviteCode } from "./invite-code";

describe("Arownd invite codes", () => {
  it("normalizes lowercase invite codes", () => {
    expect(normalizeInviteCode("ar-invite-km-4821")).toBe("AR-INVITE-KM-4821");
  });

  it("formats valid codes without changing the standard format", () => {
    expect(formatInviteCode("AR-INVITE-KM-4821")).toBe("AR-INVITE-KM-4821");
  });

  it("rejects codes with an invalid prefix", () => {
    expect(normalizeInviteCode("ARW-KM-4821")).toBeNull();
  });

  it("rejects codes with the wrong letter count", () => {
    expect(normalizeInviteCode("AR-INVITE-K-4821")).toBeNull();
  });

  it("rejects codes with the wrong digit count", () => {
    expect(normalizeInviteCode("AR-INVITE-KM-482")).toBeNull();
  });

  it("rejects non-numeric suffixes", () => {
    expect(normalizeInviteCode("AR-INVITE-KM-48AB")).toBeNull();
  });
});
