import { NextResponse } from "next/server";
import { createFuelRequestService } from "@/lib/requests/service";

export async function GET() {
  const service = createFuelRequestService();
  const requests = await service.listAllRequests();
  return NextResponse.json(
    {
      data: {
        requests: requests.map((request) => ({
          requestId: request.id,
          status: request.status,
          fuelType: request.fuelType,
          quantityLitres: request.quantityLitres,
          priority: request.priority,
          assignedPartnerId: request.assignedPartnerId,
          assignedPartnerName: request.assignedPartnerName,
          assignedPartnerScore: request.assignedPartnerScore,
          assignedPartnerEtaMinutes: request.assignedPartnerEtaMinutes,
          contactPhone: request.contactPhone,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt
        }))
      },
      error: null
    },
    { status: 200 }
  );
}
