import { describe, expect, it } from "vitest";
import { ManualLocationProvider } from "@/lib/location/provider";

describe("ManualLocationProvider", () => {
  it("returns the explicitly supplied location", async () => {
    const timestamp = new Date("2026-01-01T00:00:00Z");
    await expect(new ManualLocationProvider({ latitude: 12.9716, longitude: 77.5946, timestamp }).getCurrentLocation()).resolves.toEqual({ latitude: 12.9716, longitude: 77.5946, timestamp });
  });
});
