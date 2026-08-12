"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

type PartnerRequest = {
  requestId: string;
  status: string;
  fuelType: "PETROL" | "DIESEL";
  quantityLitres: number;
  assignedPartnerName: string | null;
  assignedPartnerScore: number | null;
  assignedPartnerEtaMinutes: number | null;
  customerLocation: { latitude: number; longitude: number };
  createdAt: string;
  updatedAt: string;
};

type LoadState = { status: "idle" | "loading" | "success" | "error"; message: string };
type ActionState = { status: "idle" | "submitting" | "success" | "error"; message: string };

export function PartnerDashboard({ partnerId, partnerName }: { partnerId: string; partnerName: string }) {
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle", message: "Ready to fetch assigned jobs." });
  const [actionState, setActionState] = useState<ActionState>({ status: "idle", message: "" });
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    setLoadState({ status: "loading", message: "Loading assigned requests..." });
    try {
      const response = await fetch(`/api/partners/${partnerId}/requests`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: { requests?: PartnerRequest[] }; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Unable to load partner requests");
      setRequests(payload.data?.requests ?? []);
      setLoadState({ status: "success", message: "Assigned requests loaded." });
    } catch (error) {
      setLoadState({ status: "error", message: error instanceof Error ? error.message : "Unable to load assigned requests" });
    }
  }

  useEffect(() => {
    void refresh();
  }, [partnerId]);

  const selectedRequest = useMemo(() => requests.find((request) => request.requestId === selectedRequestId) ?? null, [requests, selectedRequestId]);

  async function sendPartnerAction(path: "accept" | "reject") {
    if (!selectedRequestId) {
      setActionState({ status: "error", message: "Select a request first." });
      return;
    }
    const current = requests.find((request) => request.requestId === selectedRequestId);
    if (!current) {
      setActionState({ status: "error", message: "Selected request is no longer available." });
      return;
    }

    setActionState({ status: "submitting", message: path === "accept" ? "Accepting request..." : "Releasing request..." });
    const response = await fetch(`/api/requests/${selectedRequestId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId,
        partnerName,
        reason: path === "reject" ? "Partner released request from dashboard" : undefined
      })
    });
    const payload = (await response.json()) as { data?: { status?: string }; error?: { message?: string } };
    if (!response.ok) {
      setActionState({ status: "error", message: payload.error?.message ?? "Action failed" });
      return;
    }
    setActionState({ status: "success", message: path === "accept" ? "Request accepted." : "Request released back to search." });
    await refresh();
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_28px_80px_-56px_rgba(15,23,42,0.7)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fuel-500">Fuel Partner</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{partnerName}</h1>
          <p className="mt-1 text-sm text-slate-600">Assigned request queue for the current partner session.</p>
        </div>
        <button
          type="button"
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          onClick={() => void refresh()}
          disabled={loadState.status === "loading" || isPending}
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Status</p>
          <p className="mt-2 text-sm text-slate-600">{loadState.message}</p>
          <p className="mt-2 text-sm text-slate-600">{actionState.message}</p>
          <div className="mt-4 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">{requests.length}</span> assigned requests
          </div>
        </div>

        <div className="grid gap-4">
          {requests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
              No assigned requests yet. We’ll show new jobs here as soon as dispatch assigns them.
            </div>
          ) : (
            requests.map((request) => (
              <button
                key={request.requestId}
                type="button"
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedRequestId === request.requestId ? "border-fuel-500 bg-orange-50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                onClick={() => setSelectedRequestId(request.requestId)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{request.requestId}</p>
                    <p className="mt-1 text-base font-semibold text-slate-950">
                      {request.fuelType} · {request.quantityLitres}L
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      ETA {request.assignedPartnerEtaMinutes ?? 0} min · score {request.assignedPartnerScore?.toFixed(3) ?? "n/a"}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{request.status}</span>
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  Location: {request.customerLocation.latitude.toFixed(5)}, {request.customerLocation.longitude.toFixed(5)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedRequest ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Selected request</p>
          <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
            <div>Fuel: {selectedRequest.fuelType}</div>
            <div>Quantity: {selectedRequest.quantityLitres}L</div>
            <div>Status: {selectedRequest.status}</div>
            <div>Assigned partner: {selectedRequest.assignedPartnerName ?? partnerName}</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-2xl bg-fuel-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-fuel-600 disabled:opacity-60"
              onClick={() => startTransition(() => void sendPartnerAction("accept"))}
              disabled={actionState.status === "submitting" || !selectedRequest}
            >
              Accept request
            </button>
            <button
              type="button"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
              onClick={() => startTransition(() => void sendPartnerAction("reject"))}
              disabled={actionState.status === "submitting" || !selectedRequest}
            >
              Reject request
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
