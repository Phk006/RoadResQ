import { NextResponse } from "next/server";
import { z } from "zod";
import { createFuelRequestService } from "@/lib/requests/service";
import { logger } from "@/lib/observability/logger";

const rejectSchema = z.object({
  partnerId: z.string().min(1),
  reason: z.string().trim().min(1).max(240).optional(),
  actorRole: z.enum(["FUEL_PARTNER", "OPERATIONS_ADMIN", "SUPER_ADMIN"]).default("FUEL_PARTNER"),
  actorId: z.string().uuid().optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const { id } = await params;
    const payload: unknown = await request.json();
    const parsed = rejectSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: { code: "VALIDATION_ERROR", message: "Invalid reject payload", details: parsed.error.flatten() } }, { status: 400 });
    }

    const service = createFuelRequestService();
    const requestRecord = await service.findRequestById(id);
    if (!requestRecord) {
      return NextResponse.json({ data: null, error: { code: "NOT_FOUND", message: "Request not found" } }, { status: 404 });
    }
    if (requestRecord.assignedPartnerId !== parsed.data.partnerId) {
      return NextResponse.json({ data: null, error: { code: "FORBIDDEN", message: "Only the assigned partner can reject this request" } }, { status: 403 });
    }

    const updated = await service.updateRequestStatus({
      id,
      nextStatus: "SEARCHING",
      actorRole: parsed.data.actorRole,
      actorId: parsed.data.actorId,
      reason: parsed.data.reason ?? `Rejected by partner ${parsed.data.partnerId}`
    });

    logger.info("request.partner_rejected", { requestId, requestRecordId: id, partnerId: parsed.data.partnerId });

    return NextResponse.json(
      {
        data: {
          requestId: updated.updated.id,
          status: updated.updated.status
        },
        error: null
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("request.partner_reject_failed", { requestId, error: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ data: null, error: { code: "REQUEST_REJECT_FAILED", message: error instanceof Error ? error.message : "Unable to reject request" } }, { status: 500 });
  }
}
