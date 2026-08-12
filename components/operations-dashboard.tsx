"use client";

import { useEffect, useMemo, useState } from "react";

type RequestRecord = {
  requestId: string;
  status: string;
  fuelType: "PETROL" | "DIESEL";
  quantityLitres: number;
  priority: "NORMAL" | "HIGH";
  assignedPartnerId: string | null;
  assignedPartnerName: string | null;
  assignedPartnerScore: number | null;
  assignedPartnerEtaMinutes: number | null;
  contactPhone: string;
  createdAt: string;
  updatedAt: string;
};

export function OperationsDashboard() {
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [status, setStatus] = useState({ kind: "idle" as "idle" | "loading" | "success" | "error", message: "Ready to load operations queue." });

  async function refresh() {
    setStatus({ kind: "loading", message: "Loading request queue..." });
    try {
      const response = await fetch("/api/operations/requests", { cache: "no-store" });
      const payload = (await response.json()) as { data?: { requests?: RequestRecord[] }; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Unable to load operations queue");
      setRequests(payload.data?.requests ?? []);
      setStatus({ kind: "success", message: "Operations queue loaded." });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Unable to load operations queue" });
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const metrics = useMemo(() => {
    const active = requests.filter((request) => ["SEARCHING", "ASSIGNED", "PARTNER_ACCEPTED", "DISPATCHED", "EN_ROUTE", "ARRIVED", "DELIVERING", "OTP_PENDING"].includes(request.status));
    const completed = requests.filter((request) => request.status === "COMPLETED");
    const failed = requests.filter((request) => ["FAILED", "EXPIRED", "CANCELLED"].includes(request.status));
    return {
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      assigned: requests.filter((request) => request.status === "ASSIGNED").length
    };
  }, [requests]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_28px_80px_-56px_rgba(15,23,42,0.7)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fuel-500">Operations</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Command center queue</h1>
          <p className="mt-1 text-sm text-slate-600">A lightweight operations surface backed by the same request store and lifecycle rules.</p>
        </div>
        <button
          type="button"
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          onClick={() => void refresh()}
        >
          Refresh
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">Active</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{metrics.active}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">Assigned</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{metrics.assigned}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">Completed</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{metrics.completed}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-600">Failed / Cancelled</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{metrics.failed}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">Queue status</p>
        <p className="mt-2 text-sm text-slate-600">{status.message}</p>
      </div>

      <div className="mt-5 grid gap-3">
        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">No requests yet. Customer submissions will appear here.</div>
        ) : (
          requests.map((request) => (
            <article key={request.requestId} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{request.requestId}</p>
                  <h2 className="mt-1 text-base font-semibold text-slate-950">
                    {request.fuelType} · {request.quantityLitres}L · {request.priority}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Status {request.status} · Partner {request.assignedPartnerName ?? "unassigned"} · ETA {request.assignedPartnerEtaMinutes ?? 0} min
                  </p>
                </div>
                <div className="text-sm text-slate-600">
                  <div>Customer phone: {request.contactPhone}</div>
                  <div>Updated: {new Date(request.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
