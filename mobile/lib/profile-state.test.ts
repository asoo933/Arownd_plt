import { describe, expect, it } from "vitest";

import { getProfileDisplayName, getProfileInitial } from "@/lib/profile-state";

describe("profile display helpers", () => {
  it("prefers a non-empty profile name", () => {
    expect(getProfileDisplayName("  أحمد علي  ", "ahmed@example.com")).toBe("أحمد علي");
  });

  it("falls back to the email when the profile name is missing", () => {
    expect(getProfileDisplayName(null, "ahmed@example.com")).toBe("ahmed@example.com");
  });

  it("uses a stable fallback when both name and email are missing", () => {
    expect(getProfileDisplayName(null, null)).toBe("Arownd");
  });

  it("returns the first visible character as the avatar initial", () => {
    expect(getProfileInitial(" أحمد علي")).toBe("أ");
    expect(getProfileInitial("")).toBe("A");
  });
});
