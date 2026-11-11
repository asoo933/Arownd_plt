import { describe, expect, it } from "vitest";

import { getIdentityInitials } from "./identity-state";

describe("getIdentityInitials", () => {
  it("returns initials from the first two words", () => {
    expect(getIdentityInitials("Arownd Market Platform")).toBe("AM");
  });

  it("supports a single word", () => {
    expect(getIdentityInitials("Arownd")).toBe("A");
  });

  it("returns an empty string for blank input", () => {
    expect(getIdentityInitials("   ")).toBe("");
  });

  it("supports Arabic names", () => {
    expect(getIdentityInitials("سوق أروَند")).toBe("سأ");
  });
});
