import { afterEach, describe, expect, it } from "vitest";
import { isNativePlatform } from "./platform";

type TestWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
  };
};

afterEach(() => {
  delete (window as TestWindow).Capacitor;
});

describe("isNativePlatform", () => {
  it("returns false in a regular browser", () => {
    expect(isNativePlatform()).toBe(false);
  });

  it("recognizes an explicitly native Capacitor runtime", () => {
    (window as TestWindow).Capacitor = {
      isNativePlatform: () => true,
      getPlatform: () => "ios",
    };

    expect(isNativePlatform()).toBe(true);
  });

  it("recognizes Android's localhost WebView origin", () => {
    (window as TestWindow).Capacitor = {
      isNativePlatform: () => false,
      getPlatform: () => "android",
    };

    expect(isNativePlatform()).toBe(true);
  });

  it("does not mistake Capacitor's web platform for a native app", () => {
    (window as TestWindow).Capacitor = {
      isNativePlatform: () => false,
      getPlatform: () => "web",
    };

    expect(isNativePlatform()).toBe(false);
  });
});
