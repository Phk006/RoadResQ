import { NextResponse } from "next/server";
import { logger } from "@/lib/observability/logger";
import { parseFuelSms } from "@/lib/sms/parser";
import { createFuelRequestService } from "@/lib/requests/service";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const payload: unknown = await request.json();
    const body = typeof payload === "object" && payload !== null && "body" in payload ? String((payload as { body?: unknown }).body ?? "") : "";
    const from = typeof payload === "object" && payload !== null && "from" in payload ? String((payload as { from?: unknown }).from ?? "") : "";
    if (!from.trim()) {
      return NextResponse.json({ data: null, error: { code: "PHONE_REQUIRED", message: "Sender phone number is required for SMS fallback" } }, { status: 400 });
    }
    const parsed = parseFuelSms(body);
    const location = typeof payload === "object" && payload !== null ? payload as { latitude?: unknown; longitude?: unknown } : {};
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        {
          data: {
            requestId,
            status: "LOCATION_REQUIRED",
            message: "Reply with coordinates or a landmark so we can dispatch the nearest partner without fabricating GPS."
          },
          error: null
        },
        { status: 202 }
      );
    }
    const service = createFuelRequestService();
    const result = await service.createRequest({
      contactPhone: from,
      customerName: undefined,
      idempotencyKey: typeof payload === "object" && payload !== null && "idempotencyKey" in payload ? String((payload as { idempotencyKey?: unknown }).idempotencyKey ?? crypto.randomUUID()) : crypto.randomUUID(),
      fuelType: parsed.fuelType,
      quantityLitres: parsed.quantityLitres,
      latitude,
      longitude,
      priority: "HIGH",
      requestChannel: "SMS"
    });
    logger.info("sms.request_created", { requestId, storageMode: result.storageMode, fuelType: parsed.fuelType });
    return NextResponse.json(
      {
        data: {
          requestId: result.request.id,
          status: result.request.status,
          message: "SMS request received and queued for dispatch.",
          storageMode: result.storageMode
        },
        error: null
      },
      { status: 201 }
    );
  } catch (error) {
    logger.warn("sms.inbound_failed", { requestId, error: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json(
      { data: null, error: { code: "SMS_INBOUND_FAILED", message: error instanceof Error ? error.message : "Unable to process inbound SMS" } },
      { status: 400 }
    );
  }
}
