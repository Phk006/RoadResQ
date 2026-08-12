import { describe, expect, it } from "vitest";
import { createFuelRequestService } from "@/lib/requests/service";

describe("fuel request service", () => {
  it("persists and deduplicates requests in memory when Supabase is not configured", async () => {
    const service = createFuelRequestService();
    const first = await service.createRequest({
      contactPhone: "+91 98765 43210",
      idempotencyKey: "demo-request-key",
      fuelType: "PETROL",
      quantityLitres: 3,
      latitude: 12.9716,
      longitude: 77.5946,
      priority: "HIGH",
      requestChannel: "WEB"
    });
    const second = await service.createRequest({
      contactPhone: "+91 98765 43210",
      idempotencyKey: "demo-request-key",
      fuelType: "PETROL",
      quantityLitres: 3,
      latitude: 12.9716,
      longitude: 77.5946,
      priority: "HIGH",
      requestChannel: "WEB"
    });

    expect(first.request.id).toBe(second.request.id);
    expect(first.storageMode).toBe("IN_MEMORY");
    expect(first.quote.total).toBeGreaterThan(0);
  });
});
