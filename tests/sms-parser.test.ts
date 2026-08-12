import { describe, expect, it } from "vitest";
import { parseFuelSms } from "@/lib/sms/parser";

describe("parseFuelSms", () => {
  it("parses a valid command", () => expect(parseFuelSms("FUEL 3 PETROL")).toEqual({ quantityLitres: 3, fuelType: "PETROL" }));
  it("rejects ambiguous input", () => expect(() => parseFuelSms("FUEL 3 PETROL 12.9,77.5")).toThrow("Expected format"));
});
