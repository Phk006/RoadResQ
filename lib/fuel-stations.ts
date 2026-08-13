export type FuelStationPoint = {
  latitude: number;
  longitude: number;
  label: string;
};

export type FuelStationResult = {
  id: string;
  osmType: "node" | "way" | "relation";
  name: string;
  address: string;
  phone: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
  mapUrl: string;
  embedUrl: string;
  osmUrl: string;
  source: "OpenStreetMap";
};

export type FuelStationSearchResponse = {
  queryLabel: string;
  latitude: number;
  longitude: number;
  stations: FuelStationResult[];
};

export const MAJOR_INDIAN_CITIES: Array<FuelStationPoint & { slug: string }> = [
  { slug: "delhi", label: "Delhi", latitude: 28.6139, longitude: 77.209 },
  { slug: "mumbai", label: "Mumbai", latitude: 19.076, longitude: 72.8777 },
  { slug: "bengaluru", label: "Bengaluru", latitude: 12.9716, longitude: 77.5946 },
  { slug: "chennai", label: "Chennai", latitude: 13.0827, longitude: 80.2707 },
  { slug: "kolkata", label: "Kolkata", latitude: 22.5726, longitude: 88.3639 },
  { slug: "hyderabad", label: "Hyderabad", latitude: 17.385, longitude: 78.4867 },
  { slug: "pune", label: "Pune", latitude: 18.5204, longitude: 73.8567 },
  { slug: "ahmedabad", label: "Ahmedabad", latitude: 23.0225, longitude: 72.5714 }
];

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter"
];

const APP_USER_AGENT = "Fuel10/1.0 (+https://github.com/Phk006/RoadResQ)";

export function isCoordinateQuery(input: string) {
  return /-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?/.test(input.trim());
}

export function parseCoordinateQuery(input: string): FuelStationPoint | null {
  const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude, label: "Custom coordinates" };
}

export function normalizeDialerPhone(phone: string) {
  const firstNumber = phone.split(/[,;/|]/)[0]?.trim() ?? "";
  const cleaned = firstNumber.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("+") ? cleaned : cleaned.replace(/\+/g, "");
}

export function formatStationAddress(tags: Record<string, string> | undefined, latitude: number, longitude: number) {
  if (!tags) return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  const line1 = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ").trim();
  const locality = [tags["addr:suburb"], tags["addr:city"], tags["addr:town"], tags["addr:village"]].find(Boolean);
  const state = tags["addr:state"];
  const pieces = [line1, locality, state].filter((item): item is string => Boolean(item?.trim()));
  return pieces.length ? pieces.join(", ") : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export function buildMapEmbedUrl(latitude: number, longitude: number, zoom = 16) {
  const span = 0.0085 / Math.max(Math.cos((latitude * Math.PI) / 180), 0.2);
  const west = longitude - span;
  const east = longitude + span;
  const south = latitude - 0.0085;
  const north = latitude + 0.0085;
  const params = new URLSearchParams({
    bbox: `${west},${south},${east},${north}`,
    layer: "mapnik",
    marker: `${latitude},${longitude}`
  });
  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}#map=${zoom}/${latitude}/${longitude}`;
}

export function buildMapUrl(latitude: number, longitude: number, zoom = 17) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`;
}

function computeDistanceKm(aLatitude: number, aLongitude: number, bLatitude: number, bLongitude: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRadians(bLatitude - aLatitude);
  const dLon = toRadians(bLongitude - aLongitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(aLatitude)) * Math.cos(toRadians(bLatitude)) * Math.sin(dLon / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function geocodeIndianLocation(query: string): Promise<FuelStationPoint> {
  const trimmed = query.trim();
  const coordinateQuery = parseCoordinateQuery(trimmed);
  if (coordinateQuery) return coordinateQuery;

  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "in");
  url.searchParams.set("q", trimmed);

  const response = await fetchWithTimeout(
    url.toString(),
    {
      headers: {
        "Accept-Language": "en-IN,en;q=0.8",
        "User-Agent": APP_USER_AGENT,
        Referer: "https://github.com/Phk006/RoadResQ"
      }
    },
    12000
  );

  if (!response.ok) {
    throw new Error(`Could not geocode "${trimmed}" right now.`);
  }

  const results = (await response.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
  const match = results[0];
  if (!match) {
    throw new Error(`No Indian location matched "${trimmed}". Try a city or landmark.`);
  }

  return {
    latitude: Number(match.lat),
    longitude: Number(match.lon),
    label: match.display_name ?? trimmed
  };
}

function buildOverpassQuery(latitude: number, longitude: number, radiusMeters: number) {
  return `
[out:json][timeout:30];
(
  nwr["amenity"="fuel"](around:${radiusMeters},${latitude},${longitude});
);
out center;
`.trim();
}

function elementCoordinates(element: {
  type?: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
}) {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { latitude: element.lat, longitude: element.lon };
  }
  if (element.center && typeof element.center.lat === "number" && typeof element.center.lon === "number") {
    return { latitude: element.center.lat, longitude: element.center.lon };
  }
  return null;
}

function extractPhone(tags: Record<string, string> | undefined) {
  if (!tags) return null;
  const raw = tags["contact:phone"] ?? tags.phone ?? tags["contact:mobile"] ?? tags["service:phone"] ?? null;
  if (!raw) return null;
  return raw.split(/[,;/|]/)[0]?.trim() || null;
}

export async function searchFuelStationsAround(input: {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  limit?: number;
}): Promise<FuelStationResult[]> {
  const radiusMeters = input.radiusMeters ?? 10000;
  const limit = input.limit ?? 20;
  const query = buildOverpassQuery(input.latitude, input.longitude, radiusMeters);

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "User-Agent": APP_USER_AGENT,
            Referer: "https://github.com/Phk006/RoadResQ"
          },
          body: new URLSearchParams({ data: query }).toString()
        },
        20000
      );

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as {
        elements?: Array<{
          type: "node" | "way" | "relation";
          id: number;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: Record<string, string>;
        }>;
      };

      const stations = (payload.elements ?? [])
        .map((element) => {
          const coordinates = elementCoordinates(element);
          if (!coordinates) return null;
          const name = element.tags?.name ?? element.tags?.brand ?? element.tags?.operator ?? "Fuel station";
          const phone = extractPhone(element.tags);
          return {
            id: `${element.type}-${element.id}`,
            osmType: element.type,
            name,
            address: formatStationAddress(element.tags, coordinates.latitude, coordinates.longitude),
            phone,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            distanceKm: computeDistanceKm(input.latitude, input.longitude, coordinates.latitude, coordinates.longitude),
            mapUrl: buildMapUrl(coordinates.latitude, coordinates.longitude),
            embedUrl: buildMapEmbedUrl(coordinates.latitude, coordinates.longitude),
            osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
            source: "OpenStreetMap" as const
          } satisfies FuelStationResult;
        })
        .filter((station): station is FuelStationResult => Boolean(station))
        .sort((left, right) => left.distanceKm - right.distanceKm)
        .slice(0, limit);

      return stations;
    } catch {
      // Try the next public Overpass endpoint when one is temporarily busy.
    }
  }

  throw new Error("Fuel station lookup is temporarily unavailable. Please try again in a moment.");
}
