"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MAJOR_INDIAN_CITIES,
  buildMapEmbedUrl,
  buildMapUrl,
  normalizeDialerPhone,
  type FuelStationPoint,
  type FuelStationResult,
  type FuelStationSearchResponse
} from "@/lib/fuel-stations";

type FuelStationExplorerProps = {
  currentCoordinates: FuelStationPoint | null;
  onPickCoordinates: (coordinates: FuelStationPoint) => void;
};

const DEFAULT_CITY = MAJOR_INDIAN_CITIES[0];

export function FuelStationExplorer({ currentCoordinates, onPickCoordinates }: FuelStationExplorerProps) {
  const initialLoadRef = useRef(false);
  const [query, setQuery] = useState(DEFAULT_CITY.label);
  const [status, setStatus] = useState("Search a city, landmark, or coordinates in India to find live fuel stations.");
  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState<FuelStationResult[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<FuelStationPoint>({
    latitude: DEFAULT_CITY.latitude,
    longitude: DEFAULT_CITY.longitude,
    label: DEFAULT_CITY.label
  });

  const selectedStation = useMemo(
    () => stations.find((station) => station.id === selectedStationId) ?? stations[0] ?? null,
    [selectedStationId, stations]
  );

  const mapTarget: FuelStationPoint = selectedStation
    ? { latitude: selectedStation.latitude, longitude: selectedStation.longitude, label: selectedStation.name }
    : selectedLocation;
  const mapEmbedUrl = useMemo(() => buildMapEmbedUrl(mapTarget.latitude, mapTarget.longitude), [mapTarget.latitude, mapTarget.longitude]);

  async function runSearch(url: string, label: string, syncForm: boolean) {
    setLoading(true);
    setStatus(`Finding fuel stations near ${label}...`);
    try {
      const response = await fetch(url);
      const payload = (await response.json()) as { data?: FuelStationSearchResponse; error?: { message?: string } };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Unable to load fuel stations right now.");
      }

      setStations(payload.data.stations);
      setSelectedStationId(payload.data.stations[0]?.id ?? null);
      setSelectedLocation({
        latitude: payload.data.latitude,
        longitude: payload.data.longitude,
        label: payload.data.queryLabel
      });
      if (syncForm) {
        onPickCoordinates({
          latitude: payload.data.latitude,
          longitude: payload.data.longitude,
          label: payload.data.queryLabel
        });
      }
      setStatus(
        payload.data.stations.length
          ? `Loaded ${payload.data.stations.length} fuel stations near ${payload.data.queryLabel}.`
          : `No fuel stations were found near ${payload.data.queryLabel}. Try a wider search.`
      );
    } catch (error) {
      setStations([]);
      setSelectedStationId(null);
      setStatus(error instanceof Error ? error.message : "Could not load fuel stations.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setStatus("Type a city, landmark, or coordinates first.");
      return;
    }
    const url = new URL("/api/fuel-stations", window.location.origin);
    url.searchParams.set("query", trimmed);
    url.searchParams.set("radiusMeters", "12000");
    url.searchParams.set("limit", "12");
    await runSearch(url.toString(), trimmed, true);
  }

  async function loadCity(city: (typeof MAJOR_INDIAN_CITIES)[number]) {
    setQuery(city.label);
    const url = new URL("/api/fuel-stations", window.location.origin);
    url.searchParams.set("latitude", city.latitude.toString());
    url.searchParams.set("longitude", city.longitude.toString());
    url.searchParams.set("radiusMeters", "12000");
    url.searchParams.set("limit", "12");
    await runSearch(url.toString(), city.label, true);
  }

  async function useRequestLocation() {
    if (!currentCoordinates) {
      setStatus("Your request location is not ready yet.");
      return;
    }

    const url = new URL("/api/fuel-stations", window.location.origin);
    url.searchParams.set("latitude", currentCoordinates.latitude.toString());
    url.searchParams.set("longitude", currentCoordinates.longitude.toString());
    url.searchParams.set("radiusMeters", "12000");
    url.searchParams.set("limit", "12");
    await runSearch(url.toString(), currentCoordinates.label ?? "your request location", true);
  }

  function selectStation(station: FuelStationResult) {
    setSelectedStationId(station.id);
    setSelectedLocation({
      latitude: station.latitude,
      longitude: station.longitude,
      label: station.name
    });
    onPickCoordinates({
      latitude: station.latitude,
      longitude: station.longitude,
      label: station.name
    });
    setStatus(`Selected ${station.name}.`);
  }

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    void loadCity(DEFAULT_CITY);
  }, []);

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.9)] animate-rise-in motion-reduce:animate-none">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">India fuel finder</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Search live fuel stations and tap to call</h3>
        </div>
        <p className="max-w-md text-sm leading-6 text-slate-300">
          OpenStreetMap and Overpass power the station list. Tap a phone number to launch the dialer, or tap a station to move the map.
        </p>
      </div>

      <form className="mt-5 flex flex-col gap-3" onSubmit={handleSearch}>
        <label className="grid gap-2 text-sm font-medium text-slate-200">
          Type a location above the map
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-orange-400 focus:bg-slate-900"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Delhi, Bengaluru, 12.9716,77.5946"
              autoComplete="off"
            />
            <button
              type="submit"
              className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
            <button
              type="button"
              className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void useRequestLocation()}
              disabled={loading || !currentCoordinates}
            >
              Use request location
            </button>
          </div>
        </label>
      </form>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-500 hover:shadow-[0_20px_60px_-35px_rgba(15,23,42,0.95)]">
            <iframe
              title="Fuel station map"
              src={mapEmbedUrl}
              className="h-[300px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="flex flex-col gap-2 border-t border-slate-700 px-4 py-3 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <span>{mapTarget.label}</span>
              <a
                className="font-semibold text-orange-300 transition hover:text-orange-200"
                href={buildMapUrl(mapTarget.latitude, mapTarget.longitude)}
                target="_blank"
                rel="noreferrer"
              >
                Open exact map
              </a>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {stations.length ? (
              stations.map((station) => {
                const phone = station.phone ? normalizeDialerPhone(station.phone) : "";
                return (
                  <article key={station.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-400">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-white">{station.name}</h4>
                        <p className="mt-1 text-sm text-slate-300">{station.address}</p>
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-orange-400 hover:text-orange-200"
                        onClick={() => selectStation(station)}
                      >
                        View
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{station.distanceKm.toFixed(2)} km away</span>
                      <span>•</span>
                      <span>{station.source}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {phone ? (
                        <a
                          href={`tel:${phone}`}
                          className="inline-flex items-center justify-center rounded-full bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-600"
                        >
                          Call {station.phone}
                        </a>
                      ) : (
                        <span className="inline-flex items-center justify-center rounded-full bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300">
                          No phone listed
                        </span>
                      )}
                      <a
                        href={station.mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                      >
                        Open map
                      </a>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-4 text-sm text-slate-300 md:col-span-2">
                Search a location to show nearby fuel station numbers and coordinates.
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-700 bg-slate-900 p-4 lg:sticky lg:top-4">
          <p className="text-sm font-semibold text-white">Major city emergency pump numbers</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">Choose a city to load nearby stations and call the nearest number.</p>

          <div className="mt-4 grid gap-2">
            {MAJOR_INDIAN_CITIES.map((city) => (
              <button
                key={city.slug}
                type="button"
                onClick={() => void loadCity(city)}
                className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-400 hover:bg-slate-800"
              >
                <span className="text-sm font-semibold text-white">{city.label}</span>
                <span className="text-xs text-slate-400">tap to load</span>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">Status</p>
            <p className="mt-2 leading-6">{status}</p>
          </div>

          {currentCoordinates ? (
            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
              <p className="font-semibold text-slate-100">Request location</p>
              <p className="mt-2 leading-6">
                {currentCoordinates.label ?? "Current request location"} — {currentCoordinates.latitude.toFixed(5)}, {currentCoordinates.longitude.toFixed(5)}
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
