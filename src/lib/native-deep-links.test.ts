import { describe, expect, it } from "vitest";
import { parseNativeAuthCallback } from "./native-deep-links";

describe("parseNativeAuthCallback", () => {
  it("accepts the registered callback and keeps supported auth state", () => {
    expect(
      parseNativeAuthCallback(
        "com.arownd.app://auth/callback?code=one-time-code&intent=merchant&redirect=%2Fstudio",
      ),
    ).toEqual({
      code: "one-time-code",
      reset: false,
      intent: "merchant",
      redirect: "/studio",
    });
  });

  it("preserves password recovery state", () => {
    expect(
      parseNativeAuthCallback("com.arownd.app://auth/callback?code=recovery-code&reset=1"),
    ).toEqual({ code: "recovery-code", reset: true, intent: undefined, redirect: undefined });
  });

  it.each([
    "https://example.com/auth/callback?code=x",
    "com.other.app://auth/callback?code=x",
    "com.arownd.app://other/callback?code=x",
    "com.arownd.app://auth/other?code=x",
    "com.arownd.app://auth/callback",
    "com.arownd.app://auth/callback?code=",
  ])("rejects an unrelated or incomplete callback: %s", (url) => {
    expect(parseNativeAuthCallback(url)).toBeNull();
  });

  it("rejects external redirect targets", () => {
    const result = parseNativeAuthCallback(
      "com.arownd.app://auth/callback?code=x&redirect=https%3A%2F%2Fevil.example",
    );
    expect(result?.redirect).toBeUndefined();
  });

  it("rejects protocol-relative redirect targets", () => {
    const result = parseNativeAuthCallback(
      "com.arownd.app://auth/callback?code=x&redirect=%2F%2Fevil.example",
    );
    expect(result?.redirect).toBeUndefined();
  });
});
