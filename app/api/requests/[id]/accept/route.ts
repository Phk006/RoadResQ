import { NextResponse } from "next/server";
import { z } from "zod";
import { createFuelRequestService } from "@/lib/requests/service";
import { logger } from "@/lib/observability/logger";

const acceptSchema = z.object({
  partnerId: z.string().min(1),
  partnerName: z.string().min(1),
  actorRole: z.enum(["FUEL_PARTNER", "OPERATIONS_ADMIN", "SUPER_ADMIN"]).default("FUEL_PARTNER"),
  actorId: z.string().uuid().optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const { id } = await params;
    const payload: unknown = await request.json();
    const parsed = acceptSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: { code: "VALIDATION_ERROR", message: "Invalid accept payload", details: parsed.error.flatten() } }, { status: 400 });
    }

    const service = createFuelRequestService();
    const requestRecord = await service.findRequestById(id);
    if (!requestRecord) {
      return NextResponse.json({ data: null, error: { code: "NOT_FOUND", message: "Request not found" } }, { status: 404 });
    }
    if (requestRecord.assignedPartnerId !== parsed.data.partnerId) {
      return NextResponse.json({ data: null, error: { code: "FORBIDDEN", message: "Only the assigned partner can accept this request" } }, { status: 403 });
    }

    const updated = await service.updateRequestStatus({
      id,
      nextStatus: "PARTNER_ACCEPTED",
      actorRole: parsed.data.actorRole,
      actorId: parsed.data.actorId,
      reason: `Accepted by partner ${parsed.data.partnerId}`
    });

    logger.info("request.partner_accepted", { requestId, requestRecordId: id, partnerId: parsed.data.partnerId });

    return NextResponse.json(
      {
        data: {
          requestId: updated.updated.id,
          status: updated.updated.status,
          partnerId: parsed.data.partnerId,
          partnerName: parsed.data.partnerName
        },
        error: null
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("request.partner_accept_failed", { requestId, error: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ data: null, error: { code: "REQUEST_ACCEPT_FAILED", message: error instanceof Error ? error.message : "Unable to accept request" } }, { status: 500 });
  }
}
