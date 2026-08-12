import { describe, expect, it } from "vitest";
import { scoreCandidate } from "@/lib/dispatch/scoring";
import { canTransition, transition } from "@/lib/dispatch/state-machine";

describe("dispatch scoring", () => {
  it("prefers a more serviceable candidate", () => expect(scoreCandidate({ etaMinutes: 10, distanceKm: 2, fuelAvailabilityRatio: 1, deliveryCapacityRatio: 1, reliability: 1, workloadRatio: 0 })).toBeGreaterThan(scoreCandidate({ etaMinutes: 90, distanceKm: 20, fuelAvailabilityRatio: 0.5, deliveryCapacityRatio: 0.5, reliability: 0.5, workloadRatio: 1 })));
});
describe("request state machine", () => {
  it("allows the happy path and rejects arbitrary jumps", () => { expect(canTransition("CREATED", "SEARCHING")).toBe(true); expect(() => transition("CREATED", "COMPLETED")).toThrow("Invalid request transition"); });
});
