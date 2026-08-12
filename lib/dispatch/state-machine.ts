import type { Role } from "@/lib/domain";

export const requestStatuses = ["CREATED", "SEARCHING", "ASSIGNED", "PARTNER_ACCEPTED", "DISPATCHED", "EN_ROUTE", "ARRIVED", "DELIVERING", "OTP_PENDING", "COMPLETED", "CANCELLED", "FAILED", "EXPIRED"] as const;
export type RequestStatus = (typeof requestStatuses)[number];

const transitions: Record<RequestStatus, readonly RequestStatus[]> = {
  CREATED: ["SEARCHING", "CANCELLED"], SEARCHING: ["ASSIGNED", "FAILED", "EXPIRED", "CANCELLED"],
  ASSIGNED: ["PARTNER_ACCEPTED", "SEARCHING", "FAILED", "CANCELLED"], PARTNER_ACCEPTED: ["DISPATCHED", "FAILED", "CANCELLED"],
  DISPATCHED: ["EN_ROUTE", "FAILED", "CANCELLED"], EN_ROUTE: ["ARRIVED", "FAILED", "CANCELLED"],
  ARRIVED: ["DELIVERING", "FAILED", "CANCELLED"], DELIVERING: ["OTP_PENDING", "FAILED"], OTP_PENDING: ["COMPLETED", "FAILED"],
  COMPLETED: [], CANCELLED: [], FAILED: [], EXPIRED: []
};

export function canTransition(from: RequestStatus, to: RequestStatus) { return transitions[from].includes(to); }
export function transition(from: RequestStatus, to: RequestStatus, actorRole?: Role) {
  if (!canTransition(from, to)) throw new Error(`Invalid request transition: ${from} -> ${to}`);
  if (to === "COMPLETED" && actorRole !== "DELIVERY_AGENT" && actorRole !== "OPERATIONS_ADMIN" && actorRole !== "SUPER_ADMIN") throw new Error("Only an agent or operations user can complete delivery");
  return to;
}
