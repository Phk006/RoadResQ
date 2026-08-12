"use client";

import { useEffect, useMemo, useState } from "react";
import { BrowserGpsProvider } from "@/lib/location/provider";
import { calculatePrice, getEstimatedFuelPricePerLitre } from "@/lib/pricing/service";
import { RequestTracker } from "@/components/request-tracker";

type LocationState =
  | { status: "idle" | "loading" | "manual"; latitude: string; longitude: string; message: string }
  | { status: "ready"; latitude: string; longitude: string; message: string; accuracy?: number }
  | { status: "error"; latitude: string; longitude: string; message: string };

const initialLocation: LocationState = { status: "idle", latitude: "", longitude: "", message: "Location will be captured before you submit." };

function getDraftKey() {
  if (typeof window === "undefined") return crypto.randomUUID();
  const storageKey = "fuel10:request-idempotency-key";
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, created);
  return created;
}

export function CustomerRequestForm() {
  const [location, setLocation] = useState<LocationState>(initialLocation);
  const [contactPhone, setContactPhone] = useState("");
  const [fuelType, setFuelType] = useState<"PETROL" | "DIESEL">("PETROL");
  const [quantityLitres, setQuantityLitres] = useState("3");
  const [priority, setPriority] = useState<"NORMAL" | "HIGH">("HIGH");
  const [customerName, setCustomerName] = useState("");
  const [submission, setSubmission] = useState<{ status: "idle" | "submitting" | "success" | "error"; message: string; requestId?: string }>({ status: "idle", message: "Ready when you are." });
  const [isMountReady, setIsMountReady] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");

  useEffect(() => {
    setIsMountReady(true);
    setIdempotencyKey(getDraftKey());
  }, []);

  useEffect(() => {
    if (!isMountReady) return;
    const provider = new BrowserGpsProvider();
    setLocation((current) => ({ ...current, status: current.status === "manual" ? "manual" : "loading", message: "Detecting your current location." }));
    provider
      .getCurrentLocation()
      .then((current) => {
        setLocation((currentState) =>
          currentState.status === "manual"
            ? currentState
            : {
                status: "ready",
                latitude: current.latitude.toFixed(6),
                longitude: current.longitude.toFixed(6),
                message: "Location detected successfully.",
                accuracy: current.accuracy
              }
        );
      })
      .catch((error) => {
        setLocation((currentState) =>
          currentState.status === "manual"
            ? currentState
            : {
                status: "error",
                latitude: currentState.latitude,
                longitude: currentState.longitude,
                message: error instanceof Error ? error.message : "Location unavailable. Enter coordinates manually."
              }
        );
      });
  }, [isMountReady]);

  const estimate = useMemo(() => {
    const litres = Number(quantityLitres);
    if (!Number.isFinite(litres) || litres <= 0) return null;
    return calculatePrice(litres, getEstimatedFuelPricePerLitre(fuelType));
  }, [fuelType, quantityLitres]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmission({ status: "submitting", message: "Submitting request..." });
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setSubmission({ status: "error", message: "Location is required before submission." });
      return;
    }
    const response = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactPhone,
        customerName: customerName || undefined,
        idempotencyKey: idempotencyKey || crypto.randomUUID(),
        fuelType,
        quantityLitres: Number(quantityLitres),
        latitude,
        longitude,
        priority,
        requestChannel: "WEB"
      })
    });
    const payload = (await response.json()) as { data?: { requestId?: string; storageMode?: string }; error?: { message?: string } };
    if (!response.ok || !payload.data?.requestId) {
      setSubmission({ status: "error", message: payload.error?.message ?? "We could not create the request." });
      return;
    }
    setSubmission({ status: "success", message: `Request ${payload.data.requestId} created successfully.`, requestId: payload.data.requestId });
  }

  return (
    <form className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_24px_80px_-44px_rgba(16,24,40,0.45)] backdrop-blur" onSubmit={handleSubmit}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fuel-500">Emergency Request</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Bring fuel to my location</h2>
        </div>
        <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">SLA-aware dispatch</div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Contact phone
          <input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-fuel-500 focus:bg-white" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="+91 98765 43210" autoComplete="tel" required />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Name
          <input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-fuel-500 focus:bg-white" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Optional" autoComplete="name" />
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Fuel type
          <select className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-fuel-500 focus:bg-white" value={fuelType} onChange={(event) => setFuelType(event.target.value as "PETROL" | "DIESEL")}>
            <option value="PETROL">Petrol</option>
            <option value="DIESEL">Diesel</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Quantity
          <input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-fuel-500 focus:bg-white" value={quantityLitres} onChange={(event) => setQuantityLitres(event.target.value)} type="number" min="1" max="20" step="0.5" required />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Priority
          <select className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-fuel-500 focus:bg-white" value={priority} onChange={(event) => setPriority(event.target.value as "NORMAL" | "HIGH")}>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Latitude
          <input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-fuel-500 focus:bg-white" value={location.latitude} onChange={(event) => setLocation((current) => ({ ...current, status: "manual", latitude: event.target.value, message: "Manual coordinates selected." }))} inputMode="decimal" placeholder="12.9716" required />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Longitude
          <input className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-fuel-500 focus:bg-white" value={location.longitude} onChange={(event) => setLocation((current) => ({ ...current, status: "manual", longitude: event.target.value, message: "Manual coordinates selected." }))} inputMode="decimal" placeholder="77.5946" required />
        </label>
        <button type="button" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100" onClick={() => setLocation((current) => ({ ...current, status: "manual", message: "Manual location entry enabled. Paste coordinates." }))}>
          Enter manually
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {location.message}
        {location.status === "ready" && typeof location.accuracy === "number" ? ` Accuracy: ${location.accuracy.toFixed(0)}m.` : null}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Estimated price</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{estimate ? `₹${estimate.total.toFixed(2)}` : "Enter quantity"}</p>
          <p className="mt-1 text-sm text-slate-600">{estimate ? `Fuel ${estimate.fuelSubtotal.toFixed(2)} + delivery ${estimate.deliveryFee.toFixed(2)} + emergency ${estimate.emergencyFee.toFixed(2)}` : "The quote updates as you edit quantity and fuel type."}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Safety note</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Keep the engine off, avoid open flames, and follow crew instructions while the delivery is in progress.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-fuel-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-fuel-600 disabled:cursor-not-allowed disabled:opacity-60" disabled={submission.status === "submitting" || !idempotencyKey}>
          {submission.status === "submitting" ? "Submitting..." : "Confirm request"}
        </button>
        <p className="text-sm text-slate-600">{submission.message}</p>
      </div>

      {submission.status === "success" ? (
        <div className="mt-4 grid gap-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Request ID: <span className="font-semibold">{submission.requestId}</span>
            <div className="mt-1 text-emerald-800">We will search for the best partner, not just the nearest one.</div>
          </div>
          {submission.requestId ? <RequestTracker requestId={submission.requestId} contactPhone={contactPhone} /> : null}
        </div>
      ) : null}

      <input type="hidden" value={idempotencyKey} readOnly />
    </form>
  );
}
