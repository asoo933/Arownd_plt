import { renderHook, waitFor } from "@testing-library/react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { distanceKm, formatDA, formatKm, greeting, isOpenNow, useGeo } from "./geo";
import { isNativePlatform } from "./platform";
import { Geolocation } from "@capacitor/geolocation";

vi.mock("./platform", () => ({ isNativePlatform: vi.fn() }));
vi.mock("@capacitor/geolocation", () => ({
  Geolocation: {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    getCurrentPosition: vi.fn(),
  },
}));

describe("formatDA", () => {
  it("يضيف وحدة دج", () => {
    expect(formatDA(0)).toBe("0 دج");
    expect(formatDA(1500)).toContain("دج");
  });
});

describe("formatKm", () => {
  it("يعرض الأمتار تحت 1 كم", () => {
    expect(formatKm(0.5)).toBe("500 م");
    expect(formatKm(0.05)).toBe("50 م");
  });
  it("يعرض الكيلومترات بعشر واحد", () => {
    expect(formatKm(2.3)).toBe("2.3 كم");
  });
  it("يتعامل مع القيم الفارغة", () => {
    expect(formatKm(null)).toBe("");
    expect(formatKm(undefined)).toBe("");
  });
});

describe("distanceKm", () => {
  it("المسافة بين نفس النقطة صفر", () => {
    expect(distanceKm({ lat: 36.75, lng: 3.05 }, { lat: 36.75, lng: 3.05 })).toBe(0);
  });
  it("الجزائر - وهران حوالي 350 كم", () => {
    const d = distanceKm({ lat: 36.7538, lng: 3.0588 }, { lat: 35.6969, lng: -0.6331 });
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(400);
  });
});

describe("isOpenNow", () => {
  // توقيت الجزائر UTC+1
  const algeriaNoon = new Date("2026-01-15T11:00:00Z"); // 12:00 بتوقيت الجزائر (الأحد)
  const algeriaNight = new Date("2026-01-15T22:00:00Z"); // 23:00 بتوقيت الجزائر

  it("مفتوح في منتصف النهار", () => {
    expect(isOpenNow({ open: "09:00", close: "18:00" }, algeriaNoon)).toBe(true);
  });
  it("مغلق خارج ساعات العمل", () => {
    expect(isOpenNow({ open: "09:00", close: "18:00" }, algeriaNight)).toBe(false);
  });
  it("مغلق في يوم الإجازة", () => {
    // 2026-01-15 هو الخميس (اليوم 4)
    expect(isOpenNow({ open: "09:00", close: "18:00", closed_days: [4] }, algeriaNoon)).toBe(false);
  });
  it("بدون ساعات عمل = مغلق", () => {
    expect(isOpenNow(null, algeriaNoon)).toBe(false);
  });
});

describe("greeting", () => {
  it("صباح الخير في العاشرة", () => {
    expect(greeting(new Date("2026-01-15T09:00:00Z"))).toBe("صباح الخير ☀️");
  });
  it("تصبح على خير في الليل", () => {
    expect(greeting(new Date("2026-01-15T22:00:00Z"))).toBe("تصبح على خير 🌙");
  });
});


describe("useGeo hydration", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.mocked(isNativePlatform).mockReturnValue(false);
  });

  it("restores the cached position after the initial render", async () => {
    const cachedPosition = { lat: 36.75, lng: 3.05, savedAt: Date.now() };
    window.sessionStorage.setItem("arownd:last-position", JSON.stringify(cachedPosition));

    const { result } = renderHook(() => useGeo());

    await waitFor(() => {
      expect(result.current.pos).toEqual({ lat: 36.75, lng: 3.05 });
    });
  });
});


describe("useGeo native permissions", () => {
  beforeEach(() => {
    vi.mocked(isNativePlatform).mockReturnValue(true);
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: "prompt", coarseLocation: "prompt" });
    vi.mocked(Geolocation.requestPermissions).mockResolvedValue({ location: "granted", coarseLocation: "granted" });
    vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue({
      coords: { latitude: 36.75, longitude: 3.05, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
      timestamp: Date.now(),
    });
  });

  it("uses Capacitor runtime permissions without a Web Permissions preflight", async () => {
    const { result } = renderHook(() => useGeo());

    await act(async () => {
      await result.current.ask();
    });

    expect(Geolocation.checkPermissions).toHaveBeenCalledOnce();
    expect(Geolocation.requestPermissions).toHaveBeenCalledWith({ permissions: ["location"] });
    expect(Geolocation.getCurrentPosition).toHaveBeenCalledOnce();
  });
});
