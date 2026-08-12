import { describe, expect, it } from "vitest";
import { calculatePrice } from "@/lib/pricing/service";

describe("calculatePrice", () => {
  it("builds a transparent INR quote", () => {
    expect(calculatePrice(3, 100)).toMatchObject({ fuelSubtotal: 300, total: 448, currency: "INR" });
  });
  it("rejects invalid quantity", () => expect(() => calculatePrice(0, 100)).toThrow("positive"));
});
