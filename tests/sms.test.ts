import { describe, expect, it } from "vitest";
import { MockSmsProvider } from "@/lib/providers/mock";

describe("MockSmsProvider", () => {
  it("normalizes a simple fallback command", () => {
    expect(new MockSmsProvider().normalizeMessage(" fuel  3 petrol ")).toBe("FUEL 3 PETROL");
  });
});
