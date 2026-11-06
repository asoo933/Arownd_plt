import { describe, expect, it, vi } from "vitest";
import { goBackOrTo } from "@/lib/nav";

describe("goBackOrTo", () => {
  it("يعود خطوة عند وجود سجل، وإلا ينتقل للمسار البديل", () => {
    const back = vi.fn();
    const navigate = vi.fn();
    const router = { history: { back }, navigate };

    const original = window.history.length;
    // jsdom: length يبدأ عادة 1 → لا سجل سابق
    if (original <= 1) {
      goBackOrTo(router, "/orders");
      expect(navigate).toHaveBeenCalledWith({ to: "/orders" });
      expect(back).not.toHaveBeenCalled();
    }

    window.history.pushState({}, "", "/a");
    window.history.pushState({}, "", "/b");
    goBackOrTo(router, "/orders");
    expect(back).toHaveBeenCalledTimes(1);
  });
});
