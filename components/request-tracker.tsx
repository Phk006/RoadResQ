"use client";

import { useEffect, useState } from "react";

type RequestSnapshot = {
  requestId: string;
  status: string;
  fuelType: "PETROL" | "DIESEL";
  quantityLitres: number;
  assignedPartnerId: string | null;
  assignedPartnerName: string | null;
  assignedPartnerScore: number | null;
  assignedPartnerEtaMinutes: number | null;
  assignedAt: string | null;
  estimatedTotal: number;
  currency: "INR";
  createdAt: string;
  updatedAt: string;
};

type TrackerState =
  | { status: "idle" | "loading"; message: string; snapshot?: RequestSnapshot }
  | { status: "success"; message: string; snapshot: RequestSnapshot }
  | { status: "error"; message: string; snapshot?: RequestSnapshot };

function isTerminal(status: string) {
  return ["COMPLETED", "CANCELLED", "FAILED", "EXPIRED"].includes(status);
}

export function RequestTracker({ requestId, contactPhone }: { requestId: string; contactPhone: string }) {
  const [tracker, setTracker] = useState<TrackerState>({ status: "idle", message: "Waiting to load request status." });

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    async function loadSnapshot() {
      setTracker((current) => ({ status: "loading", message: current.message, snapshot: "snapshot" in current ? current.snapshot : undefined }));
      try {
        const response = await fetch(`/api/requests/${requestId}?contactPhone=${encodeURIComponent(contactPhone)}`, { cache: "no-store" });
        const payload = (await response.json()) as { data?: RequestSnapshot; error?: { message?: string } };
        if (!response.ok || !payload.data) {
          throw new Error(payload.error?.message ?? "Unable to load request status");
        }
        if (cancelled) return;
        setTracker({
          status: "success",
          message: isTerminal(payload.data.status) ? "Request reached a terminal state." : "Tracking request live.",
          snapshot: payload.data
        });
        if (intervalId && isTerminal(payload.data.status)) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
      } catch (error) {
        if (cancelled) return;
        setTracker({
          status: "error",
          message: error instanceof Error ? error.message : "Unable to load request status"
        });
      }
    }

    void loadSnapshot();
    intervalId = window.setInterval(() => {
      void loadSnapshot();
    }, 5000);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [requestId, contactPhone]);

  const snapshot = tracker.snapshot;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-44px_rgba(16,24,40,0.25)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fuel-500">Live tracking</p>
      <h3 className="mt-2 text-xl font-semibold text-slate-950">Request {requestId}</h3>
      <p className="mt-1 text-sm text-slate-600">{tracker.message}</p>

      {snapshot ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Status</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{snapshot.status}</p>
            <p className="mt-1 text-sm text-slate-600">
              {snapshot.fuelType} · {snapshot.quantityLitres}L · ₹{snapshot.estimatedTotal.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Assignment</p>
            <p className="mt-2 text-base font-semibold text-slate-950">{snapshot.assignedPartnerName ?? "Searching for partner..."}</p>
            <p className="mt-1 text-sm text-slate-600">
              ETA {snapshot.assignedPartnerEtaMinutes ?? 0} min · score {snapshot.assignedPartnerScore?.toFixed(3) ?? "n/a"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <p className="text-sm font-semibold text-slate-800">Timeline</p>
            <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
              <div>Created {new Date(snapshot.createdAt).toLocaleString()}</div>
              <div>Updated {new Date(snapshot.updatedAt).toLocaleString()}</div>
              <div>Assigned {snapshot.assignedAt ? new Date(snapshot.assignedAt).toLocaleString() : "Not yet assigned"}</div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
