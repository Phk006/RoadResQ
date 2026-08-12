import { NextResponse } from "next/server";
import { logger } from "@/lib/observability/logger";
import { fuelRequestSchema } from "@/lib/schemas/requests";
import { createFuelRequestService } from "@/lib/requests/service";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const payload: unknown = await request.json();
    const parsed = fuelRequestSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: { code: "VALIDATION_ERROR", message: "Invalid fuel request", details: parsed.error.flatten() } }, { status: 400 });
    }
    const service = createFuelRequestService();
    const result = await service.createRequest(parsed.data);
    logger.info("request.created", { requestId, fuelType: result.request.fuelType, storageMode: result.storageMode, requestRecordId: result.request.id });
    return NextResponse.json(
      {
        data: {
          requestId: result.request.id,
          status: result.request.status,
          storageMode: result.storageMode,
          estimatedTotal: result.quote.total,
          currency: result.quote.currency
        },
        error: null
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ data: null, error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unable to create request";
    logger.error("request.create_failed", { requestId, message });
    return NextResponse.json({ data: null, error: { code: "REQUEST_CREATE_FAILED", message } }, { status: 503 });
  }
}
