import { NextResponse } from "next/server";
import { createFuelRequestService } from "@/lib/requests/service";
import { logger } from "@/lib/observability/logger";

function normalizePhone(phone: string) {
  const digits = phone.trim().replace(/\D/g, "");
  return digits;
}

export async function GET(request: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  const service = createFuelRequestService();
  const { id } = await Promise.resolve(params);
  const record = await service.findRequestById(id);
  if (!record) {
    logger.info("request.lookup_missing", { requestId, lookupId: id });
    return NextResponse.json({ data: null, error: { code: "NOT_FOUND", message: "Request not found" } }, { status: 404 });
  }

  const contactPhone = new URL(request.url).searchParams.get("contactPhone");
  if (contactPhone && normalizePhone(contactPhone) !== record.contactPhone) {
    logger.warn("request.lookup_forbidden", { requestId, lookupId: id });
    return NextResponse.json({ data: null, error: { code: "FORBIDDEN", message: "Request cannot be viewed with the supplied phone number" } }, { status: 403 });
  }

  return NextResponse.json(
    {
      data: {
        requestId: record.id,
        status: record.status,
        fuelType: record.fuelType,
        quantityLitres: record.quantityLitres,
        assignedPartnerId: record.assignedPartnerId,
        assignedPartnerName: record.assignedPartnerName,
        assignedPartnerScore: record.assignedPartnerScore,
        assignedPartnerEtaMinutes: record.assignedPartnerEtaMinutes,
        assignedAt: record.assignedAt,
        estimatedTotal: record.estimatedTotal,
        currency: record.currency,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      },
      error: null
    },
    { status: 200 }
  );
}
