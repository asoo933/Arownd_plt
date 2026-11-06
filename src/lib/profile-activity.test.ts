import { describe, expect, it } from "vitest";
import { getRecentActivity } from "./profile-activity";

describe("getRecentActivity", () => {
  it("returns the newest items first and respects the requested limit", () => {
    const items = [
      { id: "old", created_at: "2026-01-01T10:00:00.000Z" },
      { id: "new", created_at: "2026-03-01T10:00:00.000Z" },
      { id: "middle", created_at: "2026-02-01T10:00:00.000Z" },
    ];

    expect(getRecentActivity(items, 2).map((item) => item.id)).toEqual(["new", "middle"]);
  });

  it("does not mutate the source array and keeps invalid dates last", () => {
    const items = [
      { id: "invalid", created_at: "not-a-date" },
      { id: "valid", created_at: "2026-01-01T10:00:00.000Z" },
    ];

    expect(getRecentActivity(items).map((item) => item.id)).toEqual(["valid", "invalid"]);
    expect(items[0]?.id).toBe("invalid");
  });

  it("returns an empty list for a non-positive limit", () => {
    expect(getRecentActivity([{ created_at: "2026-01-01T10:00:00.000Z" }], 0)).toEqual([]);
  });
});
