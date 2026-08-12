import { NextResponse } from "next/server";
import { createFuelRequestService } from "@/lib/requests/service";

export async function GET(_: Request, { params }: { params: Promise<{ partnerId: string }> }) {
  const { partnerId } = await params;
  const service = createFuelRequestService();
  const requests = await service.listRequestsForPartner(partnerId);
  return NextResponse.json(
    {
      data: {
        partnerId,
        requests: requests.map((request) => ({
          requestId: request.id,
          status: request.status,
          fuelType: request.fuelType,
          quantityLitres: request.quantityLitres,
          assignedPartnerName: request.assignedPartnerName,
          assignedPartnerScore: request.assignedPartnerScore,
          assignedPartnerEtaMinutes: request.assignedPartnerEtaMinutes,
          customerLocation: { latitude: request.latitude, longitude: request.longitude },
          createdAt: request.createdAt,
          updatedAt: request.updatedAt
        }))
      },
      error: null
    },
    { status: 200 }
  );
}
