import { describe, expect, it } from "vitest";
import { createFuelRequestService } from "@/lib/requests/service";
import { selectDispatchDecision } from "@/lib/dispatch/service";

describe("dispatch service", () => {
  it("selects the most serviceable partner", () => {
    const decision = selectDispatchDecision(
      {
        requestId: "request-1",
        fuelType: "PETROL",
        quantityLitres: 3,
        priority: "HIGH",
        latitude: 12.9716,
        longitude: 77.5946,
        currentStatus: "SEARCHING"
      },
      [
        {
          partnerId: "partner-slow",
          partnerName: "Slow Fuel",
          distanceKm: 14,
          etaMinutes: 25,
          fuelAvailabilityRatio: 0.9,
          deliveryCapacityRatio: 0.8,
          reliability: 0.7,
          workloadRatio: 0.8,
          serviceRadiusKm: 15,
          operating: true,
          fuelTypes: ["PETROL"],
          availableLitres: 100,
          isDeliveryAgentAvailable: true
        },
        {
          partnerId: "partner-fast",
          partnerName: "Fast Fuel",
          distanceKm: 4,
          etaMinutes: 9,
          fuelAvailabilityRatio: 1,
          deliveryCapacityRatio: 1,
          reliability: 1,
          workloadRatio: 0.2,
          serviceRadiusKm: 15,
          operating: true,
          fuelTypes: ["PETROL", "DIESEL"],
          availableLitres: 200,
          isDeliveryAgentAvailable: true
        }
      ]
    );

    expect(decision.decision?.partnerId).toBe("partner-fast");
    expect(decision.decision?.nextStatus).toBe("ASSIGNED");
  });

  it("persists a dispatched assignment through the request service", async () => {
    const service = createFuelRequestService();
    const created = await service.createRequest({
      contactPhone: "+91 98765 43210",
      idempotencyKey: "dispatch-service-key",
      fuelType: "PETROL",
      quantityLitres: 3,
      latitude: 12.9716,
      longitude: 77.5946,
      priority: "HIGH",
      requestChannel: "WEB"
    });

    await service.updateRequestStatus({
      id: created.request.id,
      nextStatus: "SEARCHING",
      actorRole: "OPERATIONS_ADMIN"
    });

    const assigned = await service.assignRequestPartner({
      id: created.request.id,
      partnerId: "partner-fast",
      partnerName: "Fast Fuel",
      score: 0.94,
      etaMinutes: 9,
      actorRole: "OPERATIONS_ADMIN",
      reason: "Selected by scoring engine"
    });

    const fetched = await service.findRequestById(created.request.id);

    expect(assigned.status).toBe("ASSIGNED");
    expect(assigned.assignedPartnerId).toBe("partner-fast");
    expect(fetched?.assignedPartnerName).toBe("Fast Fuel");
  });
});
