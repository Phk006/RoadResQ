import { env } from "@/lib/env";
import { scoreCandidate, type DispatchCandidate, type DispatchWeights } from "@/lib/dispatch/scoring";
import { canTransition, transition, type RequestStatus } from "@/lib/dispatch/state-machine";
import type { FuelType } from "@/lib/domain";

export type PartnerCandidate = {
  partnerId: string;
  partnerName: string;
  distanceKm: number;
  etaMinutes: number;
  fuelAvailabilityRatio: number;
  deliveryCapacityRatio: number;
  reliability: number;
  workloadRatio: number;
  serviceRadiusKm: number;
  operating: boolean;
  fuelTypes: FuelType[];
  availableLitres: number;
  isDeliveryAgentAvailable: boolean;
};

export type DispatchRequestInput = {
  requestId: string;
  fuelType: FuelType;
  quantityLitres: number;
  priority: "NORMAL" | "HIGH";
  latitude: number;
  longitude: number;
  currentStatus: RequestStatus;
};

export type DispatchDecision = {
  requestId: string;
  partnerId: string;
  partnerName: string;
  score: number;
  nextStatus: RequestStatus;
  evaluatedCandidates: Array<{ partnerId: string; partnerName: string; score: number }>;
  rejectionReason?: string;
};

export type DispatchSearchResult = {
  candidates: PartnerCandidate[];
  decision: DispatchDecision | null;
};

function normalize(value: number, max: number) {
  return 1 - Math.min(Math.max(value, 0) / max, 1);
}

export function buildDispatchWeights(): DispatchWeights {
  return {
    eta: env.DISPATCH_ETA_WEIGHT,
    distance: env.DISPATCH_DISTANCE_WEIGHT,
    availability: env.DISPATCH_AVAILABILITY_WEIGHT,
    capacity: env.DISPATCH_CAPACITY_WEIGHT,
    reliability: env.DISPATCH_RELIABILITY_WEIGHT,
    workload: env.DISPATCH_WORKLOAD_WEIGHT
  };
}

export function deriveCandidateMetrics(candidate: PartnerCandidate): DispatchCandidate {
  return {
    etaMinutes: candidate.etaMinutes,
    distanceKm: candidate.distanceKm,
    fuelAvailabilityRatio: candidate.fuelAvailabilityRatio,
    deliveryCapacityRatio: candidate.deliveryCapacityRatio,
    reliability: candidate.reliability,
    workloadRatio: candidate.workloadRatio
  };
}

export function rankCandidates(request: DispatchRequestInput, candidates: PartnerCandidate[]) {
  const weights = buildDispatchWeights();
  const viableCandidates = candidates
    .filter((candidate) => candidate.operating)
    .filter((candidate) => candidate.isDeliveryAgentAvailable)
    .filter((candidate) => candidate.fuelTypes.includes(request.fuelType))
    .filter((candidate) => candidate.distanceKm <= candidate.serviceRadiusKm)
    .filter((candidate) => candidate.availableLitres >= request.quantityLitres)
    .map((candidate) => {
      const metrics = deriveCandidateMetrics(candidate);
      const priorityBoost = request.priority === "HIGH" ? env.DISPATCH_HIGH_PRIORITY_BOOST : 0;
      const score = scoreCandidate(metrics, weights) + priorityBoost + normalize(candidate.distanceKm, 50) * 0.02;
      return { candidate, score };
    })
    .sort((left, right) => right.score - left.score);

  return viableCandidates;
}

export function selectDispatchDecision(request: DispatchRequestInput, candidates: PartnerCandidate[]): DispatchSearchResult {
  const ranked = rankCandidates(request, candidates);
  if (ranked.length === 0) {
    return { candidates, decision: null };
  }

  const selected = ranked[0];
  return {
    candidates,
    decision: {
      requestId: request.requestId,
      partnerId: selected.candidate.partnerId,
      partnerName: selected.candidate.partnerName,
      score: selected.score,
      nextStatus: transition(request.currentStatus, "ASSIGNED"),
      evaluatedCandidates: ranked.map(({ candidate, score }) => ({ partnerId: candidate.partnerId, partnerName: candidate.partnerName, score })),
      rejectionReason: undefined
    }
  };
}

export function canAdvanceToAssigned(currentStatus: RequestStatus) {
  return canTransition(currentStatus, "ASSIGNED");
}
