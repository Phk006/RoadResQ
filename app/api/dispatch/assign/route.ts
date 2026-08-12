import { NextResponse } from "next/server";
import { logger } from "@/lib/observability/logger";
import { selectDispatchDecision } from "@/lib/dispatch/service";
import { createFuelRequestService } from "@/lib/requests/service";
import { z } from "zod";

const dispatchAssignmentSchema = z.object({
  requestId: z.string().min(1),
  fuelType: z.enum(["PETROL", "DIESEL"]),
  quantityLitres: z.coerce.number().positive().max(20),
  priority: z.enum(["NORMAL", "HIGH"]).default("NORMAL"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  currentStatus: z.enum(["CREATED", "SEARCHING", "ASSIGNED", "PARTNER_ACCEPTED", "DISPATCHED", "EN_ROUTE", "ARRIVED", "DELIVERING", "OTP_PENDING", "COMPLETED", "CANCELLED", "FAILED", "EXPIRED"]).default("SEARCHING"),
  candidates: z.array(
    z.object({
      partnerId: z.string().min(1),
      partnerName: z.string().min(1),
      distanceKm: z.coerce.number().nonnegative(),
      etaMinutes: z.coerce.number().nonnegative(),
      fuelAvailabilityRatio: z.coerce.number().min(0).max(1),
      deliveryCapacityRatio: z.coerce.number().min(0).max(1),
      reliability: z.coerce.number().min(0).max(1),
      workloadRatio: z.coerce.number().min(0).max(1),
      serviceRadiusKm: z.coerce.number().positive(),
      operating: z.boolean(),
      fuelTypes: z.array(z.enum(["PETROL", "DIESEL"])).min(1),
      availableLitres: z.coerce.number().nonnegative(),
      isDeliveryAgentAvailable: z.boolean()
    })
  ).min(1)
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const payload: unknown = await request.json();
    const parsed = dispatchAssignmentSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: { code: "VALIDATION_ERROR", message: "Invalid dispatch payload", details: parsed.error.flatten() } }, { status: 400 });
    }

    const requestService = createFuelRequestService();
    const existingRequest = await requestService.findRequestById(parsed.data.requestId);
    if (!existingRequest) {
      return NextResponse.json({ data: null, error: { code: "NOT_FOUND", message: "Fuel request not found" } }, { status: 404 });
    }

    if (!["CREATED", "SEARCHING"].includes(existingRequest.status)) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "INVALID_STATE",
            message: `Dispatch can only start from CREATED or SEARCHING, found ${existingRequest.status}`
          }
        },
        { status: 409 }
      );
    }

    if (existingRequest.status !== "SEARCHING") {
      await requestService.updateRequestStatus({
        id: parsed.data.requestId,
        nextStatus: "SEARCHING",
        actorRole: "OPERATIONS_ADMIN",
        reason: "Dispatch pipeline started"
      });
    }

    const decision = selectDispatchDecision(
      {
        requestId: parsed.data.requestId,
        fuelType: parsed.data.fuelType,
        quantityLitres: parsed.data.quantityLitres,
        priority: parsed.data.priority,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        currentStatus: "SEARCHING"
      },
      parsed.data.candidates
    );

    if (!decision.decision) {
      logger.info("dispatch.no_candidates", { requestId, requestRecordId: parsed.data.requestId });
      return NextResponse.json(
        {
          data: {
            requestId: parsed.data.requestId,
            assigned: false,
            candidatesEvaluated: decision.candidates.length,
            status: "SEARCHING"
          },
          error: null
        },
        { status: 202 }
      );
    }

    const assigned = await requestService.assignRequestPartner({
      id: parsed.data.requestId,
      partnerId: decision.decision.partnerId,
      partnerName: decision.decision.partnerName,
      score: decision.decision.score,
      etaMinutes: parsed.data.candidates.find((candidate) => candidate.partnerId === decision.decision?.partnerId)?.etaMinutes ?? 0,
      actorRole: "OPERATIONS_ADMIN",
      reason: `Dispatch selected partner ${decision.decision.partnerId}`
    });

    logger.info("dispatch.partner_selected", {
      requestId,
      requestRecordId: parsed.data.requestId,
      partnerId: assigned.assignedPartnerId,
      score: assigned.assignedPartnerScore
    });

    return NextResponse.json(
      {
        data: {
          requestId: assigned.id,
          assigned: true,
          partnerId: assigned.assignedPartnerId,
          partnerName: assigned.assignedPartnerName,
          score: assigned.assignedPartnerScore,
          nextStatus: assigned.status,
          evaluatedCandidates: decision.decision.evaluatedCandidates
        },
        error: null
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("dispatch.assign_failed", { requestId, error: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ data: null, error: { code: "DISPATCH_FAILED", message: error instanceof Error ? error.message : "Unable to evaluate dispatch candidates" } }, { status: 500 });
  }
}
