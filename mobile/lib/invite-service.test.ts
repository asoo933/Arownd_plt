import { describe, expect, it } from "vitest";

import { formatInviteCode, normalizeInviteCode } from "./invite-service";

describe("Arownd invite codes", () => {
  it("normalizes formatted modern codes", () => {
    expect(normalizeInviteCode("ARW-2345-6789-ABCD")).toBe("23456789ABCD");
  });

  it("keeps legacy hexadecimal codes valid", () => {
    expect(normalizeInviteCode("ARW-0123-ABCD-4567-EF89")).toBe("0123ABCDEF4567EF89");
  });

  it("formats modern codes with a short brand prefix", () => {
    expect(formatInviteCode("23456789ABCD")).toBe("ARW-2345-6789-ABCD");
  });

  it("formats legacy codes without changing their value", () => {
    expect(formatInviteCode("0123ABCDEF4567EF")).toBe("ARW-0123-ABCD-EF45-67EF");
  });

  it("rejects malformed codes", () => {
    expect(normalizeInviteCode("ARW-0000-1111-OOOO")).toBeNull();
  });
});
