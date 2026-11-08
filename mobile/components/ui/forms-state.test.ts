import { describe, expect, it } from "vitest";

import { getCalendarDays, normalizeOtp } from "./forms-state";

describe("normalizeOtp", () => {
  it("keeps digits and converts Arabic numerals", () => {
    expect(normalizeOtp("١2x۳٤", 4)).toBe("1234");
  });

  it("limits the result to the requested length", () => {
    expect(normalizeOtp("123456", 4)).toBe("1234");
  });
});

describe("getCalendarDays", () => {
  it("includes leap day and the correct leading weekday cells", () => {
    const days = getCalendarDays(2024, 1);

    expect(days.slice(0, 4)).toEqual([null, null, null, null]);
    expect(days[4]).toBe(1);
    expect(days[days.length - 1]).toBe(29);
  });

  it("supports a custom first weekday", () => {
    const days = getCalendarDays(2024, 1, 1);

    expect(days[0]).toBeNull();
    expect(days[3]).toBe(1);
  });
});
