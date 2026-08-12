import { NextResponse } from "next/server";
import { z } from "zod";
import { createFuelRequestService } from "@/lib/requests/service";
import { logger } from "@/lib/observability/logger";

const requestStatusChangeSchema = z.object({
  nextStatus: z.enum(["CREATED", "SEARCHING", "ASSIGNED", "PARTNER_ACCEPTED", "DISPATCHED", "EN_ROUTE", "ARRIVED", "DELIVERING", "OTP_PENDING", "COMPLETED", "CANCELLED", "FAILED", "EXPIRED"]),
  actorRole: z.enum(["CUSTOMER", "FUEL_PARTNER", "DELIVERY_AGENT", "OPERATIONS_ADMIN", "SUPER_ADMIN"]).optional(),
  actorId: z.string().uuid().optional(),
  reason: z.string().trim().max(240).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const { id } = await params;
    const payload: unknown = await request.json();
    const parsed = requestStatusChangeSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: { code: "VALIDATION_ERROR", message: "Invalid status transition payload", details: parsed.error.flatten() } }, { status: 400 });
    }

    const service = createFuelRequestService();
    const result = await service.updateRequestStatus({
      id,
      nextStatus: parsed.data.nextStatus,
      actorRole: parsed.data.actorRole,
      actorId: parsed.data.actorId,
      reason: parsed.data.reason
    });

    logger.info("request.status_updated", {
      requestId,
      requestRecordId: id,
      fromStatus: result.current.status,
      toStatus: result.updated.status
    });

    return NextResponse.json(
      {
        data: {
          requestId: result.updated.id,
          fromStatus: result.current.status,
          toStatus: result.updated.status,
          updatedAt: result.updated.updatedAt
        },
        error: null
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("request.status_update_failed", { requestId, error: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json(
      {
        data: null,
        error: { code: "REQUEST_STATUS_UPDATE_FAILED", message: error instanceof Error ? error.message : "Unable to update request status" }
      },
      { status: 500 }
    );
  }
}
