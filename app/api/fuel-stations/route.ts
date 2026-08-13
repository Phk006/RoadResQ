import { NextResponse } from "next/server";
import { z } from "zod";
import { geocodeIndianLocation, searchFuelStationsAround, type FuelStationPoint } from "@/lib/fuel-stations";

const searchParamsSchema = z.object({
  query: z.string().trim().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusMeters: z.coerce.number().int().positive().max(50_000).default(10_000),
  limit: z.coerce.number().int().positive().max(30).default(20)
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = searchParamsSchema.safeParse({
      query: url.searchParams.get("query") ?? undefined,
      latitude: url.searchParams.get("latitude") ?? undefined,
      longitude: url.searchParams.get("longitude") ?? undefined,
      radiusMeters: url.searchParams.get("radiusMeters") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Provide a city, landmark, or coordinate pair in India." }
        },
        { status: 400 }
      );
    }

    const { query, latitude, longitude, radiusMeters, limit } = parsed.data;
    let selectedLocation: FuelStationPoint;

    if (typeof latitude === "number" && typeof longitude === "number") {
      selectedLocation = {
        latitude,
        longitude,
        label: query?.trim() ? query.trim() : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
      };
    } else if (query) {
      selectedLocation = await geocodeIndianLocation(query);
    } else {
      return NextResponse.json(
        { data: null, error: { code: "VALIDATION_ERROR", message: "Location coordinates are missing." } },
        { status: 400 }
      );
    }

    const stations = await searchFuelStationsAround({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      radiusMeters,
      limit
    });

    return NextResponse.json(
      {
        data: {
          queryLabel: selectedLocation.label,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          stations
        },
        error: null
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600"
        }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to search fuel stations";
    return NextResponse.json({ data: null, error: { code: "FUEL_STATION_LOOKUP_FAILED", message } }, { status: 503 });
  }
}
